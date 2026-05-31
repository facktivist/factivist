/**
 * Idempotency tests for the feature-flag seed.
 *
 * Per the Phase 5 identity contract §2: both S1 flags seed `enabled=false`,
 * the seed is safe to re-run, and a second invocation MUST be a no-op
 * (zero inserted) thanks to `onConflictDoNothing` on the `key` PK.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const returningMock = vi.fn()
const onConflictMock = vi.fn(() => ({ returning: returningMock }))
const valuesMock = vi.fn(() => ({ onConflictDoNothing: onConflictMock }))
const insertMock = vi.fn(() => ({ values: valuesMock }))
const createClientMock = vi.fn(() => ({ insert: insertMock }))

vi.mock('../../client.ts', () => ({
  createClient: createClientMock,
}))

describe('seedFeatureFlags()', () => {
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
    const { seedFeatureFlags } = await import('../feature_flags.ts')
    await expect(seedFeatureFlags()).rejects.toThrow(/DATABASE_URL must be set/)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('inserts both S1 flag rows with enabled=false on a fresh DB', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce([
      { key: 'S1_PUBLIC_BROWSE' },
      { key: 'S1_COMPLAINT_SUBMIT' },
    ])

    const { seedFeatureFlags } = await import('../feature_flags.ts')
    const result = await seedFeatureFlags()

    expect(createClientMock).toHaveBeenCalledWith('postgres://seed/db')
    expect(valuesMock).toHaveBeenCalledTimes(1)
    expect(valuesMock).toHaveBeenCalledWith([
      { key: 'S1_PUBLIC_BROWSE', enabled: false },
      { key: 'S1_COMPLAINT_SUBMIT', enabled: false },
    ])
    expect(onConflictMock).toHaveBeenCalledTimes(1)
    expect(onConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.anything() }),
    )
    expect(result).toEqual({ inserted: 2 })
  })

  it('is idempotent: re-running with all rows present inserts 0', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    // First run inserts both; second run sees PK conflicts and returns [].
    returningMock.mockResolvedValueOnce([
      { key: 'S1_PUBLIC_BROWSE' },
      { key: 'S1_COMPLAINT_SUBMIT' },
    ])
    returningMock.mockResolvedValueOnce([])

    const { seedFeatureFlags } = await import('../feature_flags.ts')
    const first = await seedFeatureFlags()
    const second = await seedFeatureFlags()

    expect(first).toEqual({ inserted: 2 })
    expect(second).toEqual({ inserted: 0 })
    // Same call shape both times — proving idempotency lives in the DB
    // (onConflictDoNothing), not in the seed function's branching logic.
    expect(valuesMock).toHaveBeenCalledTimes(2)
    expect(valuesMock).toHaveBeenNthCalledWith(1, [
      { key: 'S1_PUBLIC_BROWSE', enabled: false },
      { key: 'S1_COMPLAINT_SUBMIT', enabled: false },
    ])
    expect(valuesMock).toHaveBeenNthCalledWith(2, [
      { key: 'S1_PUBLIC_BROWSE', enabled: false },
      { key: 'S1_COMPLAINT_SUBMIT', enabled: false },
    ])
  })

  it('returns inserted count even when partial (one flag already present)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce([{ key: 'S1_COMPLAINT_SUBMIT' }])

    const { seedFeatureFlags } = await import('../feature_flags.ts')
    const result = await seedFeatureFlags()
    expect(result).toEqual({ inserted: 1 })
  })
})
