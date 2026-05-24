/**
 * Zod validators for moderation + admin write paths.
 *
 * Lives in `validators/` per the existing repo convention (matches
 * `dev-metrics.ts`, `primitives.ts`). The Phase 5 Pipeline C handoff
 * referenced `schema/moderation.ts`; we kept the existing folder name so
 * the barrel export at `packages/shared/src/validators/index.ts` stays
 * consistent.
 *
 * ## Coverage
 *
 *   - `moderationStatusSchema`     — case lifecycle enum.
 *   - `moderationReasonSchema`     — flag reasons incl. `pii-leak` (ADR-0020).
 *   - `moderationTargetKindSchema` — polymorphic target enum.
 *   - `queueItemSchema`            — admin view of one queue row (no PII).
 *   - `moderationDecisionSchema`   — POST /admin/moderation/:id/decide body.
 *   - `auditEventSchema`           — append-only `audit_log` row insert.
 *   - `grievanceIntakeSchema`      — public IT-Act grievance intake (ADR-0014).
 *
 * ## Anonymity invariants enforced here
 *
 *   - `queueItemSchema` deliberately OMITS `nullifier` / `reporterId` /
 *     `authorId` so any handler that hand-rolls a different shape fails
 *     the Zod parse on send (defence in depth alongside the explicit
 *     SELECT column list in the route handler).
 *   - `moderationDecisionSchema.rationale` is capped at 500 chars and
 *     trimmed; the route handler runs `aidefence_has_pii` before persist.
 */

import { z } from 'zod'

import { idSchema, slugSchema, timestampSchema } from './primitives.ts'

/**
 * Case lifecycle. Mirrors `moderationStatusEnum` in
 * `packages/db/src/schema/moderation_queue.ts`. Both surfaces MUST stay
 * in sync — a CI fixture asserts equality.
 */
export const moderationStatusSchema = z.enum(['pending', 'approved', 'removed', 'escalated'])
export type ModerationStatus = z.infer<typeof moderationStatusSchema>

/**
 * Flag reasons. `pii-leak` is a first-class enum value per Phase 3
 * decision D4 / ADR-0020 — NOT a subtype of `other`.
 */
export const moderationReasonSchema = z.enum([
  'defamation',
  'communal',
  'false',
  'doxxing',
  'ncii',
  'pii-leak',
  'other',
])
export type ModerationReason = z.infer<typeof moderationReasonSchema>

export const moderationTargetKindSchema = z.enum(['complaint', 'comment'])
export type ModerationTargetKind = z.infer<typeof moderationTargetKindSchema>

/**
 * Admin-facing view of one queue row. Public reads NEVER call this surface
 * (admin-only middleware filters at the route boundary).
 *
 * Note the absences:
 *   - no `nullifier` / `nullifier_ref` / `author_nullifier`
 *   - no `reporter_id` / `reporter_nullifier`
 *   - no `ip`, `user_agent`, `email`, `phone`, `aadhaar`
 *
 * These omissions are deliberate (ADR-0010, aggregates §4 I-MOD-2). The
 * matching route handler in `apps/api/src/routes/admin/moderation.ts`
 * selects only the columns listed here.
 */
export const queueItemSchema = z.object({
  id: z.string().regex(/^mq_[0-9a-f-]{36}$/, 'Must be a prefixed mq_ id'),
  complaintSlug: slugSchema,
  targetKind: moderationTargetKindSchema,
  reason: moderationReasonSchema,
  status: moderationStatusSchema,
  reviewerId: z.string().nullable(),
  slaDueAt: timestampSchema,
  decidedAt: timestampSchema.nullable(),
  rationale: z.string().max(500).nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export type QueueItem = z.infer<typeof queueItemSchema>

/**
 * Moderation decision input. Posted from the admin UI to
 * `POST /admin/moderation/:id/decide`. The route handler maps `approve`
 * → status `approved`, `remove` → `removed`, `escalate` → `escalated`.
 */
export const moderationDecisionSchema = z.object({
  decision: z.enum(['approve', 'remove', 'escalate']),
  rationale: z
    .string()
    .trim()
    .min(1, 'Rationale is required')
    .max(500, 'Rationale must be ≤ 500 characters'),
})
export type ModerationDecision = z.infer<typeof moderationDecisionSchema>

/**
 * `audit_log` insert payload. Used by the route handler to construct an
 * append-only audit row inside the same transaction as the business
 * write (aggregates §4 I-MOD-3, X-7).
 */
export const auditEventSchema = z.object({
  actor: idSchema.or(z.string().min(1).max(128)),
  action: z.enum([
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
  ]),
  targetKind: z.enum([
    'complaint',
    'comment',
    'moderation_case',
    'grievance',
    'feature_flag',
    'admin',
  ]),
  targetId: z.string().min(1).max(128),
  payloadHash: z.string().regex(/^[0-9a-f]{64}$/i, 'payloadHash must be a 64-char hex SHA-256'),
  rationale: z.string().max(500).optional(),
})
export type AuditEvent = z.infer<typeof auditEventSchema>

/**
 * Public IT-Act grievance intake. Posted from `/legal/grievance` on the
 * web app. SLA timers start at the moment this is accepted by the API
 * (24h ack / 36h takedown / 24h NCII — ADR-0014).
 */
export const grievanceIntakeSchema = z.object({
  /**
   * Public grievance contact — explicitly NOT a citizen identifier.
   * The complainant is a third party (journalist, target of allegedly
   * unlawful content, etc.), not a citizen-author of the platform.
   */
  complainantName: z.string().trim().min(1).max(120),
  complainantEmail: z.email().max(254),
  /**
   * Target identifier. Either a complaint slug or a comment UUID.
   * The route handler resolves which kind it is and dispatches accordingly.
   */
  targetRef: z.string().min(1).max(128),
  reason: moderationReasonSchema,
  body: z.string().trim().min(20, 'Grievance body must be ≥ 20 chars').max(5000),
})
export type GrievanceIntake = z.infer<typeof grievanceIntakeSchema>
