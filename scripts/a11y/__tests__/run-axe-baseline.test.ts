import { describe, expect, it, vi } from 'vitest'

import {
  type AxeRunResult,
  type AxeViolation,
  type BaselineConfig,
  diffAgainstSnapshot,
  fingerprintViolation,
  formatVerdict,
  isGateFailing,
  main,
  parseArgs,
  type RunDeps,
  type SurfaceConfig,
  validateConfig,
} from '../run-axe-baseline.ts'

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeViolation(overrides: Partial<AxeViolation> = {}): AxeViolation {
  return {
    id: 'color-contrast',
    impact: 'serious',
    description: 'Elements must have sufficient color contrast',
    help: 'Elements must meet minimum color contrast ratio thresholds',
    helpUrl: 'https://example.test/color-contrast',
    tags: ['wcag2aa'],
    nodes: [
      {
        html: '<button class="text-xs">Submit</button>',
        target: ['button.submit'],
      },
    ],
    ...overrides,
  }
}

function makeSurface(id: string, url = `http://localhost:3000/${id}`): SurfaceConfig {
  return {
    id,
    title: `Surface ${id}`,
    url,
    mustPass: ['color-contrast'],
    disabled: [],
  }
}

function makeConfig(surfaces: SurfaceConfig[]): BaselineConfig {
  return {
    wcagLevel: 'AA',
    wcagVersion: '2.2',
    failOn: ['serious', 'critical'],
    snapshotDir: 'scripts/a11y/baseline',
    outDir: 'scripts/a11y/out',
    viewport: { width: 1280, height: 800 },
    axeRunOptions: {},
    surfaces,
  }
}

function makeRunResult(violations: AxeViolation[]): AxeRunResult {
  return {
    url: 'http://localhost:3000/test',
    timestamp: '2026-05-23T00:00:00.000Z',
    violations,
    incomplete: [],
  }
}

interface FakeFs {
  files: Map<string, string>
  exists: (p: string) => boolean
  read: (p: string) => string
  write: ReturnType<typeof vi.fn>
  mkdir: ReturnType<typeof vi.fn>
}

function makeFakeFs(initial: Record<string, string> = {}): FakeFs {
  const files = new Map<string, string>(Object.entries(initial))
  return {
    files,
    exists: (p) => files.has(p),
    read: (p) => {
      const v = files.get(p)
      if (v === undefined) throw new Error(`ENOENT: ${p}`)
      return v
    },
    write: vi.fn((p: string, c: string) => {
      files.set(p, c)
    }),
    mkdir: vi.fn(),
  }
}

interface FakeLogs {
  log: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

function makeLogs(): FakeLogs {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

// ─── parseArgs ──────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('uses sensible defaults when no flags are passed', () => {
    const args = parseArgs([])
    expect(args.config).toBe('scripts/a11y/a11y-baseline.json')
    expect(args.updateBaseline).toBe(false)
    expect(args.help).toBe(false)
    expect(args.only).toBeUndefined()
  })

  it('parses --config <path>', () => {
    expect(parseArgs(['--config', '/tmp/x.json']).config).toBe('/tmp/x.json')
  })

  it('parses --config=<path>', () => {
    expect(parseArgs(['--config=/tmp/x.json']).config).toBe('/tmp/x.json')
  })

  it('parses --update-baseline', () => {
    expect(parseArgs(['--update-baseline']).updateBaseline).toBe(true)
  })

  it('parses --only <id>', () => {
    expect(parseArgs(['--only', '01-onboarding']).only).toBe('01-onboarding')
    expect(parseArgs(['--only=02-composer']).only).toBe('02-composer')
  })

  it('parses --help and -h', () => {
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-h']).help).toBe(true)
  })

  it('throws when --config is missing its argument', () => {
    expect(() => parseArgs(['--config'])).toThrow(/--config requires/)
  })

  it('throws when --only is missing its argument', () => {
    expect(() => parseArgs(['--only'])).toThrow(/--only requires/)
  })
})

// ─── validateConfig ─────────────────────────────────────────────────────────

describe('validateConfig', () => {
  it('rejects null', () => {
    expect(() => validateConfig(null as never)).toThrow()
  })

  it('rejects an empty surfaces array', () => {
    expect(() =>
      validateConfig({
        ...makeConfig([]),
      }),
    ).toThrow(/at least one surface/)
  })

  it('rejects an empty failOn array', () => {
    const c = makeConfig([makeSurface('a')])
    expect(() => validateConfig({ ...c, failOn: [] })).toThrow(/failOn/)
  })

  it('rejects an invalid severity in failOn', () => {
    const c = makeConfig([makeSurface('a')])
    expect(() =>
      validateConfig({
        ...c,
        failOn: ['catastrophic' as never],
      }),
    ).toThrow(/Invalid severity/)
  })

  it('rejects duplicate surface ids', () => {
    expect(() => validateConfig(makeConfig([makeSurface('a'), makeSurface('a')]))).toThrow(
      /Duplicate surface id/,
    )
  })

  it('rejects a surface without a url', () => {
    const s = { ...makeSurface('a'), url: '' }
    expect(() => validateConfig(makeConfig([s]))).toThrow(/url/)
  })

  it('accepts a valid config', () => {
    expect(() => validateConfig(makeConfig([makeSurface('01-onboarding')]))).not.toThrow()
  })
})

// ─── fingerprintViolation + diffAgainstSnapshot ─────────────────────────────

describe('fingerprintViolation', () => {
  it('produces a stable, target-based fingerprint per node', () => {
    const v = makeViolation({
      nodes: [
        { html: '<a>x</a>', target: ['main > a:nth-child(1)'] },
        { html: '<a>y</a>', target: ['main > a:nth-child(2)'] },
      ],
    })
    const fps = fingerprintViolation(v)
    expect(fps).toContain('color-contrast::main > a:nth-child(1)')
    expect(fps).toContain('color-contrast::main > a:nth-child(2)')
  })

  it('ignores html differences for the same target', () => {
    const a = makeViolation({ nodes: [{ html: '<button>A</button>', target: ['.x'] }] })
    const b = makeViolation({ nodes: [{ html: '<button>B</button>', target: ['.x'] }] })
    expect(fingerprintViolation(a)).toEqual(fingerprintViolation(b))
  })
})

describe('diffAgainstSnapshot', () => {
  it('treats everything as new when there is no snapshot', () => {
    const current = [makeViolation()]
    expect(diffAgainstSnapshot(current, null).newViolations).toHaveLength(1)
  })

  it('treats a fully-matched violation as snapshotted', () => {
    const v = makeViolation()
    const d = diffAgainstSnapshot([v], [v])
    expect(d.newViolations).toHaveLength(0)
    expect(d.snapshottedViolations).toHaveLength(1)
  })

  it('treats a new selector as a new violation even with the same rule id', () => {
    const snap = makeViolation()
    const current = makeViolation({
      nodes: [{ html: '<a>x</a>', target: ['main > a.new'] }],
    })
    const d = diffAgainstSnapshot([current], [snap])
    expect(d.newViolations).toHaveLength(1)
    expect(d.snapshottedViolations).toHaveLength(0)
  })
})

// ─── isGateFailing ──────────────────────────────────────────────────────────

describe('isGateFailing', () => {
  it('fails on a new critical violation', () => {
    expect(isGateFailing([makeViolation({ impact: 'critical' })], ['serious', 'critical'])).toBe(
      true,
    )
  })

  it('fails on a new serious violation', () => {
    expect(isGateFailing([makeViolation({ impact: 'serious' })], ['serious', 'critical'])).toBe(
      true,
    )
  })

  it('fails on a new moderate violation (snapshot-only allowance)', () => {
    expect(isGateFailing([makeViolation({ impact: 'moderate' })], ['serious', 'critical'])).toBe(
      true,
    )
  })

  it('does NOT fail on a minor-only violation', () => {
    expect(isGateFailing([makeViolation({ impact: 'minor' })], ['serious', 'critical'])).toBe(false)
  })

  it('does NOT fail on an empty new-violations list', () => {
    expect(isGateFailing([], ['serious', 'critical'])).toBe(false)
  })
})

// ─── formatVerdict ──────────────────────────────────────────────────────────

describe('formatVerdict', () => {
  it('renders a passing verdict', () => {
    const out = formatVerdict({
      surfaceId: '01-onboarding',
      url: 'x',
      newViolations: [],
      snapshottedViolations: [],
      passed: true,
    })
    expect(out).toMatch(/✓/)
    expect(out).toMatch(/01-onboarding/)
  })

  it('renders a passing verdict with snapshot count', () => {
    const out = formatVerdict({
      surfaceId: '08-legal',
      url: 'x',
      newViolations: [],
      snapshottedViolations: [makeViolation()],
      passed: true,
    })
    expect(out).toMatch(/snapshotted/)
  })

  it('renders a failing verdict with per-violation lines', () => {
    const out = formatVerdict({
      surfaceId: '02-composer',
      url: 'x',
      newViolations: [makeViolation()],
      snapshottedViolations: [],
      passed: false,
    })
    expect(out).toMatch(/✗ 02-composer/)
    expect(out).toMatch(/serious/)
    expect(out).toMatch(/color-contrast/)
  })
})

// ─── main(): integration through dependency-injected runner ─────────────────

describe('main', () => {
  const baseConfig = makeConfig([makeSurface('01-onboarding'), makeSurface('02-composer')])

  it('exits 2 on a missing config', async () => {
    const fs = makeFakeFs()
    const logs = makeLogs()
    const deps: RunDeps = {
      runAxe: async () => makeRunResult([]),
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: logs.log,
      error: logs.error,
    }
    const code = await main(['--config', '/missing.json'], deps)
    expect(code).toBe(2)
    expect(logs.error).toHaveBeenCalled()
  })

  it('exits 2 on an invalid CLI flag (--config missing arg)', async () => {
    const logs = makeLogs()
    const deps: RunDeps = {
      runAxe: async () => makeRunResult([]),
      log: logs.log,
      error: logs.error,
    }
    const code = await main(['--config'], deps)
    expect(code).toBe(2)
    expect(logs.error).toHaveBeenCalled()
  })

  it('exits 0 when --help is passed', async () => {
    const logs = makeLogs()
    const code = await main(['--help'], {
      runAxe: async () => makeRunResult([]),
      log: logs.log,
      error: logs.error,
    })
    expect(code).toBe(0)
    expect(logs.log.mock.calls[0]?.[0]).toMatch(/Usage:/)
  })

  it('exits 0 when every surface passes with no violations', async () => {
    const fs = makeFakeFs({
      '/cfg.json': JSON.stringify(baseConfig),
    })
    const runAxe = vi.fn(async () => makeRunResult([]))
    const logs = makeLogs()
    const code = await main(['--config', '/cfg.json'], {
      runAxe,
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: logs.log,
      error: logs.error,
    })
    expect(code).toBe(0)
    expect(runAxe).toHaveBeenCalledTimes(2)
    expect(fs.write).toHaveBeenCalled() // wrote reports
  })

  it('exits 1 when a new critical violation appears with no snapshot', async () => {
    const fs = makeFakeFs({ '/cfg.json': JSON.stringify(baseConfig) })
    const runAxe = vi.fn(async () => makeRunResult([makeViolation({ impact: 'critical' })]))
    const logs = makeLogs()
    const code = await main(['--config', '/cfg.json'], {
      runAxe,
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: logs.log,
      error: logs.error,
    })
    expect(code).toBe(1)
  })

  it('exits 0 when the only violations match the snapshot exactly', async () => {
    const v = makeViolation({ impact: 'serious' })
    // Manually inject snapshot keyed by the path resolution that main() will
    // make. We use fileExists + read on the path the runner asks for.
    const snapshotMatcher = (p: string) => p.endsWith('01-onboarding.json')
    const deps: RunDeps = {
      runAxe: async (s) => (s.id === '01-onboarding' ? makeRunResult([v]) : makeRunResult([])),
      readFile: (p: string) => {
        if (p === '/cfg.json') return JSON.stringify(baseConfig)
        if (snapshotMatcher(p)) return JSON.stringify({ violations: [v] })
        throw new Error(`ENOENT: ${p}`)
      },
      writeFile: vi.fn(),
      fileExists: (p: string) => p === '/cfg.json' || snapshotMatcher(p),
      mkdir: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
    }
    const code = await main(['--config', '/cfg.json'], deps)
    expect(code).toBe(0)
  })

  it('exits 1 when a new node appears on a rule that was previously snapshotted', async () => {
    const snap = makeViolation({ impact: 'serious' })
    const current = makeViolation({
      impact: 'serious',
      nodes: [
        { html: '<a>x</a>', target: ['button.submit'] },
        { html: '<a>y</a>', target: ['main > a.brand-new'] },
      ],
    })
    const snapshotMatcher = (p: string) => p.endsWith('01-onboarding.json')
    const deps: RunDeps = {
      runAxe: async (s) =>
        s.id === '01-onboarding' ? makeRunResult([current]) : makeRunResult([]),
      readFile: (p: string) => {
        if (p === '/cfg.json') return JSON.stringify(baseConfig)
        if (snapshotMatcher(p)) return JSON.stringify({ violations: [snap] })
        throw new Error(`ENOENT: ${p}`)
      },
      writeFile: vi.fn(),
      fileExists: (p: string) => p === '/cfg.json' || snapshotMatcher(p),
      mkdir: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
    }
    const code = await main(['--config', '/cfg.json'], deps)
    expect(code).toBe(1)
  })

  it('respects --only by running just one surface', async () => {
    const fs = makeFakeFs({ '/cfg.json': JSON.stringify(baseConfig) })
    const runAxe = vi.fn(async () => makeRunResult([]))
    const code = await main(['--config', '/cfg.json', '--only', '02-composer'], {
      runAxe,
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: vi.fn(),
      error: vi.fn(),
    })
    expect(code).toBe(0)
    expect(runAxe).toHaveBeenCalledTimes(1)
    expect(runAxe.mock.calls[0]?.[0]?.id).toBe('02-composer')
  })

  it('exits 2 when --only matches no surface', async () => {
    const fs = makeFakeFs({ '/cfg.json': JSON.stringify(baseConfig) })
    const logs = makeLogs()
    const code = await main(['--config', '/cfg.json', '--only', 'ghost'], {
      runAxe: async () => makeRunResult([]),
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: logs.log,
      error: logs.error,
    })
    expect(code).toBe(2)
  })

  it('--update-baseline writes the snapshot and skips the gate', async () => {
    const fs = makeFakeFs({ '/cfg.json': JSON.stringify(baseConfig) })
    const runAxe = vi.fn(async () => makeRunResult([makeViolation({ impact: 'critical' })]))
    const logs = makeLogs()
    const code = await main(['--config', '/cfg.json', '--update-baseline'], {
      runAxe,
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: logs.log,
      error: logs.error,
    })
    expect(code).toBe(0)
    // Wrote both snapshots
    const writes = (fs.write as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
    expect(writes.some((p) => p.endsWith('01-onboarding.json'))).toBe(true)
    expect(writes.some((p) => p.endsWith('02-composer.json'))).toBe(true)
  })

  it('exits 2 when the runner throws', async () => {
    const fs = makeFakeFs({ '/cfg.json': JSON.stringify(baseConfig) })
    const logs = makeLogs()
    const code = await main(['--config', '/cfg.json'], {
      runAxe: async () => {
        throw new Error('playwright not installed')
      },
      readFile: fs.read,
      writeFile: fs.write,
      fileExists: fs.exists,
      mkdir: fs.mkdir,
      log: logs.log,
      error: logs.error,
    })
    expect(code).toBe(2)
    expect(logs.error).toHaveBeenCalled()
  })

  it('tolerates a corrupt snapshot by treating it as empty', async () => {
    const snapshotMatcher = (p: string) => p.endsWith('01-onboarding.json')
    const deps: RunDeps = {
      runAxe: async (s) =>
        s.id === '01-onboarding'
          ? makeRunResult([makeViolation({ impact: 'minor' })])
          : makeRunResult([]),
      readFile: (p: string) => {
        if (p === '/cfg.json') return JSON.stringify(baseConfig)
        if (snapshotMatcher(p)) return '{ not json'
        throw new Error(`ENOENT: ${p}`)
      },
      writeFile: vi.fn(),
      fileExists: (p: string) => p === '/cfg.json' || snapshotMatcher(p),
      mkdir: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
    }
    const code = await main(['--config', '/cfg.json'], deps)
    // The new violation is `minor`, so the gate stays green even with a
    // broken snapshot.
    expect(code).toBe(0)
  })
})
