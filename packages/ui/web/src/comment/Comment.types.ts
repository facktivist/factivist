/**
 * `Comment.*` compound contract — web (HeroUI v3).
 *
 * Surface: 3 — Complaint detail (threaded comments, manual-mod).
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, border,
 *   radius-md, space-2/3/4, motion.duration.fast.
 */

/** A single comment node. Flat shape; threading rendered by indentation. */
export interface Comment {
  readonly id: string
  /** Parent id, or `null` for a root comment on the complaint. */
  readonly parentId: string | null
  readonly complaintId: string
  /** Anonymous handle — never PII (ADR-010). */
  readonly authorHandle: string
  readonly body: string
  readonly createdAt: string // ISO-8601
  readonly flagged: boolean
}

// ─── Comment.Thread ───────────────────────────────────────────────────
/**
 * Threaded comment list — rendered top-down with `depth` derived by the
 * implementation from `parentId` chains.
 */
export interface CommentThreadProps {
  readonly comments: ReadonlyArray<Comment>
  readonly currentUserHandle?: string
  readonly onReply: (parentId: string | null, body: string) => void | Promise<void>
  readonly onFlag?: (commentId: string) => void
  readonly loading?: boolean
  readonly className?: string
}

export const COMMENT_SLOTS = {
  Thread: 'Comment.Thread',
} as const

export type CommentSlot = (typeof COMMENT_SLOTS)[keyof typeof COMMENT_SLOTS]
