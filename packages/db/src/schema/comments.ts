/**
 * `comments` — threaded discussion under a complaint.
 *
 * Driven by Phase 5 wave 4 mobile-detail screen + the existing
 * `Comment.Thread` compound in `@factivist/ui-{web,native}/comment`.
 *
 * ## Anonymity invariants ([[ADR-010]])
 *
 *   - The row stores `author_id` (FK → `citizens.id`), never the raw
 *     `nullifier`, IP, user-agent, or session cookie. Public reads MUST
 *     project `author_handle` (derived in code via
 *     `@factivist/shared#deriveHandle`), never `author_id`.
 *   - `body` is plain text (no markdown injection at the schema level —
 *     the API + the compound both render as plain text per the
 *     `Comment.Thread` compound contract).
 *
 * ## Threading
 *
 * Flat table; threading is a `(id, parent_id)` adjacency list. The
 * compound derives the tree client-side (depth-capped at 4 for layout
 * sanity). `parent_id` either references a sibling comment on the same
 * complaint or NULL for a top-level comment.
 *
 * ## RLS posture (matches the rest of the citizen-content tables)
 *
 *   - RLS enabled at the table level (migration 0006).
 *   - Anon SELECT policy gated on the parent complaint being
 *     `status='published'` AND the comment itself not being flagged
 *     for review (`flagged=false`).
 *   - All writes flow through apps/api with the service-role key.
 *
 * ## Indexes
 *
 *   - `comments_by_complaint` on `(complaint_slug, created_at)` —
 *     the only access pattern (the detail screen pulls comments for
 *     one complaint, ordered chronologically).
 *   - `comments_by_parent` on `parent_id` — for client-side tree
 *     reconstruction at scale (S2+ when threads grow).
 */

import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { createId } from './_helpers.ts'
import { citizens } from './citizens.ts'
import { complaints } from './complaints.ts'

export const comments = pgTable(
  'comments',
  {
    id: text().primaryKey().$defaultFn(createId('cmt')),
    /** Parent comment id, or `null` for a top-level comment on the complaint. */
    parentId: text('parent_id'),
    /** Foreign key to the complaint's slug PK ([[ADR-012]]). */
    complaintSlug: text('complaint_slug')
      .notNull()
      .references(() => complaints.slug, { onDelete: 'cascade' }),
    /**
     * Author identifier — FK to `citizens.id` (the `cit_<uuid>` row,
     * NOT the nullifier). Public reads project `author_handle` derived
     * in code from `citizens.nullifier` via `deriveHandle`.
     */
    authorId: text('author_id')
      .notNull()
      .references(() => citizens.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    flagged: text('flagged_state', { enum: ['ok', 'flagged'] })
      .notNull()
      .default('ok'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('comments_by_complaint').on(table.complaintSlug, table.createdAt),
    index('comments_by_parent').on(table.parentId),
  ],
)

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert

/**
 * Maximum body length — mirrors the compound's textarea maxLength.
 * Source of truth for the Zod validator that lives in
 * `@factivist/shared/validators`.
 */
export const COMMENT_BODY_MAX = 2000 as const
