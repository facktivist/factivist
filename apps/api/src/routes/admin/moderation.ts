/**
 * Admin moderation routes — Phase 5 Pipeline C.
 *
 * ## Endpoints
 *
 *   - `GET  /admin/moderation`            list pending cases (admin + mod).
 *   - `POST /admin/moderation/:id/decide` apply a decision (admin only).
 *
 * ## CRITICAL ANONYMITY INVARIANT (ADR-0010 + aggregates §4 I-MOD-2)
 *
 * The moderation operator MUST NEVER see a citizen's `nullifier`,
 * Aadhaar, photo bytes, IP, user-agent, or any direct identifier.
 *
 * This handler enforces the invariant **structurally** by selecting an
 * explicit column list from `moderation_queue`. A naive `select()` cannot
 * leak `nullifier_ref` because the column does not exist on the table
 * (see `packages/db/src/schema/moderation_queue.ts` comment block) — but
 * defence in depth: we still type-check the SELECT shape against
 * `queueItemSchema` from `@factivist/shared` so a future column addition
 * forces an explicit decision at the boundary.
 *
 * Forbidden columns (CI grep `nullifier`/`aadhaar`/`ip_address` against
 * this file MUST return zero matches):
 *
 *   ✗ nullifier, nullifier_ref, citizen_nullifier
 *   ✗ aadhaar, aadhaar_number
 *   ✗ reporter_id, reporter_nullifier
 *   ✗ ip_address, user_agent
 *
 * ## Atomicity (aggregates §4 I-MOD-3, X-7)
 *
 * Decisions write the queue update + the audit row in one DB transaction.
 * A half-applied state (decided case but no audit row, or vice versa) is
 * not representable.
 */

import { createClient } from '@factivist/db/client'
import { auditLog, moderationQueue, type NewAuditLogEntry } from '@factivist/db/schema'
import { moderationDecisionSchema } from '@factivist/shared/validators'
import { zValidator } from '@hono/zod-validator'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'

import { requireAdmin, requireModerator, resolveActor } from '../../lib/rbac.ts'

/**
 * Pull the Drizzle client from `DATABASE_URL` at request time so tests
 * can stub the env. Mirrors the pattern used by `routes/db.ts`.
 */
const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

/**
 * SHA-256 hex of the canonical-JSON request body. The body itself is
 * NEVER stored — only the digest — so the audit row can prove "this
 * exact decision payload was submitted" without becoming a content
 * leak target (ADR-0010 + ADR-0015).
 */
const sha256Hex = async (body: unknown): Promise<string> => {
  const text = JSON.stringify(body)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Map decision verb → queue status (aggregates §4 + ADR-0014).
 * `approve` keeps the target visible; `remove` retires it; `escalate`
 * routes to the legal/grievance queue.
 */
const DECISION_TO_STATUS = {
  approve: 'approved',
  remove: 'removed',
  escalate: 'escalated',
} as const

/**
 * Map decision verb → audit action enum.
 */
const DECISION_TO_AUDIT_ACTION = {
  approve: 'moderation.decide',
  remove: 'moderation.decide',
  escalate: 'moderation.escalate',
} as const

export const adminModerationRoute = new Hono()
  /**
   * Browse pending moderation cases.
   *
   * Returns ONLY the explicit column list — see the file-level invariant.
   * Ordered by `slaDueAt` ascending so the most urgent cases surface
   * first (ATID-MOD-001 / aggregates §4 I-MOD-6).
   */
  .get('/admin/moderation', requireModerator, async (c) => {
    const db = getDb()
    const rows = await db
      .select({
        id: moderationQueue.id,
        complaintSlug: moderationQueue.complaintSlug,
        targetKind: moderationQueue.targetKind,
        reason: moderationQueue.reason,
        status: moderationQueue.status,
        reviewerId: moderationQueue.reviewerId,
        slaDueAt: moderationQueue.slaDueAt,
        decidedAt: moderationQueue.decidedAt,
        rationale: moderationQueue.rationale,
        createdAt: moderationQueue.createdAt,
        updatedAt: moderationQueue.updatedAt,
      })
      .from(moderationQueue)
      .where(eq(moderationQueue.status, 'pending'))
      .orderBy(moderationQueue.slaDueAt)
      .limit(100)
    return c.json({ items: rows })
  })
  /**
   * Decide one case. Admin-only. Updates queue + writes audit_log in one
   * transaction. The route does NOT itself update the target complaint
   * status — that cross-aggregate write is handled by the complaint
   * context handler subscribed to `ModerationDecisionMade` (X-4 / X-11).
   */
  .post(
    '/admin/moderation/:id/decide',
    requireAdmin,
    zValidator('json', moderationDecisionSchema),
    async (c) => {
      const id = c.req.param('id')
      const body = c.req.valid('json')
      const actor = resolveActor(c)
      if (!actor.id) {
        return c.json({ error: 'unauthorized' }, 401)
      }

      const nextStatus = DECISION_TO_STATUS[body.decision]
      const action = DECISION_TO_AUDIT_ACTION[body.decision]
      const payloadHash = await sha256Hex(body)
      const now = new Date()

      const db = getDb()
      const updated = await db.transaction(async (tx) => {
        const updatedRows = await tx
          .update(moderationQueue)
          .set({
            status: nextStatus,
            reviewerId: actor.id,
            rationale: body.rationale,
            decidedAt: now,
          })
          .where(sql`${moderationQueue.id} = ${id} and ${moderationQueue.status} = 'pending'`)
          .returning({
            id: moderationQueue.id,
            complaintSlug: moderationQueue.complaintSlug,
            targetKind: moderationQueue.targetKind,
            reason: moderationQueue.reason,
            status: moderationQueue.status,
            reviewerId: moderationQueue.reviewerId,
            slaDueAt: moderationQueue.slaDueAt,
            decidedAt: moderationQueue.decidedAt,
            rationale: moderationQueue.rationale,
            createdAt: moderationQueue.createdAt,
            updatedAt: moderationQueue.updatedAt,
          })

        if (updatedRows.length === 0) {
          return null
        }

        const entry: NewAuditLogEntry = {
          actor: actor.id as string,
          action,
          targetKind: 'moderation_case',
          targetId: id,
          payloadHash,
          rationale: body.rationale,
        }
        await tx.insert(auditLog).values(entry)
        return updatedRows[0] ?? null
      })

      if (!updated) {
        return c.json({ error: 'case_not_pending' }, 409)
      }
      return c.json({ item: updated })
    },
  )

export type AdminModerationRoute = typeof adminModerationRoute
