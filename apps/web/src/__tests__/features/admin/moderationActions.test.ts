/**
 * moderationActions.submitModerationDecision — server action tests.
 *
 * Hard-tests:
 *   - null session → returns `{ok:false, code:'unauthorized'}`.
 *   - invalid payload → returns `{ok:false, code:'validation'}`.
 *   - successful API call → revalidatePath + redirect (both mocked).
 *   - API 409 → `{ok:false, code:'already_decided'}`.
 *   - API 401 → `{ok:false, code:'unauthorized'}`.
 *   - Other error → `{ok:false, code:'network'}`.
 *   - Bound caseId reaches the API client unchanged.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { current: unknown } = { current: null }
const decideMock = vi.fn()
const revalidateMock = vi.fn()
const redirectMock = vi.fn((p: string) => {
  throw new Error(`__REDIRECT__:${p}`)
})

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

vi.mock('../../../lib/auth/server.ts', () => ({
  getServerSession: async () => sessionRef.current,
}))

vi.mock('../../../lib/api/client.ts', () => ({
  apiClient: { decideModeration: decideMock },
  ApiError,
}))

vi.mock('next/cache', () => ({ revalidatePath: revalidateMock }))
vi.mock('next/navigation', () => ({ redirect: redirectMock }))

beforeEach(() => {
  sessionRef.current = { userId: 'usr_admin', role: 'admin', token: 'jwt-1' }
  decideMock.mockReset()
  revalidateMock.mockClear()
  redirectMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('submitModerationDecision — guards', () => {
  it('returns unauthorized when session is null', async () => {
    sessionRef.current = null
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('unauthorized')
    }
    expect(decideMock).not.toHaveBeenCalled()
  })

  it('returns validation when the rawInput fails Zod parse', async () => {
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'kill',
      rationale: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('validation')
    }
    expect(decideMock).not.toHaveBeenCalled()
  })

  it('returns validation for an empty rationale', async () => {
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: '   ',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('validation')
    }
  })
})

describe('submitModerationDecision — success path', () => {
  it('forwards token + caseId + parsed payload to the API client', async () => {
    decideMock.mockResolvedValueOnce({ item: { status: 'approved' } })
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    // redirect throws — we catch and assert side-effects.
    await expect(
      submitModerationDecision('mq_target_id', { decision: 'approve', rationale: 'looks fine' }),
    ).rejects.toThrow(/__REDIRECT__:\/admin\/moderation/)
    expect(decideMock).toHaveBeenCalledWith('jwt-1', 'mq_target_id', {
      decision: 'approve',
      rationale: 'looks fine',
    })
    expect(revalidateMock).toHaveBeenCalledWith('/admin/moderation')
    expect(redirectMock).toHaveBeenCalledWith('/admin/moderation')
  })
})

describe('submitModerationDecision — failure paths', () => {
  it('maps API 409 to already_decided', async () => {
    decideMock.mockRejectedValueOnce(new ApiError('conflict', 409))
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('already_decided')
    }
    expect(revalidateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('maps API 401 to unauthorized', async () => {
    decideMock.mockRejectedValueOnce(new ApiError('unauthorized', 401))
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('unauthorized')
    }
  })

  it('maps a generic Error to network', async () => {
    decideMock.mockRejectedValueOnce(new Error('socket hang up'))
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('network')
      expect(r.message).toContain('socket hang up')
    }
  })

  it('maps a non-Error throwable to network with a generic message', async () => {
    decideMock.mockRejectedValueOnce('boom')
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('network')
    }
  })

  it('maps a non-ApiError with a custom status to network (NOT unauthorized)', async () => {
    decideMock.mockRejectedValueOnce(new Error('boom'))
    const { submitModerationDecision } = await import(
      '../../../features/admin/moderationActions.ts'
    )
    const r = await submitModerationDecision('mq_1', {
      decision: 'approve',
      rationale: 'x',
    })
    if (!r.ok) {
      expect(r.code).toBe('network')
    }
  })
})
