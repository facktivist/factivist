#!/usr/bin/env bun
/**
 * `coverage-gate` — Phase 7 §7.3 row 5 implementation.
 *
 * Asserts the workspace coverage aggregate independently of the per-package
 * thresholds inside `tooling/vitest-config/base.ts`. Reads every
 * `coverage-summary.json` written by vitest-v8, computes per-package PCTs
 * against the floor (95L/95F/95S/90B), and writes a markdown report to
 * `coverage-gate-report.md` for the PR comment step.
 *
 * Exits 0 on pass, 1 on any below-floor metric.
 *
 * Owner Agent: ci-eng (Phase 7)
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const FLOOR = { lines: 95, functions: 95, statements: 95, branches: 90 } as const
type Metric = keyof typeof FLOOR

interface IstanbulSummary {
  total: Record<Metric, { total: number; covered: number; pct: number | string }>
}

interface PackageReport {
  name: string
  path: string
  metrics: Record<Metric, number>
  vacuous: boolean
}

const SEARCH_ROOTS = ['apps', 'packages', 'scripts']

function findCoverageSummaries(repoRoot: string): string[] {
  const results: string[] = []
  const visit = (dir: string, depth: number) => {
    if (depth > 4) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.turbo' || entry === '.next') continue
      const full = join(dir, entry)
      let stat: ReturnType<typeof statSync>
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        visit(full, depth + 1)
      } else if (entry === 'coverage-summary.json' && full.includes(`${'/coverage/'}`)) {
        results.push(full)
      }
    }
  }
  for (const root of SEARCH_ROOTS) {
    const abs = join(repoRoot, root)
    if (existsSync(abs)) visit(abs, 0)
  }
  return results.sort()
}

function packageNameFromCoveragePath(repoRoot: string, file: string): string {
  // .../apps/web/coverage/coverage-summary.json → apps/web
  const rel = relative(repoRoot, file)
  return rel.replace(/\/coverage\/coverage-summary\.json$/, '')
}

function pctOf(summary: IstanbulSummary, m: Metric): number {
  const v = summary.total?.[m]?.pct
  if (typeof v === 'number') return v
  return Number.NaN
}

function isVacuous(summary: IstanbulSummary): boolean {
  const total = summary.total
  if (!total) return true
  return (['lines', 'functions', 'statements'] as Metric[]).every(
    (m) => (total[m]?.total ?? 0) === 0,
  )
}

export interface GateResult {
  packages: PackageReport[]
  failures: Array<{ name: string; metric: Metric; pct: number; floor: number }>
  passed: boolean
}

export function evaluate(packages: PackageReport[]): GateResult {
  const failures: GateResult['failures'] = []
  for (const pkg of packages) {
    if (pkg.vacuous) continue
    for (const m of Object.keys(FLOOR) as Metric[]) {
      const pct = pkg.metrics[m]
      if (Number.isFinite(pct) && pct < FLOOR[m]) {
        failures.push({ name: pkg.name, metric: m, pct, floor: FLOOR[m] })
      }
    }
  }
  return { packages, failures, passed: failures.length === 0 }
}

export function renderMarkdown(result: GateResult): string {
  const lines: string[] = []
  lines.push('## Coverage gate')
  lines.push('')
  lines.push(
    `Floor: **${FLOOR.lines}L / ${FLOOR.functions}F / ${FLOOR.statements}S / ${FLOOR.branches}B**`,
  )
  lines.push('')
  lines.push('| Package | Lines | Funcs | Stmts | Branches | Status |')
  lines.push('|---|---:|---:|---:|---:|:-:|')
  for (const pkg of result.packages) {
    if (pkg.vacuous) {
      lines.push(`| \`${pkg.name}\` | — | — | — | — | vacuous |`)
      continue
    }
    const status = (['lines', 'functions', 'statements', 'branches'] as Metric[]).every(
      (m) => pkg.metrics[m] >= FLOOR[m],
    )
      ? 'PASS'
      : 'FAIL'
    const fmt = (m: Metric) => pkg.metrics[m].toFixed(2)
    lines.push(
      `| \`${pkg.name}\` | ${fmt('lines')} | ${fmt('functions')} | ${fmt('statements')} | ${fmt('branches')} | ${status} |`,
    )
  }
  lines.push('')
  if (result.failures.length > 0) {
    lines.push('### Failures')
    lines.push('')
    for (const f of result.failures) {
      lines.push(`* \`${f.name}\` ${f.metric}: ${f.pct.toFixed(2)} < ${f.floor}`)
    }
  } else {
    lines.push('All packages above floor.')
  }
  return `${lines.join('\n')}\n`
}

export function main(repoRoot: string = process.cwd()): number {
  const summaries = findCoverageSummaries(repoRoot)
  const packages: PackageReport[] = summaries.map((file) => {
    const raw = readFileSync(file, 'utf8')
    const summary = JSON.parse(raw) as IstanbulSummary
    return {
      name: packageNameFromCoveragePath(repoRoot, file),
      path: file,
      metrics: {
        lines: pctOf(summary, 'lines'),
        functions: pctOf(summary, 'functions'),
        statements: pctOf(summary, 'statements'),
        branches: pctOf(summary, 'branches'),
      },
      vacuous: isVacuous(summary),
    }
  })
  const result = evaluate(packages)
  const md = renderMarkdown(result)
  writeFileSync(join(repoRoot, 'coverage-gate-report.md'), md, 'utf8')
  process.stdout.write(md)
  return result.passed ? 0 : 1
}

if (import.meta.main) {
  process.exit(main())
}
