/**
 * Comment surface — barrel. Single slot `Comment.Thread` ships in
 * the S03 detail commit. The type interface `Comment` from the types
 * file is re-exported under `CommentRecord` to avoid colliding with
 * the runtime compound namespace.
 */
export * from './Comment.tsx'
export type {
  COMMENT_SLOTS,
  Comment as CommentRecord,
  CommentSlot,
  CommentThreadProps,
} from './Comment.types.ts'
