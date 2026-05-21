import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock postgres-js so no real socket is ever opened during unit tests.
// The mock returns a sentinel object that survives reference equality checks.
const postgresMock = vi.fn((url: string, opts: Record<string, unknown>) => ({
  __mock: 'postgres',
  url,
  opts,
}))
vi.mock('postgres', () => ({
  default: postgresMock,
}))

// Mock drizzle-orm so we don't pull in the real query builder; we only need
// to assert wiring: postgres-js client + schema + casing reach drizzle().
const drizzleMock = vi.fn((sql: unknown, config: unknown) => ({
  __mock: 'drizzle',
  sql,
  config,
  select: () => 'noop',
}))
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: drizzleMock,
}))

describe('createClient', () => {
  beforeEach(() => {
    postgresMock.mockClear()
    drizzleMock.mockClear()
  })

  it('passes the URL through to postgres-js with prepare: false', async () => {
    const { createClient } = await import('../client.ts')
    createClient('postgres://example/db')
    expect(postgresMock).toHaveBeenCalledTimes(1)
    expect(postgresMock).toHaveBeenCalledWith('postgres://example/db', {
      prepare: false,
    })
  })

  it('wires postgres-js + schema + snake_case casing into drizzle', async () => {
    const { createClient } = await import('../client.ts')
    const result = createClient('postgres://example/db')
    expect(drizzleMock).toHaveBeenCalledTimes(1)
    const [sql, config] = drizzleMock.mock.calls[0] ?? []
    expect(sql).toMatchObject({ __mock: 'postgres' })
    expect(config).toMatchObject({ casing: 'snake_case' })
    // biome-ignore lint/suspicious/noExplicitAny: probing the mock return shape
    expect((config as any).schema).toBeDefined()
    expect(result).toMatchObject({ __mock: 'drizzle' })
  })
})

describe('db singleton', () => {
  beforeEach(async () => {
    vi.unstubAllEnvs()
    postgresMock.mockClear()
    drizzleMock.mockClear()
    const { __resetDbForTests } = await import('../client.ts')
    __resetDbForTests()
  })

  it('throws when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { db } = await import('../client.ts')
    expect(() => db.select()).toThrow(/DATABASE_URL is not set/)
  })

  it('lazily constructs a client when DATABASE_URL is set', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://lazy/db')
    const { db } = await import('../client.ts')
    // Accessing any property triggers the proxy → createClient path.
    const select = db.select
    expect(select).toBeDefined()
    expect(postgresMock).toHaveBeenCalledWith('postgres://lazy/db', {
      prepare: false,
    })
    expect(drizzleMock).toHaveBeenCalledTimes(1)
  })

  it('caches the client across multiple accesses', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://cached/db')
    const { db } = await import('../client.ts')
    void db.select
    void db.select
    void db.select
    expect(drizzleMock).toHaveBeenCalledTimes(1)
  })

  it('__resetDbForTests clears the cached singleton', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://first/db')
    const { db, __resetDbForTests } = await import('../client.ts')
    void db.select
    __resetDbForTests()
    vi.stubEnv('DATABASE_URL', 'postgres://second/db')
    void db.select
    expect(drizzleMock).toHaveBeenCalledTimes(2)
    expect(postgresMock).toHaveBeenNthCalledWith(2, 'postgres://second/db', {
      prepare: false,
    })
  })
})
