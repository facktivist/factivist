import { beforeEach, describe, expect, it, vi } from 'vitest'

const endMock = vi.fn(async () => undefined)
const postgresMock = vi.fn((url: string, opts: Record<string, unknown>) => ({
  __mock: 'postgres',
  url,
  opts,
  end: endMock,
}))
vi.mock('postgres', () => ({
  default: postgresMock,
}))

const drizzleMock = vi.fn((sql: unknown) => ({ __mock: 'drizzle', sql }))
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: drizzleMock,
}))

const migrateMock = vi.fn(async () => undefined)
vi.mock('drizzle-orm/postgres-js/migrator', () => ({
  migrate: migrateMock,
}))

describe('migrate run()', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    postgresMock.mockClear()
    drizzleMock.mockClear()
    migrateMock.mockClear()
    endMock.mockClear()
  })

  it('throws when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { run } = await import('../migrate.ts')
    await expect(run()).rejects.toThrow(/DATABASE_URL must be set/)
    expect(postgresMock).not.toHaveBeenCalled()
  })

  it('opens a single-connection client, runs the migrator, and closes the pool', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://migrate/db')
    const { run } = await import('../migrate.ts')
    await run()

    expect(postgresMock).toHaveBeenCalledWith('postgres://migrate/db', {
      max: 1,
      prepare: false,
    })
    expect(drizzleMock).toHaveBeenCalledTimes(1)
    expect(migrateMock).toHaveBeenCalledTimes(1)
    expect(migrateMock).toHaveBeenCalledWith(expect.objectContaining({ __mock: 'drizzle' }), {
      migrationsFolder: './drizzle',
    })
    expect(endMock).toHaveBeenCalledTimes(1)
  })
})
