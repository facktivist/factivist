import { beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeSql {
  calls: { stmt: string; params?: unknown[] }[]
  responses: unknown[][]
  unsafe: (stmt: string, params?: unknown[]) => Promise<unknown>
  end: () => Promise<void>
}

const buildFakeSql = (responses: unknown[][] = []): FakeSql => {
  const queue = [...responses]
  const fake: FakeSql = {
    calls: [],
    responses,
    unsafe: async (stmt: string, params?: unknown[]) => {
      fake.calls.push({ stmt, params })
      return queue.shift() ?? []
    },
    end: async () => {},
  }
  return fake
}

const postgresMock = vi.fn((_url: string, _opts?: Record<string, unknown>) => buildFakeSql())
vi.mock('postgres', () => ({ default: postgresMock }))

beforeEach(() => {
  postgresMock.mockClear()
})

describe('ensureAgeSession', () => {
  it('issues LOAD and search_path SETs in order', async () => {
    const fake = buildFakeSql()
    const { ensureAgeSession } = await import('../age.ts')
    await ensureAgeSession(fake as never)
    expect(fake.calls.map((c) => c.stmt)).toEqual([
      `LOAD 'age'`,
      `SET search_path = ag_catalog, "$user", public`,
    ])
  })
})

describe('runCypher', () => {
  it('rejects when no columns are declared', async () => {
    const { runCypher } = await import('../age.ts')
    await expect(runCypher(buildFakeSql() as never, 'MATCH (n) RETURN n', [])).rejects.toThrow(
      /at least one column/,
    )
  })

  it('wraps the cypher in cypher() with the declared columns', async () => {
    const fake = buildFakeSql([[{ id: '"e1"', label: '"a claim"' }]])
    const { runCypher } = await import('../age.ts')
    const rows = await runCypher<{ id: string; label: string }>(
      fake as never,
      'MATCH (e:Entity) RETURN e.id AS id, e.label AS label',
      [{ name: 'id' }, { name: 'label' }],
    )
    expect(fake.calls[0]?.stmt).toContain(`SELECT * FROM cypher('factivist_kg'`)
    expect(fake.calls[0]?.stmt).toContain(`AS ("id" agtype, "label" agtype)`)
    expect(rows[0]?.id).toBe('e1')
    expect(rows[0]?.label).toBe('a claim')
  })

  it('uses the supplied graph name and column type', async () => {
    const fake = buildFakeSql([[]])
    const { runCypher } = await import('../age.ts')
    await runCypher(
      fake as never,
      'MATCH (n) RETURN n.id AS id',
      [{ name: 'id', type: 'text' }],
      'tenant_kg',
    )
    expect(fake.calls[0]?.stmt).toContain(`cypher('tenant_kg'`)
    expect(fake.calls[0]?.stmt).toContain(`"id" text`)
  })
})

describe('openAgeClient', () => {
  it('constructs a postgres-js client with prepare:false', async () => {
    const { openAgeClient } = await import('../age.ts')
    openAgeClient('postgres://localhost/db')
    expect(postgresMock).toHaveBeenCalledTimes(1)
    const args = postgresMock.mock.calls[0]
    expect(args?.[0]).toBe('postgres://localhost/db')
    expect(args?.[1]?.prepare).toBe(false)
  })
})

describe('agtype coercion', () => {
  it('strips ::vertex suffix and JSON-parses payloads', async () => {
    const { _internals } = await import('../age.ts')
    expect(_internals.coerceAgtype('{"id":"e1"}::vertex')).toEqual({ id: 'e1' })
    expect(_internals.coerceAgtype('"plain"')).toBe('plain')
    expect(_internals.coerceAgtype(42)).toBe(42)
  })

  it('returns the stripped string on JSON-parse failure', async () => {
    const { _internals } = await import('../age.ts')
    expect(_internals.coerceAgtype('not-json::edge')).toBe('not-json')
  })
})
