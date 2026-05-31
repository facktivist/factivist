/**
 * `createComplaintAction` — translates 503 + S1_COMPLAINT_SUBMIT_OFF
 * into the typed SUBMISSION_PAUSED_MESSAGE; everything else passes
 * through to the API client error.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()

vi.mock('../../../lib/api/client.ts', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api/client.ts')>(
    '../../../lib/api/client.ts',
  )
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      createComplaint: (...args: unknown[]) => createMock(...args),
    },
  }
})

import { ApiError } from '../../../lib/api/client.ts'
import { SUBMISSION_PAUSED_MESSAGE } from '../composerSignals.ts'
import { createComplaintAction } from '../createComplaintAction.ts'

const FAKE_INPUT = {
  title: 'Title',
  body: 'Body that is long enough.',
  categorySlug: 'roads-and-transport',
  stateCode: 'KA',
  districtCode: 'KA-01',
  pcCode: 'KA-01-PC1',
  acCode: 'KA-01-PC1-AC1',
  photoUrls: [],
} as never

afterEach(() => {
  vi.clearAllMocks()
})

describe('createComplaintAction', () => {
  it('forwards the API response on success', async () => {
    createMock.mockResolvedValueOnce({ id: 'cmp_42' })
    const out = await createComplaintAction(FAKE_INPUT)
    expect(out).toEqual({ id: 'cmp_42' })
    expect(createMock).toHaveBeenCalledWith(FAKE_INPUT)
  })

  it('throws SUBMISSION_PAUSED_MESSAGE on 503 + S1_COMPLAINT_SUBMIT_OFF', async () => {
    createMock.mockRejectedValueOnce(
      new ApiError('feature off', 503, { code: 'S1_COMPLAINT_SUBMIT_OFF' }),
    )
    await expect(createComplaintAction(FAKE_INPUT)).rejects.toThrow(SUBMISSION_PAUSED_MESSAGE)
  })

  it('rethrows a 503 WITHOUT the paused code as-is', async () => {
    const original = new ApiError('something else', 503, { code: 'OTHER' })
    createMock.mockRejectedValueOnce(original)
    await expect(createComplaintAction(FAKE_INPUT)).rejects.toBe(original)
  })

  it('rethrows non-503 API errors as-is', async () => {
    const original = new ApiError('bad request', 400, { code: 'VALIDATION' })
    createMock.mockRejectedValueOnce(original)
    await expect(createComplaintAction(FAKE_INPUT)).rejects.toBe(original)
  })

  it('rethrows non-ApiError errors as-is', async () => {
    const original = new Error('network down')
    createMock.mockRejectedValueOnce(original)
    await expect(createComplaintAction(FAKE_INPUT)).rejects.toBe(original)
  })
})
