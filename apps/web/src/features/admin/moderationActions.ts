'use server'

/**
 * Server actions for the admin moderation workflow.
 *
 * Co-located in `features/admin/` so the form component and its action
 * stay reviewable in one folder. Each action:
 *
 *   1. Re-resolves the server session — never trusts a client-supplied
 *      role. Redirects to `/` if the session is missing (admin layout
 *      would already have done this, but a server action can be called
 *      out-of-band via `bind`).
 *   2. Re-validates the input against the canonical Zod schema. The
 *      client component already does a `safeParse` for UX; this is the
 *      authoritative parse for security.
 *   3. Forwards the call through the API client with the session token.
 *   4. Returns a discriminated-union result so the form can render a
 *      typed error without throwing.
 */

import { moderationDecisionSchema } from '@factivist/shared/validators'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ApiError, apiClient } from '../../lib/api/client.ts'
import { getServerSession } from '../../lib/auth/server.ts'

export type DecisionActionResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: 'unauthorized' | 'validation' | 'already_decided' | 'network'
      readonly message: string
    }

export const submitModerationDecision = async (
  caseId: string,
  rawInput: unknown,
): Promise<DecisionActionResult> => {
  const session = await getServerSession()
  if (!session) {
    return {
      ok: false,
      code: 'unauthorized',
      message: 'Your session has expired. Sign in again.',
    }
  }

  const parsed = moderationDecisionSchema.safeParse(rawInput)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      ok: false,
      code: 'validation',
      message: first?.message ?? 'Invalid decision payload.',
    }
  }

  try {
    await apiClient.decideModeration(session.token, caseId, parsed.data)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return {
        ok: false,
        code: 'already_decided',
        message: 'This case has already been decided by another operator.',
      }
    }
    if (err instanceof ApiError && err.status === 401) {
      return {
        ok: false,
        code: 'unauthorized',
        message: 'Your session was rejected by the API.',
      }
    }
    return {
      ok: false,
      code: 'network',
      message: err instanceof Error ? err.message : 'Network error while submitting decision.',
    }
  }

  // Success path: refresh the queue cache, redirect back. `redirect()`
  // throws a Next.js control-flow exception, so the function never
  // returns the `{ ok: true }` literal at runtime — the return type is
  // for the form's TypeScript inference only.
  revalidatePath('/admin/moderation')
  redirect('/admin/moderation')
}
