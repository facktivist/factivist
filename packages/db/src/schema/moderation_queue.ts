/**
 * `moderation_queue` — manual moderation worklist (Postgres-only, per ADR-0006).
 *
 * No Redis, no Bull, no queue worker. Moderators poll via Hono and atomically
 * claim items with `SELECT … FOR UPDATE SKIP LOCKED`.
 *
 * ## Anonymity invariants (CRITICAL — ADR-0010 + aggregates §4 I-MOD-2)
 *
 * This table MUST NOT carry a citizen `nullifier`, IP, user-agent, Aadhaar,
 * legal name, photo bytes, or any direct identifier. The moderation operator
 * surface routinely deanonymises in lesser systems; here the schema makes
 * deanonymisation **impossible** because the citizen-identifying columns
 * simply do not exist. Reporter / author identity surfaces to admins only
 * via opaque `Handle` joined at read time — never via FK to `citizens`.
 *
 * Route handlers MUST select explicit columns when reading this table; a
 * naive `select().from(moderationQueue)` cannot leak `nullifier_ref` because
 * `nullifier_ref` is absent by design.
 *
 * ## SLA windows (ADR-0014 + ADR-0020 + aggregates §4 I-MOD-4)
 *
 * `slaDueAt` is computed at insert time from the *primary* `reason`:
 *   - `ncii`        → 24 h   (ADR-0014)
 *   - `pii-leak`    → 24 h   (ADR-0020 / Phase 3 D4)
 *   - `defamation`  → 24 h   (Factivist house policy, ATID-LEGAL-013)
 *   - `communal`    → 24 h   (Factivist house policy)
 *   - all others    → 36 h   (Rule 3(1)(d) ceiling, ATID-MOD-003)
 *
 * Tightening (later flag with shorter SLA) is allowed; relaxing is not.
 *
 * ## Decision atomicity (aggregates §4 I-MOD-3)
 *
 * A `status` transition into `removed`/`approved` and the target
 * `Complaint.status` update MUST be one transaction — enforced in the route
 * handler, NOT in the schema.
 *
 * ## Schema convention (matches `users` table)
 *
 *   - Plural snake_case table name.
 *   - Prefixed text PK (`mq_<uuid>`) — Stripe-style, consistent with `users`.
 *     Slug-style URL PKs (ADR-0012) apply to human-facing entities only;
 *     moderation cases are admin-internal and use prefixed text IDs.
 *   - `complaintSlug` is a text FK to `complaints.slug` (per ADR-0012);
 *     constraint will be wired when the `complaints` table lands in the
 *     complaint context. Index ensures fast lookup either way.
 *   - `reviewerId` is a text FK to `admins.id` (Supabase Auth user_id);
 *     constraint will be wired when the `admins` table lands.
 */

import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { createId } from './_helpers.ts'

/**
 * Moderation case status. `pending` is the queue entry state; `approved`
 * keeps the target visible; `removed` retires it; `escalated` routes to
 * legal/grievance officer per ADR-0014 actual-knowledge protocol.
 */
export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'removed',
  'escalated',
])

/**
 * Flag reason. `pii-leak` is a first-class enum value per Phase 3 decision
 * D4 / ADR-0020 (NOT a synthetic subtype of `other`).
 */
export const moderationReasonEnum = pgEnum('moderation_reason', [
  'defamation',
  'communal',
  'false',
  'doxxing',
  'ncii',
  'pii-leak',
  'other',
])

/**
 * Polymorphic target kind. Application-layer enforced — Postgres has no
 * native polymorphic FK (aggregates §7 I-FLAG note).
 */
export const moderationTargetKindEnum = pgEnum('moderation_target_kind', ['complaint', 'comment'])

export const moderationQueue = pgTable(
  'moderation_queue',
  {
    id: text().primaryKey().$defaultFn(createId('mq')),
    /**
     * FK to `complaints.slug` (ADR-0012 slug PK). Stored as text; the FK
     * constraint is added by the migration that introduces `complaints`.
     */
    complaintSlug: text().notNull(),
    targetKind: moderationTargetKindEnum().notNull().default('complaint'),
    reason: moderationReasonEnum().notNull(),
    status: moderationStatusEnum().notNull().default('pending'),
    /**
     * Supabase Auth user_id of the admin who claimed/decided the case.
     * Null while `status='pending'`. FK to `admins.id` is added by the
     * migration that introduces the `admins` table.
     */
    reviewerId: text(),
    /**
     * Wall-clock SLA deadline computed at insert from `reason` per
     * ADR-0014 + ADR-0020. Tighter later flags update this (see decide
     * handler); relaxation is rejected.
     */
    slaDueAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    decidedAt: timestamp({ withTimezone: true, mode: 'date' }),
    /**
     * Free-text rationale recorded with every decision. PII MUST NOT be
     * pasted here; the admin form re-runs `aidefence_has_pii` before
     * persistence (X-1 cross-aggregate invariant).
     */
    rationale: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    /**
     * Hot path: `GET /admin/moderation?status=pending` orders by `sla_due_at`
     * ascending so the most urgent cases surface first. Composite index
     * keeps the scan small even at full S1 queue depth.
     */
    index('moderation_queue_by_status_sla').on(table.status, table.slaDueAt),
    index('moderation_queue_by_complaint_slug').on(table.complaintSlug),
    /**
     * One open case per (target_kind, complaint_slug) — additional flags
     * attach to the existing case rather than spawning duplicates
     * (aggregates §4 natural-key rule).
     */
    uniqueIndex('moderation_queue_open_case_unique')
      .on(table.targetKind, table.complaintSlug)
      .where(sql`status = 'pending'`),
  ],
)

export type ModerationQueueItem = typeof moderationQueue.$inferSelect
export type NewModerationQueueItem = typeof moderationQueue.$inferInsert

/**
 * Compute the SLA deadline for a given reason. Pure function so handlers
 * and tests share one source of truth (ADR-0014 + ADR-0020 + aggregates §4).
 */
export const computeSlaDueAt = (reason: ModerationQueueItem['reason'], from: Date): Date => {
  const hours =
    reason === 'ncii' || reason === 'pii-leak' || reason === 'defamation' || reason === 'communal'
      ? 24
      : 36
  return new Date(from.getTime() + hours * 60 * 60 * 1000)
}
