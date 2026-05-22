import { describe, expect, it } from 'vitest'

import { memoryAuditTransport } from '../audit.ts'
import { type CliIO, runCli } from '../cli.ts'

const captureIO = (overrides: Partial<CliIO> = {}): { io: CliIO; out: string[]; err: string[] } => {
  const out: string[] = []
  const err: string[] = []
  return {
    out,
    err,
    io: {
      argv: ['bun', 'cli.ts'],
      cwd: '/tmp/fake',
      env: {},
      stdout: { write: (c) => out.push(c) },
      stderr: { write: (c) => err.push(c) },
      audit: memoryAuditTransport(),
      getStagedFiles: () => [],
      getBranch: () => 'main',
      ...overrides,
    },
  }
}

describe('runCli', () => {
  it('list prints every guardrail name and description', async () => {
    const { io, out } = captureIO({ argv: ['bun', 'cli.ts', 'list'] })
    const code = await runCli(io)
    expect(code).toBe(0)
    expect(out.join('')).toContain('secret-leak\t')
    expect(out.join('')).toContain('cross-app-import\t')
  })

  it('check exits 2 when no guardrail name is given', async () => {
    const { io, err } = captureIO({ argv: ['bun', 'cli.ts', 'check'] })
    const code = await runCli(io)
    expect(code).toBe(2)
    expect(err.join('')).toMatch(/Usage:/)
  })

  it('check exits 2 for an unknown guardrail', async () => {
    const { io, err } = captureIO({ argv: ['bun', 'cli.ts', 'check', 'nope'] })
    const code = await runCli(io)
    expect(code).toBe(2)
    expect(err.join('')).toMatch(/unknown guardrail/)
  })

  it('check returns 0 for a guardrail that passes (migration-port with direct URL)', async () => {
    const { io, out } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'migration-port'],
      env: { DATABASE_URL: 'postgres://h:5432/d' },
    })
    const code = await runCli(io)
    expect(code).toBe(0)
    expect(out.join('')).toContain('[PASS] migration-port')
  })

  it('check returns 1 and prints details for a failing guardrail', async () => {
    const { io, out } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'migration-port'],
      env: { DATABASE_URL: 'postgres://h:6543/d' },
    })
    const code = await runCli(io)
    expect(code).toBe(1)
    expect(out.join('')).toMatch(/\[FAIL\] migration-port/)
    expect(out.join('')).toMatch(/Use the DIRECT connection/)
  })

  it('check honors --staged-files for file-scoped guardrails', async () => {
    const { io, out } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'secret-leak', '--staged-files', 'apps/web/clean.ts'],
      getStagedFiles: () => {
        throw new Error('git should not be called')
      },
    })
    const code = await runCli(io)
    expect(code).toBe(0)
    expect(out.join('')).toMatch(/\[PASS\] secret-leak/)
  })

  it('check honors --branch override', async () => {
    const { io } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'migration-port', '--branch', 'feat/x'],
      env: { DATABASE_URL: 'postgres://h:5432/d' },
    })
    expect(await runCli(io)).toBe(0)
  })

  it('check honors --actor for audit attribution', async () => {
    const audit = memoryAuditTransport()
    const { io } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'migration-port', '--actor', 'web-agent'],
      env: { DATABASE_URL: 'postgres://h:5432/d' },
      audit,
    })
    await runCli(io)
    expect(audit.entries[0]?.actor).toBe('web-agent')
  })

  it('check-all runs every guardrail and aggregates exit codes', async () => {
    const { io, out } = captureIO({
      argv: ['bun', 'cli.ts', 'check-all'],
      env: { DATABASE_URL: 'postgres://h:6543/d' },
    })
    const code = await runCli(io)
    expect(code).toBe(1)
    expect(out.join('')).toMatch(/\[FAIL\] migration-port/)
    expect(out.join('')).toMatch(/\[PASS\] secret-leak/)
  })

  it('check-all returns 0 when every guardrail passes', async () => {
    const { io } = captureIO({
      argv: ['bun', 'cli.ts', 'check-all'],
      env: { DATABASE_URL: 'postgres://h:5432/d' },
    })
    expect(await runCli(io)).toBe(0)
  })

  it('returns 2 and prints usage for unknown commands', async () => {
    const { io, err } = captureIO({ argv: ['bun', 'cli.ts', 'unknown'] })
    expect(await runCli(io)).toBe(2)
    expect(err.join('')).toMatch(/Usage:/)
  })

  it('falls back to git when getStagedFiles is not supplied', async () => {
    // Smoke test: with no overrides, the fallback path runs (and either
    // returns staged files or an empty array — either is fine for this
    // assertion since we only care about exit codes here).
    const { io } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'secret-leak'],
      env: {},
      getStagedFiles: undefined,
      getBranch: undefined,
    })
    const code = await runCli(io)
    expect([0, 1]).toContain(code)
  })
})

describe('git fallback helpers', () => {
  it('_defaultStagedFiles parses NUL-delimited git output', async () => {
    const { _defaultStagedFiles } = await import('../cli.ts')
    const fakeSpawn = (() => ({
      status: 0,
      stdout: 'a.ts\0b.ts\0',
      stderr: '',
      pid: 0,
      output: [] as never[],
      signal: null,
    })) as never
    expect(_defaultStagedFiles('/x', fakeSpawn)).toEqual(['a.ts', 'b.ts'])
  })

  it('_defaultStagedFiles returns [] when git fails', async () => {
    const { _defaultStagedFiles } = await import('../cli.ts')
    const fakeSpawn = (() => ({
      status: 128,
      stdout: '',
      stderr: 'not a git repo',
      pid: 0,
      output: [] as never[],
      signal: null,
    })) as never
    expect(_defaultStagedFiles('/x', fakeSpawn)).toEqual([])
  })

  it('_defaultBranch trims output and returns the branch name', async () => {
    const { _defaultBranch } = await import('../cli.ts')
    const fakeSpawn = (() => ({
      status: 0,
      stdout: 'feat/x\n',
      stderr: '',
      pid: 0,
      output: [] as never[],
      signal: null,
    })) as never
    expect(_defaultBranch('/x', fakeSpawn)).toBe('feat/x')
  })

  it('_defaultBranch returns undefined when git fails or output is empty', async () => {
    const { _defaultBranch } = await import('../cli.ts')
    const fakeFail = (() => ({
      status: 128,
      stdout: '',
      stderr: '',
      pid: 0,
      output: [] as never[],
      signal: null,
    })) as never
    const fakeEmpty = (() => ({
      status: 0,
      stdout: '\n',
      stderr: '',
      pid: 0,
      output: [] as never[],
      signal: null,
    })) as never
    expect(_defaultBranch('/x', fakeFail)).toBeUndefined()
    expect(_defaultBranch('/x', fakeEmpty)).toBeUndefined()
  })

  it('formats bypassed results with class and reason', async () => {
    const { io, out } = captureIO({
      argv: ['bun', 'cli.ts', 'check', 'migration-port'],
      env: {
        DATABASE_URL: 'postgres://h:6543/d',
        BYPASS_GUARDRAILS: 'local',
        BYPASS_REASON: 'on-laptop',
      },
    })
    const code = await runCli(io)
    expect(code).toBe(0)
    expect(out.join('')).toMatch(/\[BYPASS\] migration-port/)
    expect(out.join('')).toMatch(/on-laptop/)
  })
})
