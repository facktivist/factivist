/**
 * `audit_log` — append-only operator action log.
 *
 * ## Why this table exists
 *
 *   - ADR-0014: Grievance Officer needs a defensible record of every
 *     takedown / approval / escalation within the 24h/36h SLA windows.
 *   - ADR-0015: CERT-In direction (28 April 2022) mandates 180 days of
 *     system-log retention, hosted within India (Supabase ap-south-1).
 *   - Aggregates §4 I-MOD-3 + Cross-aggregate X-7: every admin write
 *     (`Decide`, `Enable/DisableFlag`, `Grant/RevokeAdmin`) MUST emit
 *     one audit row in the same transaction as the business write.
 *
 * ## Append-only invariant
 *
 * The application code NEVER updates or deletes rows. There is no
 * `updatedAt`. No row holds a mutable field. UPDATE / DELETE privileges
 * are revoked at the role level by the migration that follows.
 *
 * Retention beyond 180 days is enforced by a scheduled `DELETE FROM
 * audit_log WHERE ts < now() - interval '180 days'` per ADR-0015. This
 * is the ONLY DELETE the schema authorises.
 *
 * ## Anonymity invariant (ADR-0010, X-1)
 *
 *   - `actor` is the Supabase Auth `user_id` of the **admin** — operators
 *     are identified; citizens are not.
 *   - `targetKind` / `targetId` reference the artifact (complaint slug,
 *     comment UUID, moderation case id). They MUST NOT carry a citizen
 *     nullifier, name, Aadhaar, IP, or photo bytes.
 *   - `payloadHash` is a SHA-256 of the request body — the body itself
 *     is NOT stored, so a leaked audit row cannot be replayed against the
 *     anonymity floor.
 *
 * ## Schema convention
 *
 *   - Prefixed text PK (`al_<uuid>`).
 *   - Indexed on `(actor, ts)` for "show me what admin X did" and on
 *     `(targetKind, targetId)` for "show me everything that happened to
 *     case Y" — the two queries the grievance officer actually runs.
 */

import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { createId } from './_helpers.ts'

/**
 * Action enum. Extended sparingly — each new value implies a new write
 * path that must be audited end-to-end.
 */
export const auditActionEnum = pgEnum('audit_action', [
  'moderation.decide',
  'moderation.escalate',
  'moderation.claim',
  'moderation.release',
  'grievance.acknowledge',
  'grievance.resolve',
  'feature_flag.enable',
  'feature_flag.disable',
  'admin.grant',
  'admin.revoke',
  /**
   * `identity.prove_attempt` — the ONE non-operator action that lives in
   * this table. Server-side ZKP proving is the only citizen-facing write
   * path that needs an immutable trail per identity-wiring.md §5.2 +
   * zkp-key-custody.md §Server-side fallback rule #6 ("record outcome,
   * never inputs"). The actor is the literal string `'anonymous'` and
   * the `targetId` is an opaque request UUID — NEVER a citizen
   * identifier — so the I-MOD-3 anonymity invariant holds.
   */
  'identity.prove_attempt',
])

export const auditTargetKindEnum = pgEnum('audit_target_kind', [
  'complaint',
  'comment',
  'moderation_case',
  'grievance',
  'feature_flag',
  'admin',
  /**
   * `session` — opaque per-request audit anchor for `identity.prove_attempt`.
   * The `targetId` is a UUID generated inside the route, not derived from
   * the witness or the citizen.
   */
  'session',
])

export const auditLog = pgTable(
  'audit_log',
  {
    id: text().primaryKey().$defaultFn(createId('al')),
    /**
     * Supabase Auth `user_id` of the acting admin. NEVER a citizen
     * identifier — citizens have no JWT subject; they have a nullifier
     * that this table is forbidden from touching.
     */
    actor: text().notNull(),
    action: auditActionEnum().notNull(),
    targetKind: auditTargetKindEnum().notNull(),
    targetId: text().notNull(),
    /**
     * SHA-256 of the canonical-JSON request body, hex-encoded. Lets the
     * grievance officer prove "this exact payload was submitted" without
     * the table itself holding citizen-facing content.
     */
    payloadHash: text().notNull(),
    /**
     * Optional human-readable rationale captured from the admin UI. Same
     * PII rule as `moderation_queue.rationale` — `aidefence_has_pii`
     * scans before persist (X-1).
     */
    rationale: text(),
    ts: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_by_actor').on(table.actor, table.ts),
    index('audit_log_by_target').on(table.targetKind, table.targetId, table.ts),
    /**
     * CERT-In housekeeping: the 180-day sweep filters on `ts`; a btree
     * index keeps the daily delete sub-second.
     */
    index('audit_log_by_ts').on(table.ts),
  ],
)

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert

/**
 * Audit-log retention in days. The number reflects the **stricter** of the
 * two regimes that apply to Factivist's audit_log:
 *
 *   - CERT-In direction 20(3)/2022-CERT-In (28 April 2022): 180 days floor
 *     for system logs hosted within India (ADR-0015).
 *   - DPDP Rules 2025 Rule 8(3): **1 year minimum** for personal-data
 *     processing logs (even post account deletion).
 *
 * 365 days is the joint floor. Bumped from 180 → 365 as part of Phase 9
 * §3 (grievance_contacts split) on 2026-05-25 — counsel sign-off on the
 * joint reading is still pending; if counsel rejects, the constant moves
 * to the new floor in one place.
 *
 * Complainant PII no longer lives in this table — see
 * `grievance_contacts.ts`. The audit row carries
 * `rationale = "complainant_email_sha256=<hex>"` so the audit trail
 * remains immutable and verifiable, but the contact details can be
 * erased per DPDP §8(7) on their own 30-day post-resolve clock without
 * disturbing the 365-day audit floor.
 */
export const AUDIT_LOG_RETENTION_DAYS = 365 as const
