'use server'

/**
 * Server action wrapper around `apiClient.createComplaint`.
 *
 * Sits between the Client Component `<CreateComplaintForm />` and the
 * Hono API so that:
 *
 *   1. The auth cookie travels server-to-server (the form never sees the
 *      token, mirroring the magic-link flow at `features/auth/loginActions.ts`).
 *   2. A 503 with `code: 'S1_COMPLAINT_SUBMIT_OFF'` is translated into a
 *      stable, typed error string the wrapper UI (`CompleteComposer`)
 *      can match on to render the "submissions paused" notice — parity
 *      with the mobile composer's `submissionPaused` branch.
 *
 * No anonymity invariant lives here — the action only forwards to the
 * API, which is itself the boundary that strips PII per ADR-0010.
 */

import type { CreateComplaintInput } from '@factivist/shared/validators'

import { ApiError, apiClient } from '../../lib/api/client.ts'

import { SUBMISSION_PAUSED_MESSAGE } from './composerSignals.ts'

export const createComplaintAction = async (
  input: CreateComplaintInput,
): Promise<{ readonly id: string }> => {
  try {
    return await apiClient.createComplaint(input)
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      const body = err.body as { code?: string } | undefined
      if (body?.code === 'S1_COMPLAINT_SUBMIT_OFF') {
        throw new Error(SUBMISSION_PAUSED_MESSAGE)
      }
    }
    throw err
  }
}
