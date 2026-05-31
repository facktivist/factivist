/**
 * Shared sentinels for the compose flow.
 *
 * Kept in a NON-`'use server'` module so `createComplaintAction.ts`
 * (which must export only async functions per Next.js Server Action
 * rules) can re-throw a typed error message and the client shell can
 * match on it without crossing the server-action boundary for the
 * constant itself.
 */

/**
 * Error message thrown by `createComplaintAction` when the API returns
 * 503 with `code: 'S1_COMPLAINT_SUBMIT_OFF'`. The `<ComposerShell />`
 * client component matches on this exact value to render the
 * "submissions paused" notice — parity with the mobile composer's
 * `submissionPaused` branch.
 */
export const SUBMISSION_PAUSED_MESSAGE = 'S1_COMPLAINT_SUBMIT_OFF' as const
