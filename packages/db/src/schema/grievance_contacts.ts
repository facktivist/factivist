/**
 * `grievance_contacts` — DPDP §8(7)-compliant store for IT Act grievance
 * complainant PII (name + email).
 *
 * ## Why this table exists (Phase 9 §3)
 *
 * Before this migration, grievance intake (`POST /grievance`) wrote the
 * complainant's name + email into `audit_log.rationale` as a free-text
 * string and inherited the 180-day CERT-In retention. That created two
 * problems vs. India's Digital Personal Data Protection Act 2023 + DPDP
 * Rules 2025:
 *
 *   1. **Purpose-fulfilment erasure (DPDP §8(7))** — once the grievance
 *      is resolved + the human acknowledgement has gone out, the
 *      complainant's PII no longer serves a purpose. §8(7) triggers; we
 *      MUST erase, not keep for the remainder of the audit window.
 *   2. **General log retention floor (DPDP Rules 2025 Rule 8(3))** — the
 *      audit_log itself MUST be kept for **at least 1 year**, not 180
 *      days. We raise `AUDIT_LOG_RETENTION_DAYS` to 365 in the same
 *      migration set.
 *
 * The split: `audit_log` carries the immutable record-of-action with
 * `rationale = "complainant_email_sha256=<hex>"` (verifiable, non-
 * recoverable). The contact PII lives here, with an `erase_after` that
 * the daily sweep enforces.
 *
 * ## Schema invariant
 *
 *   - Primary key is `grievance_id`, mirroring `moderation_queue.id`
 *     (the row that represents the grievance once intake completes).
 *   - `resolved_at` is set when the grievance officer issues the
 *     `grievance.resolve` audit row.
 *   - `erase_after = resolved_at + 30 days`. Until `resolved_at` is set,
 *     `erase_after` is NULL → the sweep skips the row (the contact PII
 *     stays available to the human officer).
 *   - The sweep at `scripts/grievance-contacts-sweep.ts` hard-deletes any
 *     row where `erase_after < now()`. No archive — DPDP §8(7) requires
 *     erasure, not anonymisation.
 *
 * ## Legal sign-off (BLOCKED on counsel)
 *
 * The 30-day post-resolve window matches the §3 working assumption in
 * `docs/action-plans/season-1/phase-9-deferred.md`. Counsel sign-off is
 * pending; the constant `GRIEVANCE_CONTACTS_ERASE_AFTER_DAYS` is
 * exported so the window can be amended atomically in one place.
 *
 * ## Anonymity invariant (ADR-0010)
 *
 * Complainants are third parties (journalists / IT-Act applicants) —
 * NOT citizen-authors of the platform. Their name + email are stored
 * here. Citizen-side identifiers (nullifier, Aadhaar, photo bytes) MUST
 * NEVER appear in this table. Schema constraint: there is no column
 * that can carry them.
 *
 * ATIDs: AUDIT-002 (retention sweep) covers the sweep job; this table's
 * own DPDP §8(7) follow-up is tracked in Phase 9 §3 exit criteria.
 */

import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Post-resolve erasure window in days. Exposed so the sweep script and
 * the schema reference the same constant; bumping it requires only one
 * code change. DPDP §8(7) does not pin a specific number — counsel
 * confirmation pending per Phase 9 §3.
 */
export const GRIEVANCE_CONTACTS_ERASE_AFTER_DAYS = 30 as const

export const grievanceContacts = pgTable('grievance_contacts', {
  /**
   * Foreign-key to `moderation_queue.id` (the row that represents the
   * grievance once intake completes). One-to-one with the queue row.
   */
  grievanceId: text('grievance_id').primaryKey(),
  /**
   * Complainant's name as supplied at intake. May be NULL only if the
   * intake endpoint is later widened to accept anonymous complaints
   * (NOT supported in S1; ADR-0014 §"Complainant identification").
   */
  complainantName: text('complainant_name').notNull(),
  /**
   * Complainant's email. Used by the grievance officer to send the
   * statutory acknowledgement + the eventual resolution notice.
   */
  complainantEmail: text('complainant_email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  /**
   * Set when the grievance officer writes the `grievance.resolve` audit
   * row. NULL while the grievance is open.
   */
  resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  /**
   * Generated column: `resolved_at + interval '30 days'`. The daily
   * sweep hard-deletes rows where `erase_after < now()`. NULL while the
   * grievance is open → row is preserved indefinitely (officer needs
   * contact PII to do the job).
   */
  eraseAfter: timestamp('erase_after', { withTimezone: true, mode: 'date' }).generatedAlwaysAs(
    sql`resolved_at + interval '30 days'`,
  ),
})

export type GrievanceContact = typeof grievanceContacts.$inferSelect
export type NewGrievanceContact = typeof grievanceContacts.$inferInsert
