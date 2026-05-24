/**
 * scripts/a11y/run-axe-baseline.ts
 *
 * S1 Phase 3 deliverable — WCAG 2.2 AA axe-core baseline runner.
 *
 * Owned by: a11y-auditor
 * Spec: docs/design/s1/a11y-baseline.md
 *
 * Behaviour:
 *   1. Reads config at scripts/a11y/a11y-baseline.json (overridable via --config).
 *   2. For each surface, drives Playwright + @axe-core/playwright against the URL.
 *   3. Writes a JSON report per surface to <outDir>/<surface-id>.json.
 *   4. Diffs each surface's run against the matching snapshot in
 *      <snapshotDir>/<surface-id>.json. New (un-snapshotted) violations of
 *      any severity in `failOn` (default: serious + critical) AND any new
 *      `moderate` violations cause a non-zero exit.
 *   5. With --update-baseline, writes the current run as the new snapshot
 *      and exits 0 unconditionally.
 *
 * Intentionally stdlib-only at module load: the heavy deps (`playwright`,
 * `@axe-core/playwright`) are dynamically `import()`-ed inside `runAxe()` so
 * the unit test suite can run without them installed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { cwd, exit } from 'node:process'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AxeSeverity = 'minor' | 'moderate' | 'serious' | 'critical'

export interface AxeNodeResult {
  html: string
  target: readonly string[]
  failureSummary?: string
}

export interface AxeViolation {
  id: string
  impact: AxeSeverity | null
  description: string
  help: string
  helpUrl: string
  tags: readonly string[]
  nodes: readonly AxeNodeResult[]
}

export interface AxeRunResult {
  url: string
  timestamp: string
  violations: readonly AxeViolation[]
  incomplete: readonly AxeViolation[]
  // We don't snapshot `passes` — too noisy and not gating.
}

export interface SurfaceConfig {
  id: string
  title: string
  url: string
  mustPass: readonly string[]
  disabled: readonly {
    ruleId: string
    appliesToUrl?: string
    reason: string
  }[]
}

export interface BaselineConfig {
  wcagLevel: 'A' | 'AA' | 'AAA'
  wcagVersion: string
  failOn: readonly AxeSeverity[]
  snapshotDir: string
  outDir: string
  viewport: { width: number; height: number }
  axeRunOptions: Record<string, unknown>
  surfaces: readonly SurfaceConfig[]
}

export interface CliArgs {
  config: string
  updateBaseline: boolean
  only?: string
  help: boolean
}

export interface SurfaceVerdict {
  surfaceId: string
  url: string
  newViolations: readonly AxeViolation[]
  snapshottedViolations: readonly AxeViolation[]
  passed: boolean
}

export interface RunDeps {
  /**
   * Axe runner — abstracted so tests can mock it. The real implementation
   * uses Playwright + @axe-core/playwright; the test passes a stub.
   */
  runAxe: (surface: SurfaceConfig, config: BaselineConfig) => Promise<AxeRunResult>
  readFile?: (path: string) => string
  writeFile?: (path: string, contents: string) => void
  fileExists?: (path: string) => boolean
  mkdir?: (path: string) => void
  log?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
}

// ─── CLI ────────────────────────────────────────────────────────────────────

export function parseArgs(argv: readonly string[]): CliArgs {
  const out: CliArgs = {
    config: 'scripts/a11y/a11y-baseline.json',
    updateBaseline: false,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--update-baseline') {
      out.updateBaseline = true
    } else if (arg === '--help' || arg === '-h') {
      out.help = true
    } else if (arg === '--config') {
      const next = argv[i + 1]
      if (!next) throw new Error('--config requires a path')
      out.config = next
      i++
    } else if (arg.startsWith('--config=')) {
      out.config = arg.slice('--config='.length)
    } else if (arg === '--only') {
      const next = argv[i + 1]
      if (!next) throw new Error('--only requires a surface id')
      out.only = next
      i++
    } else if (arg.startsWith('--only=')) {
      out.only = arg.slice('--only='.length)
    }
  }
  return out
}

export const HELP_TEXT = `
Usage: bun run scripts/a11y/run-axe-baseline.ts [options]

Runs the S1 a11y baseline (WCAG 2.2 AA) against every surface in the config.

Options:
  --config <path>        Path to baseline config (default: scripts/a11y/a11y-baseline.json)
  --only <surface-id>    Run only one surface (e.g. --only 02-composer)
  --update-baseline      Write the current run as the new snapshot and exit 0.
  -h, --help             Show this help.

Exit codes:
   0  All surfaces passed (no new serious/critical/moderate violations).
   1  One or more surfaces have new violations exceeding the gate.
   2  Configuration error or unrecoverable runtime error.
`.trim()

// ─── Config loading ─────────────────────────────────────────────────────────

export function loadConfig(
  path: string,
  readFile: (p: string) => string = (p) => readFileSync(p, 'utf-8'),
): BaselineConfig {
  const raw = readFile(path)
  const parsed = JSON.parse(raw) as BaselineConfig
  validateConfig(parsed)
  return parsed
}

export function validateConfig(config: BaselineConfig): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object')
  }
  if (!Array.isArray(config.surfaces) || config.surfaces.length === 0) {
    throw new Error('Config must declare at least one surface')
  }
  if (!Array.isArray(config.failOn) || config.failOn.length === 0) {
    throw new Error('Config must declare at least one severity in failOn')
  }
  const validSeverities: readonly AxeSeverity[] = ['minor', 'moderate', 'serious', 'critical']
  for (const sev of config.failOn) {
    if (!validSeverities.includes(sev)) {
      throw new Error(`Invalid severity in failOn: ${sev}`)
    }
  }
  const ids = new Set<string>()
  for (const surface of config.surfaces) {
    if (!surface.id) throw new Error('Every surface must have an id')
    if (ids.has(surface.id)) throw new Error(`Duplicate surface id: ${surface.id}`)
    ids.add(surface.id)
    if (!surface.url) throw new Error(`Surface ${surface.id} must have a url`)
  }
}

// ─── Snapshot diff ──────────────────────────────────────────────────────────

/**
 * Stable "fingerprint" for a violation node — used to diff a new run against
 * the snapshot. We intentionally exclude `html` (changes with every minor
 * markup tweak) and key only on rule id + target selector list.
 */
export function fingerprintViolation(v: AxeViolation): readonly string[] {
  return v.nodes.map((n) => `${v.id}::${n.target.join(' >> ')}`).sort()
}

export function fingerprintAll(violations: readonly AxeViolation[]): Set<string> {
  const out = new Set<string>()
  for (const v of violations) for (const fp of fingerprintViolation(v)) out.add(fp)
  return out
}

export interface DiffResult {
  newViolations: readonly AxeViolation[]
  snapshottedViolations: readonly AxeViolation[]
}

export function diffAgainstSnapshot(
  current: readonly AxeViolation[],
  snapshot: readonly AxeViolation[] | null,
): DiffResult {
  if (!snapshot) {
    return { newViolations: current, snapshottedViolations: [] }
  }
  const snapshotFps = fingerprintAll(snapshot)
  const newViolations: AxeViolation[] = []
  const snapshotted: AxeViolation[] = []
  for (const v of current) {
    const fps = fingerprintViolation(v)
    const allInSnapshot = fps.every((fp) => snapshotFps.has(fp))
    if (allInSnapshot) snapshotted.push(v)
    else newViolations.push(v)
  }
  return { newViolations, snapshottedViolations: snapshotted }
}

// ─── Gating decision ────────────────────────────────────────────────────────

/**
 * Determines whether a surface's new violations cause the gate to fail.
 *
 * Gate rules (matches docs/design/s1/a11y-baseline.md "Snapshot baselines"):
 *   - Any new violation at a severity in `failOn` fails the gate.
 *   - New `moderate` violations also fail the gate (snapshot-only allowance).
 *   - `minor` violations are warnings, not failures.
 *   - Snapshotted violations of any severity are not failures.
 */
export function isGateFailing(
  newViolations: readonly AxeViolation[],
  failOn: readonly AxeSeverity[],
): boolean {
  const failSeverities = new Set<AxeSeverity | string>([...failOn, 'moderate'])
  for (const v of newViolations) {
    if (v.impact && failSeverities.has(v.impact)) return true
  }
  return false
}

// ─── Runner ─────────────────────────────────────────────────────────────────

export async function processSurface(
  surface: SurfaceConfig,
  config: BaselineConfig,
  deps: RunDeps,
): Promise<SurfaceVerdict> {
  const {
    runAxe,
    readFile = (p) => readFileSync(p, 'utf-8'),
    writeFile = (p, c) => writeFileSync(p, c, 'utf-8'),
    fileExists = (p) => existsSync(p),
    mkdir = (p) => mkdirSync(p, { recursive: true }),
    log = console.log,
  } = deps

  log(`[a11y] running ${surface.id} → ${surface.url}`)
  const result = await runAxe(surface, config)

  // Write the raw report.
  const outPath = resolve(config.outDir, `${surface.id}.json`)
  mkdir(dirname(outPath))
  writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`)

  // Load the snapshot if present.
  const snapshotPath = resolve(config.snapshotDir, `${surface.id}.json`)
  let snapshot: readonly AxeViolation[] | null = null
  if (fileExists(snapshotPath)) {
    try {
      const parsed = JSON.parse(readFile(snapshotPath)) as {
        violations?: readonly AxeViolation[]
      }
      snapshot = parsed.violations ?? []
    } catch {
      snapshot = []
    }
  }

  const { newViolations, snapshottedViolations } = diffAgainstSnapshot(result.violations, snapshot)
  const passed = !isGateFailing(newViolations, config.failOn)
  return {
    surfaceId: surface.id,
    url: surface.url,
    newViolations,
    snapshottedViolations,
    passed,
  }
}

export async function updateBaseline(
  surface: SurfaceConfig,
  config: BaselineConfig,
  deps: RunDeps,
): Promise<void> {
  const {
    runAxe,
    writeFile = (p, c) => writeFileSync(p, c, 'utf-8'),
    mkdir = (p) => mkdirSync(p, { recursive: true }),
    log = console.log,
  } = deps
  log(`[a11y] updating baseline for ${surface.id}`)
  const result = await runAxe(surface, config)
  const snapshotPath = resolve(config.snapshotDir, `${surface.id}.json`)
  mkdir(dirname(snapshotPath))
  writeFile(snapshotPath, `${JSON.stringify({ violations: result.violations }, null, 2)}\n`)
}

export interface RunSummary {
  ok: boolean
  verdicts: readonly SurfaceVerdict[]
}

export async function runAll(
  args: CliArgs,
  config: BaselineConfig,
  deps: RunDeps,
): Promise<RunSummary> {
  const surfaces = args.only ? config.surfaces.filter((s) => s.id === args.only) : config.surfaces

  if (args.only && surfaces.length === 0) {
    throw new Error(`No surface matches --only=${args.only}`)
  }

  if (args.updateBaseline) {
    for (const s of surfaces) await updateBaseline(s, config, deps)
    return { ok: true, verdicts: [] }
  }

  const verdicts: SurfaceVerdict[] = []
  for (const s of surfaces) {
    verdicts.push(await processSurface(s, config, deps))
  }
  const ok = verdicts.every((v) => v.passed)
  return { ok, verdicts }
}

// ─── Real axe runner (Playwright + @axe-core/playwright) ────────────────────

/* c8 ignore start — real runner exercised by Phase 7 CI, not unit tests */
export async function realAxeRunner(
  surface: SurfaceConfig,
  config: BaselineConfig,
): Promise<AxeRunResult> {
  // Heavy deps loaded lazily so the unit tests don't need them.
  const playwright = (await import('playwright').catch(() => null)) as {
    chromium: { launch: () => Promise<unknown> }
  } | null
  if (!playwright) {
    throw new Error(
      'playwright is not installed. Phase 7 wires this up; for now, install with `bun add -D playwright @axe-core/playwright` or invoke with --only to run a single surface.',
    )
  }
  const AxeBuilder = (await import('@axe-core/playwright').catch(() => null)) as {
    default: new (args: {
      page: unknown
    }) => {
      withTags: (tags: string[]) => unknown
      analyze: () => Promise<{
        violations: AxeViolation[]
        incomplete: AxeViolation[]
      }>
    }
  } | null
  if (!AxeBuilder) {
    throw new Error(
      '@axe-core/playwright is not installed. Phase 7 wires this up; install with `bun add -D @axe-core/playwright`.',
    )
  }

  const browser = (await playwright.chromium.launch()) as {
    newContext: (o: unknown) => Promise<{
      newPage: () => Promise<{
        goto: (u: string) => Promise<unknown>
        close: () => Promise<unknown>
      }>
      close: () => Promise<unknown>
    }>
    close: () => Promise<unknown>
  }
  const context = await browser.newContext({ viewport: config.viewport })
  const page = await context.newPage()
  await page.goto(surface.url)

  const tags = ((config.axeRunOptions?.runOnly as { values?: string[] })?.values ?? [
    'wcag2a',
    'wcag2aa',
    'wcag22aa',
  ]) as string[]
  const builder = new AxeBuilder.default({ page }).withTags(tags) as {
    disableRules: (ids: string[]) => unknown
    analyze: () => Promise<{ violations: AxeViolation[]; incomplete: AxeViolation[] }>
  }
  const disabledForThisUrl = surface.disabled
    .filter((d) => !d.appliesToUrl || d.appliesToUrl === surface.url)
    .map((d) => d.ruleId)
  if (disabledForThisUrl.length > 0) {
    builder.disableRules(disabledForThisUrl)
  }
  const result = await builder.analyze()
  await page.close()
  await context.close()
  await browser.close()

  return {
    url: surface.url,
    timestamp: new Date().toISOString(),
    violations: result.violations,
    incomplete: result.incomplete,
  }
}
/* c8 ignore stop */

// ─── Entry point ────────────────────────────────────────────────────────────

export function formatVerdict(v: SurfaceVerdict): string {
  if (v.passed) {
    const snap = v.snapshottedViolations.length
      ? ` (${v.snapshottedViolations.length} snapshotted)`
      : ''
    return `  ✓ ${v.surfaceId}${snap}`
  }
  const lines: string[] = [`  ✗ ${v.surfaceId} — ${v.newViolations.length} new violation(s)`]
  for (const nv of v.newViolations) {
    lines.push(
      `      • [${nv.impact ?? 'unknown'}] ${nv.id}: ${nv.help} (${nv.nodes.length} node${nv.nodes.length === 1 ? '' : 's'})`,
    )
  }
  return lines.join('\n')
}

export async function main(
  argv: readonly string[] = [],
  deps: RunDeps = { runAxe: realAxeRunner },
): Promise<number> {
  const log = deps.log ?? console.log
  const error = deps.error ?? console.error
  let args: CliArgs
  try {
    args = parseArgs(argv)
  } catch (err) {
    error((err as Error).message)
    error(HELP_TEXT)
    return 2
  }
  if (args.help) {
    log(HELP_TEXT)
    return 0
  }

  let config: BaselineConfig
  try {
    const configPath = resolve(cwd(), args.config)
    config = loadConfig(configPath, deps.readFile)
  } catch (err) {
    error(`[a11y] config error: ${(err as Error).message}`)
    return 2
  }

  try {
    const summary = await runAll(args, config, deps)
    if (args.updateBaseline) {
      log('[a11y] baselines updated')
      return 0
    }
    log('[a11y] results:')
    for (const v of summary.verdicts) log(formatVerdict(v))
    if (!summary.ok) {
      error('[a11y] gate FAILED — see new violations above')
      return 1
    }
    log('[a11y] gate passed')
    return 0
  } catch (err) {
    error(`[a11y] runtime error: ${(err as Error).message}`)
    return 2
  }
}

// CLI entry. Bun and Node both expose `import.meta.main` / equivalent — we
// use a defensive check so the file can also be imported by tests without
// auto-running.
/* c8 ignore start */
declare const Bun: { argv: string[] } | undefined
if (
  typeof Bun !== 'undefined' &&
  Array.isArray(Bun.argv) &&
  Bun.argv[1]?.endsWith('run-axe-baseline.ts')
) {
  void main(Bun.argv.slice(2)).then((code) => exit(code))
}
/* c8 ignore stop */
