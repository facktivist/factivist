/**
 * Comment thread validators — Phase 5 wave 4.
 *
 * Source of truth for the shape both `apps/api`'s comment routes and
 * the `Comment.Thread` compound consume. `body` length cap mirrors
 * `COMMENT_BODY_MAX` from `@factivist/db/schema`; we duplicate the
 * literal here so the shared package stays Zod-only with zero
 * @factivist/db dependency.
 */

import { z } from 'zod'

/** Mirror of `COMMENT_BODY_MAX` in `@factivist/db/schema`. */
export const COMMENT_BODY_LIMIT = 2000 as const

export const createCommentInputSchema = z.object({
  complaintSlug: z.string().min(1, 'complaintSlug is required.'),
  parentId: z.string().min(1).optional(),
  body: z
    .string()
    .trim()
    .min(1, 'Comment body is required.')
    .max(COMMENT_BODY_LIMIT, `Comment too long (max ${COMMENT_BODY_LIMIT}).`),
})

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>

/**
 * Comment DTO shipped over the wire. Identical shape to the
 * `Comment` interface the `Comment.Thread` compound expects from
 * `@factivist/ui-{web,native}/comment`.
 *
 *   - `complaintId` is the parent complaint's slug (matches the
 *     compound's `complaintId` property — it's named after the
 *     content addressable id, regardless of which column backs it).
 *   - `authorHandle` is the deriveHandle output (anonymous);
 *     never the raw nullifier.
 */
export interface CommentDto {
  readonly id: string
  readonly parentId: string | null
  readonly complaintId: string
  readonly authorHandle: string
  readonly body: string
  readonly createdAt: string
  readonly flagged: boolean
}

export interface CommentListResponse {
  readonly items: ReadonlyArray<CommentDto>
}
