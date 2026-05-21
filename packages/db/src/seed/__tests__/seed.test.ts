import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const returningMock = vi.fn()
const onConflictMock = vi.fn(() => ({ returning: returningMock }))
const valuesMock = vi.fn(() => ({ onConflictDoNothing: onConflictMock }))
const insertMock = vi.fn(() => ({ values: valuesMock }))
const createClientMock = vi.fn(() => ({ insert: insertMock }))

vi.mock('../../client.ts', () => ({
  createClient: createClientMock,
}))

describe('seed()', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    createClientMock.mockClear()
    insertMock.mockClear()
    valuesMock.mockClear()
    onConflictMock.mockClear()
    returningMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { seed } = await import('../index.ts')
    await expect(seed()).rejects.toThrow(/DATABASE_URL must be set/)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('inserts the three sample users with onConflictDoNothing on email', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce([
      { id: 'usr_1', email: 'alice@example.com' },
      { id: 'usr_2', email: 'bob@example.com' },
      { id: 'usr_3', email: 'carol@example.com' },
    ])

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { seed } = await import('../index.ts')
    const result = await seed()

    expect(createClientMock).toHaveBeenCalledWith('postgres://seed/db')
    expect(valuesMock).toHaveBeenCalledTimes(1)
    expect(valuesMock).toHaveBeenCalledWith([
      { email: 'alice@example.com', displayName: 'Alice Anderson' },
      { email: 'bob@example.com', displayName: 'Bob Baxter' },
      { email: 'carol@example.com', displayName: 'Carol Chen' },
    ])

    expect(onConflictMock).toHaveBeenCalledTimes(1)
    expect(onConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.anything() }),
    )
    expect(returningMock).toHaveBeenCalled()
    expect(result).toEqual({ inserted: 3 })
    expect(logSpy).toHaveBeenCalled()
  })

  it('returns 0 when all rows already exist (onConflict suppresses inserts)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce([])
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    const { seed } = await import('../index.ts')
    const result = await seed()
    expect(result).toEqual({ inserted: 0 })
  })
})
