import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { evaluate, main, renderMarkdown } from '../coverage-gate.ts'

interface PackageInput {
  name: string
  metrics: { lines: number; functions: number; statements: number; branches: number }
  vacuous?: boolean
}

const pkg = (input: PackageInput) => ({
  name: input.name,
  path: `${input.name}/coverage/coverage-summary.json`,
  metrics: input.metrics,
  vacuous: input.vacuous ?? false,
})

describe('evaluate', () => {
  it('passes when every metric is at or above the floor', () => {
    const result = evaluate([
      pkg({
        name: 'apps/web',
        metrics: { lines: 95, functions: 95, statements: 95, branches: 90 },
      }),
    ])
    expect(result.passed).toBe(true)
    expect(result.failures).toHaveLength(0)
  })

  it('fails when lines fall below 95', () => {
    const result = evaluate([
      pkg({
        name: 'apps/web',
        metrics: { lines: 94.99, functions: 95, statements: 95, branches: 90 },
      }),
    ])
    expect(result.passed).toBe(false)
    expect(result.failures).toEqual([{ name: 'apps/web', metric: 'lines', pct: 94.99, floor: 95 }])
  })

  it('fails when branches fall below 90', () => {
    const result = evaluate([
      pkg({
        name: 'apps/web',
        metrics: { lines: 99, functions: 99, statements: 99, branches: 89.99 },
      }),
    ])
    expect(result.passed).toBe(false)
    expect(result.failures[0]?.metric).toBe('branches')
  })

  it('skips vacuous packages (zero-of-zero coverage)', () => {
    const result = evaluate([
      pkg({
        name: 'packages/zkp-client',
        metrics: {
          lines: Number.NaN,
          functions: Number.NaN,
          statements: Number.NaN,
          branches: Number.NaN,
        },
        vacuous: true,
      }),
    ])
    expect(result.passed).toBe(true)
  })

  it('aggregates failures across multiple packages', () => {
    const result = evaluate([
      pkg({ name: 'a', metrics: { lines: 80, functions: 100, statements: 100, branches: 100 } }),
      pkg({ name: 'b', metrics: { lines: 100, functions: 80, statements: 100, branches: 100 } }),
      pkg({ name: 'c', metrics: { lines: 100, functions: 100, statements: 100, branches: 100 } }),
    ])
    expect(result.passed).toBe(false)
    expect(result.failures.map((f) => f.name).sort()).toEqual(['a', 'b'])
  })
})

describe('renderMarkdown', () => {
  it('lists every package with its metrics and a PASS status', () => {
    const md = renderMarkdown(
      evaluate([
        pkg({
          name: 'apps/web',
          metrics: { lines: 99.5, functions: 100, statements: 99.1, branches: 95.2 },
        }),
      ]),
    )
    expect(md).toContain('| `apps/web` |')
    expect(md).toContain('PASS')
    expect(md).toContain('All packages above floor.')
  })

  it('emits a Failures section when at least one package is below floor', () => {
    const md = renderMarkdown(
      evaluate([
        pkg({
          name: 'apps/web',
          metrics: { lines: 80, functions: 100, statements: 100, branches: 100 },
        }),
      ]),
    )
    expect(md).toContain('### Failures')
    expect(md).toContain('`apps/web` lines: 80.00 < 95')
  })

  it('marks vacuous packages as such instead of with numeric metrics', () => {
    const md = renderMarkdown(
      evaluate([
        pkg({
          name: 'packages/zkp-client',
          metrics: {
            lines: Number.NaN,
            functions: Number.NaN,
            statements: Number.NaN,
            branches: Number.NaN,
          },
          vacuous: true,
        }),
      ]),
    )
    expect(md).toContain('| `packages/zkp-client` | — | — | — | — | vacuous |')
  })
})

describe('main (integration with the filesystem)', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cov-gate-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const writeSummary = (
    rel: string,
    total: Record<string, { total: number; covered: number; pct: number | string }>,
  ) => {
    const dir = join(root, rel, 'coverage')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'coverage-summary.json'), JSON.stringify({ total }))
  }

  it('returns 0 and writes a passing report when all summaries clear the floor', () => {
    writeSummary('apps/web', {
      lines: { total: 100, covered: 99, pct: 99 },
      functions: { total: 100, covered: 100, pct: 100 },
      statements: { total: 100, covered: 99, pct: 99 },
      branches: { total: 100, covered: 95, pct: 95 },
    })
    const code = main(root)
    expect(code).toBe(0)
    const md = readFileSync(join(root, 'coverage-gate-report.md'), 'utf8')
    expect(md).toContain('PASS')
    expect(md).not.toContain('### Failures')
  })

  it('returns 1 and lists each failing metric when a package drops below floor', () => {
    writeSummary('apps/api', {
      lines: { total: 100, covered: 90, pct: 90 },
      functions: { total: 100, covered: 100, pct: 100 },
      statements: { total: 100, covered: 100, pct: 100 },
      branches: { total: 100, covered: 100, pct: 100 },
    })
    const code = main(root)
    expect(code).toBe(1)
    const md = readFileSync(join(root, 'coverage-gate-report.md'), 'utf8')
    expect(md).toContain('### Failures')
    expect(md).toContain('`apps/api` lines: 90.00 < 95')
  })

  it('treats zero-total summaries as vacuous and does not fail the gate', () => {
    writeSummary('packages/zkp-client', {
      lines: { total: 0, covered: 0, pct: 'Unknown' },
      functions: { total: 0, covered: 0, pct: 'Unknown' },
      statements: { total: 0, covered: 0, pct: 'Unknown' },
      branches: { total: 0, covered: 0, pct: 'Unknown' },
    })
    const code = main(root)
    expect(code).toBe(0)
    const md = readFileSync(join(root, 'coverage-gate-report.md'), 'utf8')
    expect(md).toContain('vacuous')
  })

  it('returns 0 with an empty report when no coverage-summary.json files exist', () => {
    const code = main(root)
    expect(code).toBe(0)
    const md = readFileSync(join(root, 'coverage-gate-report.md'), 'utf8')
    expect(md).toContain('All packages above floor.')
  })

  it('tolerates apps/ entries that are not readable directories', () => {
    // Walker walks `apps/`, `packages/`, `scripts/` at the root. Create a
    // file named `apps` (not a directory) so `readdirSync` throws — the
    // walker must swallow the error and continue with the other roots.
    writeFileSync(join(root, 'apps'), 'not a directory')
    // Put a valid summary under packages/ so the walker still finds something.
    writeSummary('packages/ok', {
      lines: { total: 100, covered: 100, pct: 100 },
      functions: { total: 100, covered: 100, pct: 100 },
      statements: { total: 100, covered: 100, pct: 100 },
      branches: { total: 100, covered: 100, pct: 100 },
    })
    const code = main(root)
    expect(code).toBe(0)
  })

  it('tolerates a coverage entry whose `statSync` throws (broken symlink)', () => {
    // Create a broken symlink inside the walker's path so `statSync(full)`
    // throws and the walker `continue`s past it.
    const dir = join(root, 'apps/web')
    mkdirSync(dir, { recursive: true })
    symlinkSync(join(root, 'does-not-exist'), join(dir, 'dangling'))
    writeSummary('apps/web', {
      lines: { total: 100, covered: 100, pct: 100 },
      functions: { total: 100, covered: 100, pct: 100 },
      statements: { total: 100, covered: 100, pct: 100 },
      branches: { total: 100, covered: 100, pct: 100 },
    })
    const code = main(root)
    expect(code).toBe(0)
  })
})
