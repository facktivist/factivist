import { index, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { createId } from './_helpers.ts'
import { citizens } from './citizens.ts'
import { complaints } from './complaints.ts'

/**
 * `complaint_flags` — reporter-facing flag table that feeds the
 * moderation queue.
 *
 * A flag is conceptually a **child** of the `ModerationCase` aggregate
 * (`aggregates.md` §7) but is stored separately because:
 *
 *   1. The reporter identity (`reporterId`) MUST NEVER surface in a
 *      moderation response — admins see flag *counts* + *reasons*, not
 *      reporter identities (I-MOD-2). Keeping reporters in their own
 *      table means the moderation route can `select()` from
 *      `moderation_queue` without risk of accidentally projecting a
 *      reporter column.
 *
 *   2. The natural one-open-case-per-target constraint (I-MOD-natural-key)
 *      lives on `moderation_queue`, not here. A single complaint can
 *      legitimately accumulate many flag rows; the queue absorbs them
 *      into one case.
 *
 * ## Reasons (Phase 3 D4 / [[ADR-020]])
 *
 * The enum lists `pii-leak` FIRST — the UI in `apps/web` reads
 * `FLAG_REASONS` from `@factivist/shared/validators` (same order), so
 * the database and the picker stay aligned. Adding a new reason MUST
 * happen in both places + the moderation `reason` enum in one migration.
 *
 * ## Anonymity invariant — what this table MUST NOT carry
 *
 * - Reporter's `nullifier` (FK to `citizens.id` only, never the hex
 *   nullifier itself).
 * - Reporter IP / user-agent / device fingerprint.
 * - Complaint author's identity (the FK to `complaints` is by `slug` —
 *   `author_id` is reachable via a join but the route projects only
 *   counts + reasons to admins; the author is identifiable only via
 *   the same `Handle` rule as complaints).
 *
 * Aggregation back to the queue is the route handler's responsibility
 * (insert flag → upsert moderation queue case). That cross-aggregate
 * write happens in `apps/api/src/routes/complaint.ts` under one
 * transaction so the queue and flag counts stay consistent.
 */
export const flagReasonEnum = pgEnum('complaint_flag_reason', [
  'pii-leak',
  'harassment',
  'misinformation',
  'spam',
  'off-topic',
])

export const complaintFlags = pgTable(
  'complaint_flags',
  {
    id: text().primaryKey().$defaultFn(createId('fl')),
    /** FK to the complaint slug (ADR-0012 slug PK on `complaints`). */
    complaintSlug: text()
      .notNull()
      .references(() => complaints.slug, { onDelete: 'cascade' }),
    /**
     * FK to `citizens.id` — only verified citizens can flag. The raw
     * nullifier is NEVER stored here.
     */
    reporterId: text()
      .notNull()
      .references(() => citizens.id, { onDelete: 'restrict' }),
    reason: flagReasonEnum().notNull(),
    /** Optional free-text note (≤ 500 chars at the Zod boundary). */
    note: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * Hot path: aggregate flag counts per complaint when rendering
     * `flagCount` on the public surface.
     */
    index('complaint_flags_by_complaint').on(table.complaintSlug),
    /**
     * One flag per (reporter, complaint) — re-clicking "Flag" is a noop
     * at the DB level. Re-flagging with a different reason is permitted
     * via the UI (it submits an update path) but at S1 we treat duplicates
     * as idempotent and the UNIQUE constraint guards against spam.
     */
    uniqueIndex('complaint_flags_one_per_reporter').on(table.complaintSlug, table.reporterId),
  ],
)

export type ComplaintFlag = typeof complaintFlags.$inferSelect
export type NewComplaintFlag = typeof complaintFlags.$inferInsert
