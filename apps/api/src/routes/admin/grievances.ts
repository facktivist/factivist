/**
 * Admin grievance inbox browse route — Phase 5 Pipeline C wave 3.
 *
 * ## Endpoint
 *
 *   - `GET /admin/grievances`   admin only — lists OPEN grievances
 *                               (status='pending') ordered by SLA deadline
 *                               ascending so the soonest-due appear first.
 *
 * ## Why this lives next to `grievance.ts` (singular)
 *
 * `grievance.ts` holds the public `POST /grievance` intake (a third party
 * files the complaint). This file holds the admin browse path that
 * surfaces those intake rows to the named Grievance Officer. The naming
 * follows the moderation pair (`moderation.ts` holds both the browse and
 * decide endpoints for `moderationQueue`), but grievance is split across
 * two files because the public POST and the admin GET have different
 * trust boundaries and benefit from being independently auditable.
 *
 * ## CRITICAL anonymity / minimisation invariant (ADR-0014 + ADR-0016)
 *
 * The grievance is stored as a `moderation_queue` row with
 * `targetKind='complaint'` (see `routes/admin/grievance.ts` intake handler).
 * The complainant's name + email live ONLY in the synchronously-written
 * `audit_log.rationale` row — they are NOT columns on `moderation_queue`.
 *
 * This handler MUST NEVER project `complainantName` or `complainantEmail`
 * — the admin browse surface only carries the operational metadata the
 * Grievance Officer needs (id, complaintSlug, reason, status, slaDueAt,
 * createdAt). Complainant contact is reachable via the audit surface, by
 * targetKind+targetId, where the personal data lives with the operator
 * audit trail rather than the queue read path (DPDP §16 minimisation).
 *
 * Forbidden tokens (CI grep `nullifier`/`aadhaar`/`ip_address` against
 * this file MUST return zero matches):
 *
 *   - nullifier, aadhaar, ip_address, user_agent
 *
 * `complainantName` / `complainantEmail` are NOT on the moderation_queue
 * table at all, so they cannot be selected — defence in depth via
 * explicit projection nonetheless.
 *
 * ## Filter
 *
 * S1 ships a single-status inbox (`status='pending'`). Resolved /
 * escalated grievances are visible through the audit log surface and a
 * future `?status=` filter is reserved for later phases.
 */

import { createClient } from '@factivist/db/client'
import { moderationQueue } from '@factivist/db/schema'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'

import { requireAdmin } from '../../lib/rbac.ts'

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

/**
 * Grievance intake writes `targetKind='complaint'` per the intake handler.
 * The browse path narrows on `reason` IN the IT-Act fast-track set so the
 * Grievance Officer inbox doesn't double-count routine flag-for-moderation
 * cases (those are handled by the parallel `/admin/moderation` surface).
 *
 * Reasons in this set match `computeSlaDueAt`'s 24h fast-track plus the
 * 36h Rule 3(1)(d) ceiling cases that the IT Rules treat as grievances
 * (anything POSTed via `/grievance` becomes one of these).
 */
const GRIEVANCE_REASONS = [
  'ncii',
  'pii-leak',
  'defamation',
  'communal',
  'doxxing',
  'false',
  'other',
] as const

export const adminGrievancesRoute = new Hono().get('/admin/grievances', requireAdmin, async (c) => {
  const db = getDb()
  const rows = await db
    .select({
      id: moderationQueue.id,
      complaintSlug: moderationQueue.complaintSlug,
      reason: moderationQueue.reason,
      status: moderationQueue.status,
      slaDueAt: moderationQueue.slaDueAt,
      createdAt: moderationQueue.createdAt,
    })
    .from(moderationQueue)
    .where(
      and(
        eq(moderationQueue.status, 'pending'),
        inArray(moderationQueue.reason, GRIEVANCE_REASONS as unknown as string[]),
      ),
    )
    .orderBy(asc(moderationQueue.slaDueAt))
    .limit(100)

  /**
   * Serialise timestamps as ISO strings to match the
   * `ApiGrievanceSummary.{slaDueAt,createdAt}: string` contract on the
   * web client.
   */
  const items = rows.map((row) => ({
    id: row.id,
    complaintSlug: row.complaintSlug,
    reason: row.reason,
    status: row.status,
    slaDueAt: row.slaDueAt instanceof Date ? row.slaDueAt.toISOString() : String(row.slaDueAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }))

  return c.json({ items })
})

export type AdminGrievancesRoute = typeof adminGrievancesRoute
