/**
 * `Comment.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mobile deltas vs web:
 *   - Reply composer is keyboard-aware and pops up from the bottom (sheet).
 *   - Long-press on a comment surfaces flag/copy via a native action sheet.
 *   - `style` + `accessibilityLabel` + `testID` via `NativeProps`.
 */

export interface Comment {
  readonly id: string
  readonly parentId: string | null
  readonly complaintId: string
  readonly authorHandle: string
  readonly body: string
  readonly createdAt: string
  readonly flagged: boolean
}

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface CommentThreadProps extends NativeProps {
  readonly comments: ReadonlyArray<Comment>
  readonly currentUserHandle?: string
  readonly onReply: (parentId: string | null, body: string) => void | Promise<void>
  readonly onFlag?: (commentId: string) => void
  readonly loading?: boolean
}

export const COMMENT_SLOTS = {
  Thread: 'Comment.Thread',
} as const

export type CommentSlot = (typeof COMMENT_SLOTS)[keyof typeof COMMENT_SLOTS]
