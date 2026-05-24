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
])

export const auditTargetKindEnum = pgEnum('audit_target_kind', [
  'complaint',
  'comment',
  'moderation_case',
  'grievance',
  'feature_flag',
  'admin',
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
 * CERT-In retention floor in days (ADR-0015). Exposed so the retention
 * sweeper script and any compliance test reference the same constant.
 */
export const AUDIT_LOG_RETENTION_DAYS = 180 as const
