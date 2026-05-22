import { afterEach, describe, expect, it } from 'vitest'
import { cmdIngest, cmdQuery, DEFAULT_DB, formatStats, runCli } from '../cli.ts'
import { __setKuzuLoaderForTests } from '../client.ts'

import { createFixtureRoot, sampleSpec } from './_fixtures.ts'

const buildFakeKuzu = (statements: string[], rows: unknown[] = []) => {
  const Connection = class {
    async query(cypher: string) {
      statements.push(cypher)
      return { getAll: async () => rows }
    }
    close() {}
  }
  const Database = class {
    constructor(public path: string) {}
  }
  return {
    Database: Database as unknown as new (p: string) => unknown,
    Connection: Connection as unknown as new (
      db: unknown,
    ) => {
      query: (s: string) => Promise<{ getAll: () => Promise<unknown[]> }>
      close: () => void
    },
  }
}

const captureIO = () => {
  const stdout: string[] = []
  const stderr: string[] = []
  let exitCode = -1
  return {
    stdout: { write: (s: string) => stdout.push(s) },
    stderr: { write: (s: string) => stderr.push(s) },
    exit: (c: number) => {
      exitCode = c
    },
    log: { stdout, stderr },
    getExit: () => exitCode,
  }
}

afterEach(() => {
  __setKuzuLoaderForTests(async () => (await import('kuzu')) as never)
})

describe('formatStats', () => {
  it('renders a one-line summary', () => {
    const out = formatStats({
      packages: 3,
      files: 12,
      symbols: 20,
      imports: 8,
      dependsOn: 4,
    })
    expect(out).toBe('Ingested 3 packages, 12 files, 20 symbols, 8 imports, 4 package edges\n')
  })
})

describe('cmdIngest', () => {
  it('opens the graph, ingests, and closes the handle', async () => {
    const seen: string[] = []
    __setKuzuLoaderForTests(async () => buildFakeKuzu(seen))
    const root = await createFixtureRoot(sampleSpec())
    const stats = await cmdIngest(root, '/tmp/x.kuzu')
    expect(stats.packages).toBe(3)
    expect(seen.some((s) => s.startsWith('MERGE'))).toBe(true)
  })
})

describe('cmdQuery', () => {
  it('returns rows from the connection getAll()', async () => {
    const seen: string[] = []
    __setKuzuLoaderForTests(async () => buildFakeKuzu(seen, [{ id: 'a' }]))
    const rows = await cmdQuery('/tmp/x.kuzu', 'MATCH (n) RETURN n.id AS id')
    expect(rows).toEqual([{ id: 'a' }])
    expect(seen).toContain('MATCH (n) RETURN n.id AS id')
  })
})

describe('runCli', () => {
  it('runs the ingest command and writes stats to stdout', async () => {
    const seen: string[] = []
    __setKuzuLoaderForTests(async () => buildFakeKuzu(seen))
    const root = await createFixtureRoot(sampleSpec())
    const io = captureIO()
    const code = await runCli({
      argv: ['bun', 'cli.ts', 'ingest'],
      cwd: root,
      env: {},
      ...io,
    })
    expect(code).toBe(0)
    expect(io.log.stdout.join('')).toContain('Ingested 3 packages')
  })

  it('honors CODEGRAPH_DB env override and runs the query command', async () => {
    const seen: string[] = []
    __setKuzuLoaderForTests(async () => buildFakeKuzu(seen, [{ id: 'x' }]))
    const io = captureIO()
    const code = await runCli({
      argv: ['bun', 'cli.ts', 'query', 'MATCH', '(n)', 'RETURN', 'n.id', 'AS', 'id'],
      cwd: '/tmp',
      env: { CODEGRAPH_DB: '/tmp/override.kuzu' },
      ...io,
    })
    expect(code).toBe(0)
    expect(io.log.stdout.join('')).toContain('"id": "x"')
  })

  it('errors when the query body is empty', async () => {
    __setKuzuLoaderForTests(async () => buildFakeKuzu([]))
    const io = captureIO()
    const code = await runCli({
      argv: ['bun', 'cli.ts', 'query'],
      cwd: '/tmp',
      env: {},
      ...io,
    })
    expect(code).toBe(2)
    expect(io.log.stderr.join('')).toContain('Usage:')
  })

  it('errors on unknown commands', async () => {
    const io = captureIO()
    const code = await runCli({
      argv: ['bun', 'cli.ts', 'unknown'],
      cwd: '/tmp',
      env: {},
      ...io,
    })
    expect(code).toBe(2)
    expect(io.log.stderr.join('')).toContain('Usage:')
  })
})

describe('defaults', () => {
  it('exposes the default DB path', () => {
    expect(DEFAULT_DB).toBe('.codegraph/graph.kuzu')
  })
})
