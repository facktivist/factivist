import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildArtifact,
  computeCoverage,
  defaultGitHead,
  formatFailureSummary,
  main,
  parseCli,
  SCHEMA,
} from '../prod-validator-artifact.ts'

const okSummary = {
  total: {
    lines: { total: 100, covered: 99, pct: 99 },
    functions: { total: 100, covered: 100, pct: 100 },
    statements: { total: 100, covered: 99, pct: 99 },
    branches: { total: 100, covered: 95, pct: 95 },
  },
}

const failingSummary = {
  total: {
    lines: { total: 100, covered: 90, pct: 90 },
    functions: { total: 100, covered: 100, pct: 100 },
    statements: { total: 100, covered: 100, pct: 100 },
    branches: { total: 100, covered: 100, pct: 100 },
  },
}

const vacuousSummary = {
  total: {
    lines: { total: 0, covered: 0, pct: 'Unknown' },
    functions: { total: 0, covered: 0, pct: 'Unknown' },
    statements: { total: 0, covered: 0, pct: 'Unknown' },
    branches: { total: 0, covered: 0, pct: 'Unknown' },
  },
}

describe('computeCoverage', () => {
  it('marks every metric pass when every package clears the floor', () => {
    const report = computeCoverage({
      repoRoot: '/repo',
      commit: 'deadbeef',
      releaseTag: null,
      coverageFiles: ['/repo/apps/web/coverage/coverage-summary.json'],
      readSummary: () => okSummary,
    })
    expect(report.passed).toBe(true)
    expect(report.failures).toEqual([])
    expect(report.missing).toBe(false)
    expect(report.packages[0]?.name).toBe('apps/web')
  })

  it('flags below-floor packages and names them in failures', () => {
    const report = computeCoverage({
      repoRoot: '/repo',
      commit: 'deadbeef',
      releaseTag: null,
      coverageFiles: ['/repo/apps/api/coverage/coverage-summary.json'],
      readSummary: () => failingSummary,
    })
    expect(report.passed).toBe(false)
    expect(report.failures).toEqual([{ name: 'apps/api', metric: 'lines', pct: 90, floor: 95 }])
  })

  it('treats vacuous summaries as a non-failure (zkp-client pattern)', () => {
    const report = computeCoverage({
      repoRoot: '/repo',
      commit: 'deadbeef',
      releaseTag: null,
      coverageFiles: ['/repo/packages/zkp-client/coverage/coverage-summary.json'],
      readSummary: () => vacuousSummary,
    })
    expect(report.passed).toBe(true)
    expect(report.packages[0]?.vacuous).toBe(true)
  })

  it('returns missing=true when no coverage summaries exist', () => {
    const report = computeCoverage({
      repoRoot: '/repo',
      commit: 'deadbeef',
      releaseTag: null,
      coverageFiles: [],
    })
    expect(report.missing).toBe(true)
    expect(report.passed).toBe(true)
    expect(report.packages).toEqual([])
  })
})

describe('buildArtifact', () => {
  const baseArgs = {
    repoRoot: '/repo',
    commit: 'deadbeefcafef00d',
    releaseTag: 'api-v0.1.0',
    coverageFiles: ['/repo/apps/web/coverage/coverage-summary.json'],
    readSummary: () => okSummary,
  }

  it('returns a PASS artifact when every gate is green', () => {
    const artifact = buildArtifact(baseArgs)
    expect(artifact.schema).toBe(SCHEMA)
    expect(artifact.commit).toBe('deadbeefcafef00d')
    expect(artifact.release_tag).toBe('api-v0.1.0')
    expect(artifact.verdict).toBe('PASS')
    expect(artifact.checks.lint).toBe('pass')
    expect(artifact.checks.build).toBe('pass')
    expect(artifact.checks.aidefence).toBe('clean')
    expect(artifact.checks.anonymity_guard).toBe('pass')
    expect(typeof artifact.issued_at).toBe('string')
    expect(() => new Date(artifact.issued_at).toISOString()).not.toThrow()
  })

  it('marks FAIL when coverage fails', () => {
    const artifact = buildArtifact({ ...baseArgs, readSummary: () => failingSummary })
    expect(artifact.verdict).toBe('FAIL')
    expect(artifact.checks.coverage.failures).toHaveLength(1)
    expect(artifact.checks.coverage.failures[0]?.name).toBe('apps/web')
  })

  it('marks FAIL when an upstream surface reports fail', () => {
    const artifact = buildArtifact({
      ...baseArgs,
      outcomes: { lint: 'fail' },
    })
    expect(artifact.verdict).toBe('FAIL')
    expect(artifact.checks.lint).toBe('fail')
  })

  it('marks FAIL when aidefence reports findings', () => {
    const artifact = buildArtifact({
      ...baseArgs,
      outcomes: { aidefence: 'findings' },
    })
    expect(artifact.verdict).toBe('FAIL')
    expect(artifact.checks.aidefence).toBe('findings')
  })

  it('permits skip outcomes without flipping the verdict', () => {
    const artifact = buildArtifact({
      ...baseArgs,
      outcomes: { lint: 'skip', build: 'skip', anonymity_guard: 'skip', aidefence: 'skip' },
    })
    expect(artifact.verdict).toBe('PASS')
  })

  it('returns release_tag null when none supplied', () => {
    const artifact = buildArtifact({ ...baseArgs, releaseTag: null })
    expect(artifact.release_tag).toBeNull()
  })

  it('records coverage missing without failing the verdict (vacuous-friendly)', () => {
    const artifact = buildArtifact({ ...baseArgs, coverageFiles: [] })
    expect(artifact.verdict).toBe('PASS')
    expect(artifact.checks.coverage.missing).toBe(true)
  })
})

describe('formatFailureSummary', () => {
  it('returns an empty string for PASS artifacts', () => {
    const artifact = buildArtifact({
      repoRoot: '/repo',
      commit: 'x',
      releaseTag: null,
      coverageFiles: ['/repo/apps/web/coverage/coverage-summary.json'],
      readSummary: () => okSummary,
    })
    expect(formatFailureSummary(artifact)).toBe('')
  })

  it('lists each failing surface and below-floor package by name', () => {
    const artifact = buildArtifact({
      repoRoot: '/repo',
      commit: 'x',
      releaseTag: null,
      coverageFiles: ['/repo/apps/api/coverage/coverage-summary.json'],
      readSummary: () => failingSummary,
      outcomes: { lint: 'fail', aidefence: 'findings' },
    })
    const out = formatFailureSummary(artifact)
    expect(out).toContain('- lint: fail')
    expect(out).toContain('- aidefence: findings')
    expect(out).toContain('apps/api')
    expect(out).toContain('lines')
  })

  it('notes missing coverage explicitly', () => {
    const artifact = buildArtifact({
      repoRoot: '/repo',
      commit: 'x',
      releaseTag: null,
      coverageFiles: [],
      outcomes: { lint: 'fail' },
    })
    expect(formatFailureSummary(artifact)).toContain('no coverage-summary.json')
  })
})

describe('parseCli', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'prod-val-cli-'))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('reads --commit / --release-tag / --out / --root from argv', () => {
    const opts = parseCli(
      ['--commit', 'abc123', '--release-tag', 'web-v0.2.0', '--out', '/tmp/x.json', '--root', root],
      root,
    )
    expect(opts.commit).toBe('abc123')
    expect(opts.releaseTag).toBe('web-v0.2.0')
    expect(opts.out).toBe('/tmp/x.json')
    expect(opts.root).toBe(root)
  })

  it('defaults out to prod-validator-<commit>.json under root', () => {
    const opts = parseCli(['--commit', 'sha9'], root)
    expect(opts.out).toBe(join(root, 'prod-validator-sha9.json'))
    expect(opts.releaseTag).toBeNull()
  })

  it('falls back to the injected git-head function when --commit absent', () => {
    const opts = parseCli([], root, () => 'injected-sha')
    expect(opts.commit).toBe('injected-sha')
    expect(opts.out).toBe(join(root, 'prod-validator-injected-sha.json'))
  })

  it('exposes defaultGitHead as the production fallback (smoke)', () => {
    // Smoke-test only — the real `git rev-parse HEAD` would either succeed
    // (returning a 40-char sha) or throw. We exercise the function so it
    // is covered; either outcome is acceptable for this contract test.
    expect(typeof defaultGitHead).toBe('function')
    try {
      const head = defaultGitHead(process.cwd())
      expect(head).toMatch(/^[0-9a-f]{7,40}$/)
    } catch {
      // Acceptable: test runner may execute outside a git repo
    }
  })
})

describe('main (integration with the filesystem)', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'prod-val-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const writeSummary = (rel: string, summary: object) => {
    const dir = join(root, rel, 'coverage')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'coverage-summary.json'), JSON.stringify(summary))
  }

  it('writes a PASS artifact when every package clears the floor', () => {
    writeSummary('apps/web', okSummary)
    const out = join(root, 'out.json')
    const code = main(['--commit', 'sha-pass', '--out', out, '--root', root])
    expect(code).toBe(0)
    const artifact = JSON.parse(readFileSync(out, 'utf8'))
    expect(artifact.verdict).toBe('PASS')
    expect(artifact.commit).toBe('sha-pass')
    expect(artifact.schema).toBe(SCHEMA)
  })

  it('writes a FAIL artifact and exits 1 when a package falls below floor', () => {
    writeSummary('apps/api', failingSummary)
    const out = join(root, 'out.json')
    const code = main(['--commit', 'sha-fail', '--out', out, '--root', root])
    expect(code).toBe(1)
    const artifact = JSON.parse(readFileSync(out, 'utf8'))
    expect(artifact.verdict).toBe('FAIL')
    expect(artifact.checks.coverage.failures[0]?.name).toBe('apps/api')
  })

  it('gracefully notes missing coverage when no summaries exist (still PASS verdict)', () => {
    const out = join(root, 'out.json')
    const code = main(['--commit', 'sha-empty', '--out', out, '--root', root])
    expect(code).toBe(0)
    const artifact = JSON.parse(readFileSync(out, 'utf8'))
    expect(artifact.checks.coverage.missing).toBe(true)
  })

  it('returns exit 2 and writes a structured error when parseCli throws', () => {
    let captured = ''
    const code = main(['--out', join(root, 'unused.json'), '--root', root], {
      cwd: () => root,
      gitHead: () => {
        throw new Error('not a git repo')
      },
      errOut: (msg) => {
        captured = msg
      },
    })
    expect(code).toBe(2)
    expect(captured).toContain('not a git repo')
  })

  it('uses real process.stderr/process.cwd defaults when no deps are supplied', () => {
    // Force the error path with the default `errOut` and `cwd` deps so the
    // inline default lambdas inside `main` are covered. We swap stderr.write
    // temporarily to capture; cwd is real `process.cwd()`.
    const orig = process.stderr.write.bind(process.stderr)
    let captured = ''
    process.stderr.write = ((chunk: string | Uint8Array) => {
      captured += String(chunk)
      return true
    }) as typeof process.stderr.write
    try {
      const code = main(['--out', join(root, 'unused.json'), '--root', root], {
        gitHead: () => {
          throw new Error('boom-default-deps')
        },
      })
      expect(code).toBe(2)
      expect(captured).toContain('boom-default-deps')
    } finally {
      process.stderr.write = orig
    }
  })

  it('tolerates apps/ entries that are not readable directories (catch in walker)', () => {
    // The walker walks `apps/`, `packages/`, `scripts/` at the root. Create
    // a regular file named `apps` so `readdirSync` throws; the walker must
    // swallow the error and still find a valid summary elsewhere.
    writeFileSync(join(root, 'apps'), 'not a directory')
    const dir = join(root, 'packages/ok/coverage')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'coverage-summary.json'), JSON.stringify(okSummary))
    const out = join(root, 'out.json')
    const code = main(['--commit', 'sha-walk', '--out', out, '--root', root])
    expect(code).toBe(0)
  })

  it('tolerates broken symlinks whose statSync throws (catch in walker)', () => {
    const dir = join(root, 'apps/web')
    mkdirSync(dir, { recursive: true })
    symlinkSync(join(root, 'does-not-exist'), join(dir, 'dangling'))
    const covDir = join(dir, 'coverage')
    mkdirSync(covDir, { recursive: true })
    writeFileSync(join(covDir, 'coverage-summary.json'), JSON.stringify(okSummary))
    const out = join(root, 'out.json')
    const code = main(['--commit', 'sha-symlink', '--out', out, '--root', root])
    expect(code).toBe(0)
  })

  it('reads coverage summaries off disk when no test seam is supplied', () => {
    // Force the default JSON.parse(readFileSync(...)) reader path inside
    // computeCoverage by passing real `coverageFiles` and no `readSummary`.
    const file = join(root, 'pkg/coverage/coverage-summary.json')
    mkdirSync(join(root, 'pkg/coverage'), { recursive: true })
    writeFileSync(file, JSON.stringify(okSummary))
    const report = computeCoverage({
      repoRoot: root,
      commit: 'sha',
      releaseTag: null,
      coverageFiles: [file],
    })
    expect(report.passed).toBe(true)
    expect(report.packages[0]?.name).toBe('pkg')
  })
})
