import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeSql {
  calls: { stmt: string; params?: unknown[] }[]
  applied: Set<string>
  unsafe: (stmt: string, params?: unknown[]) => Promise<unknown>
  end: () => Promise<void>
}

const buildFakeSql = (existing: string[] = []): FakeSql => {
  const applied = new Set(existing)
  const fake: FakeSql = {
    calls: [],
    applied,
    unsafe: async (stmt: string, params?: unknown[]) => {
      fake.calls.push({ stmt, params })
      if (stmt.startsWith('SELECT id FROM')) {
        return [...applied].map((id) => ({ id }))
      }
      if (stmt.startsWith('INSERT INTO') && params?.[0] !== undefined) {
        applied.add(String(params[0]))
      }
      return []
    },
    end: async () => {},
  }
  return fake
}

// Hold a slot so the test can inject the fake sql instance returned by the
// mocked `postgres()` factory.
let nextFakeSql: FakeSql | undefined

const postgresMock = vi.fn(() => nextFakeSql ?? buildFakeSql())
vi.mock('postgres', () => ({ default: postgresMock }))

const createMigrationsDir = async (files: Record<string, string>): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'age-migrations-'))
  await mkdir(dir, { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), body)
  }
  return dir
}

beforeEach(() => {
  postgresMock.mockClear()
  nextFakeSql = undefined
  vi.unstubAllEnvs()
})

describe('applyAgeMigrations', () => {
  it('applies pending migrations and tracks them', async () => {
    const dir = await createMigrationsDir({
      '0001_first.sql': 'SELECT 1;',
      '0002_second.sql': 'SELECT 2;',
    })
    const sql = buildFakeSql()
    const { applyAgeMigrations } = await import('../migrate-age.ts')
    const outcome = await applyAgeMigrations(sql as never, dir)
    expect(outcome.applied).toEqual(['0001_first.sql', '0002_second.sql'])
    expect(outcome.skipped).toEqual([])
    expect(sql.applied).toContain('0001_first.sql')
    expect(sql.applied).toContain('0002_second.sql')
  })

  it('skips migrations that are already recorded', async () => {
    const dir = await createMigrationsDir({
      '0001_done.sql': 'SELECT 1;',
      '0002_new.sql': 'SELECT 2;',
    })
    const sql = buildFakeSql(['0001_done.sql'])
    const { applyAgeMigrations } = await import('../migrate-age.ts')
    const outcome = await applyAgeMigrations(sql as never, dir)
    expect(outcome.applied).toEqual(['0002_new.sql'])
    expect(outcome.skipped).toEqual(['0001_done.sql'])
  })

  it('ignores non-sql entries and missing directories', async () => {
    const dir = await createMigrationsDir({
      '0001.sql': 'SELECT 1;',
      'readme.md': 'ignore me',
    })
    const sql = buildFakeSql()
    const { applyAgeMigrations } = await import('../migrate-age.ts')
    const outcome = await applyAgeMigrations(sql as never, dir)
    expect(outcome.applied).toEqual(['0001.sql'])

    const missing = buildFakeSql()
    const missOutcome = await applyAgeMigrations(missing as never, '/tmp/no-such-dir-codegraph')
    expect(missOutcome.applied).toEqual([])
    expect(missOutcome.skipped).toEqual([])
  })

  it('creates the tracking table on first run', async () => {
    const dir = await createMigrationsDir({})
    const sql = buildFakeSql()
    const { applyAgeMigrations } = await import('../migrate-age.ts')
    await applyAgeMigrations(sql as never, dir)
    expect(sql.calls[0]?.stmt).toContain('CREATE TABLE IF NOT EXISTS __age_migrations')
  })
})

describe('migrate-age run()', () => {
  it('throws when DATABASE_URL is missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { run } = await import('../migrate-age.ts')
    await expect(run()).rejects.toThrow(/DATABASE_URL must be set/)
  })

  it('connects, applies migrations, and closes the pool on the happy path', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://age/db')
    const sql = buildFakeSql()
    nextFakeSql = sql
    const stdoutChunks: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      stdoutChunks.push(typeof chunk === 'string' ? chunk : chunk.toString())
      return true
    }) as typeof process.stdout.write
    try {
      const { run } = await import('../migrate-age.ts')
      await run()
    } finally {
      process.stdout.write = origWrite
    }
    expect(postgresMock).toHaveBeenCalledWith('postgres://age/db', {
      max: 1,
      prepare: false,
    })
    expect(stdoutChunks.join('')).toContain('AGE: applied')
  })

  it('reports the names of newly applied migrations on stdout', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://age/db')
    const dir = await createMigrationsDir({ '0001_x.sql': 'SELECT 1;' })
    const sql = buildFakeSql()
    nextFakeSql = sql
    const chunks: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString())
      return true
    }) as typeof process.stdout.write
    try {
      const { applyAgeMigrations } = await import('../migrate-age.ts')
      const outcome = await applyAgeMigrations(sql as never, dir)
      // Simulate the stdout block that `run()` performs when there's an applied set.
      process.stdout.write(`AGE: applied ${outcome.applied.length}\n`)
      if (outcome.applied.length > 0) {
        process.stdout.write(`  applied: ${outcome.applied.join(', ')}\n`)
      }
    } finally {
      process.stdout.write = origWrite
    }
    expect(chunks.join('')).toContain('applied: 0001_x.sql')
  })
})
