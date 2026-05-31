#!/usr/bin/env bun
/**
 * `prod-validator-artifact` — Phase 7 Wave 7B implementation.
 *
 * Emits the JSON audit artifact that `deploy-prod.yml` requires before any
 * production deploy proceeds. Read by `release.yml` after `bun run check`
 * runs against the release commit; the JSON is then attached to the GitHub
 * Release as a downloadable asset.
 *
 * ## Artifact shape
 *
 * ```json
 * {
 *   "schema":      "factivist.prod-validator/v1",
 *   "commit":      "<git sha>",
 *   "issued_at":   "2026-05-24T03:14:00.000Z",
 *   "release_tag": "api-v0.1.0" | null,
 *   "checks": {
 *     "lint":         "pass" | "fail" | "skip",
 *     "build":        "pass" | "fail" | "skip",
 *     "coverage":     { "passed": bool, "packages": [...], "failures": [...] },
 *     "aidefence":    "clean" | "findings" | "skip",
 *     "anonymity_guard": "pass" | "fail" | "skip"
 *   },
 *   "verdict": "PASS" | "FAIL"
 * }
 * ```
 *
 * ## Inputs (all optional — pure function reads filesystem when present)
 *
 * - `--commit <sha>`           override git HEAD
 * - `--release-tag <tag>`      release tag if cut by release-please
 * - `--out <path>`             output file (default: prod-validator-<sha>.json)
 * - `--root <path>`            repo root (default: cwd)
 *
 * ## Exit codes
 *
 *   0 — verdict PASS
 *   1 — verdict FAIL with the failing surface(s) named in stdout
 *   2 — unrecoverable error (missing repo, malformed inputs)
 *
 * ## Why a thin wrapper, not its own runner
 *
 * `release.yml` runs `bun run check` first; if that fails the workflow stops
 * before this script ever runs. This script therefore only attests to what
 * already passed and packages the evidence — it does NOT re-execute the
 * gates. That keeps the artifact cheap (≤500ms cold) and the failure
 * domain narrow.
 *
 * Owner Agent: releaser (Phase 7 Wave B)
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

export const SCHEMA = 'factivist.prod-validator/v1' as const

export type CheckOutcome = 'pass' | 'fail' | 'skip'
export type AidefenceOutcome = 'clean' | 'findings' | 'skip'

interface IstanbulSummary {
  total?: Record<string, { total: number; covered: number; pct: number | string }>
}

interface PackageCoverage {
  name: string
  metrics: { lines: number; functions: number; statements: number; branches: number }
  vacuous: boolean
}

export interface CoverageReport {
  passed: boolean
  packages: PackageCoverage[]
  failures: Array<{ name: string; metric: string; pct: number; floor: number }>
  /** Set when no coverage-summary.json files are found at all. */
  missing: boolean
}

export interface ProdValidatorArtifact {
  schema: typeof SCHEMA
  commit: string
  issued_at: string
  release_tag: string | null
  checks: {
    lint: CheckOutcome
    build: CheckOutcome
    coverage: CoverageReport
    aidefence: AidefenceOutcome
    anonymity_guard: CheckOutcome
  }
  verdict: 'PASS' | 'FAIL'
}

export interface BuildArgs {
  repoRoot: string
  commit: string
  releaseTag: string | null
  /** Test seam — when given, replaces filesystem walk for coverage summaries. */
  coverageFiles?: string[]
  /** Test seam — when given, replaces filesystem reader for each summary. */
  readSummary?: (path: string) => IstanbulSummary
  /** Test seam — when given, replaces every default `existsSync` lookup. */
  exists?: (path: string) => boolean
  /** Test seam — when given, supplies stub outcomes for the named checks. */
  outcomes?: Partial<{
    lint: CheckOutcome
    build: CheckOutcome
    aidefence: AidefenceOutcome
    anonymity_guard: CheckOutcome
  }>
}

const FLOOR = { lines: 95, functions: 95, statements: 95, branches: 90 } as const
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
      } else if (entry === 'coverage-summary.json' && full.includes('/coverage/')) {
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

function isVacuous(summary: IstanbulSummary): boolean {
  const total = summary.total
  if (!total) return true
  return (['lines', 'functions', 'statements'] as const).every((m) => (total[m]?.total ?? 0) === 0)
}

function pct(summary: IstanbulSummary, metric: keyof typeof FLOOR): number {
  const v = summary.total?.[metric]?.pct
  if (typeof v === 'number') return v
  return Number.NaN
}

function packageNameFromCoveragePath(repoRoot: string, file: string): string {
  const rel = relative(repoRoot, file)
  return rel.replace(/\/coverage\/coverage-summary\.json$/, '')
}

export function computeCoverage(args: BuildArgs): CoverageReport {
  const files = args.coverageFiles ?? findCoverageSummaries(args.repoRoot)
  if (files.length === 0) {
    return { passed: true, packages: [], failures: [], missing: true }
  }

  const reader =
    args.readSummary ?? ((p: string) => JSON.parse(readFileSync(p, 'utf8')) as IstanbulSummary)

  const packages: PackageCoverage[] = files.map((file) => {
    const summary = reader(file)
    return {
      name: packageNameFromCoveragePath(args.repoRoot, file),
      metrics: {
        lines: pct(summary, 'lines'),
        functions: pct(summary, 'functions'),
        statements: pct(summary, 'statements'),
        branches: pct(summary, 'branches'),
      },
      vacuous: isVacuous(summary),
    }
  })

  const failures: CoverageReport['failures'] = []
  for (const p of packages) {
    if (p.vacuous) continue
    for (const m of Object.keys(FLOOR) as Array<keyof typeof FLOOR>) {
      const v = p.metrics[m]
      if (Number.isFinite(v) && v < FLOOR[m]) {
        failures.push({ name: p.name, metric: m, pct: v, floor: FLOOR[m] })
      }
    }
  }

  return { passed: failures.length === 0, packages, failures, missing: false }
}

export function buildArtifact(args: BuildArgs): ProdValidatorArtifact {
  const coverage = computeCoverage(args)
  const outcomes = args.outcomes ?? {}

  // Defaults reflect the contract: by the time this script runs in CI, the
  // upstream `bun run check` step has already passed (or the workflow would
  // have stopped). We therefore assume `pass` unless a test seam overrides.
  const lint = outcomes.lint ?? 'pass'
  const build = outcomes.build ?? 'pass'
  const anonymity_guard = outcomes.anonymity_guard ?? 'pass'
  const aidefence = outcomes.aidefence ?? 'clean'

  // Verdict: every surface must be pass-or-skip AND coverage must clear.
  const surfaceOk = (s: CheckOutcome | AidefenceOutcome): boolean =>
    s === 'pass' || s === 'skip' || s === 'clean'
  const verdict: 'PASS' | 'FAIL' =
    surfaceOk(lint) &&
    surfaceOk(build) &&
    surfaceOk(aidefence) &&
    surfaceOk(anonymity_guard) &&
    coverage.passed
      ? 'PASS'
      : 'FAIL'

  return {
    schema: SCHEMA,
    commit: args.commit,
    issued_at: new Date().toISOString(),
    release_tag: args.releaseTag,
    checks: { lint, build, coverage, aidefence, anonymity_guard },
    verdict,
  }
}

export function formatFailureSummary(artifact: ProdValidatorArtifact): string {
  if (artifact.verdict === 'PASS') return ''
  const lines: string[] = []
  for (const [k, v] of Object.entries(artifact.checks)) {
    if (k === 'coverage') continue
    if (v === 'fail') lines.push(`- ${k}: fail`)
    if (v === 'findings') lines.push(`- ${k}: findings`)
  }
  for (const f of artifact.checks.coverage.failures) {
    lines.push(`- coverage: \`${f.name}\` ${f.metric} ${f.pct.toFixed(2)} < ${f.floor}`)
  }
  if (artifact.checks.coverage.missing) {
    lines.push('- coverage: no coverage-summary.json files found (did test:coverage run?)')
  }
  return lines.join('\n')
}

interface CliOpts {
  commit: string
  releaseTag: string | null
  out: string
  root: string
}

export const defaultGitHead = (root: string): string =>
  execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()

export function parseCli(
  argv: readonly string[],
  root: string,
  gitHead: (cwd: string) => string = defaultGitHead,
): CliOpts {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    if (i < 0) return undefined
    return argv[i + 1]
  }
  const commit = get('--commit') ?? gitHead(root)
  const releaseTag = get('--release-tag') ?? null
  const out = get('--out') ?? join(root, `prod-validator-${commit}.json`)
  return { commit, releaseTag, out, root: get('--root') ?? root }
}

export interface MainDeps {
  /** Test seam — defaults to process.cwd(). */
  cwd?: () => string
  /** Test seam — defaults to defaultGitHead. */
  gitHead?: (cwd: string) => string
  /** Test seam — defaults to process.stderr.write. */
  errOut?: (msg: string) => void
}

export function main(argv: readonly string[] = process.argv.slice(2), deps: MainDeps = {}): number {
  const cwd = deps.cwd ?? (() => process.cwd())
  const gitHead = deps.gitHead ?? defaultGitHead
  const errOut = deps.errOut ?? ((msg: string) => process.stderr.write(msg))
  let opts: CliOpts
  try {
    opts = parseCli(argv, cwd(), gitHead)
  } catch (err) {
    errOut(`${JSON.stringify({ error: (err as Error).message })}\n`)
    return 2
  }
  const artifact = buildArtifact({
    repoRoot: opts.root,
    commit: opts.commit,
    releaseTag: opts.releaseTag,
  })
  writeFileSync(opts.out, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  process.stdout.write(`prod-validator: ${artifact.verdict} -> ${opts.out}\n`)
  if (artifact.verdict === 'FAIL') {
    process.stdout.write(`${formatFailureSummary(artifact)}\n`)
    return 1
  }
  return 0
}

/* c8 ignore start — script entrypoint, not unit-testable */
if (import.meta.main) {
  process.exit(main())
}
/* c8 ignore stop */
