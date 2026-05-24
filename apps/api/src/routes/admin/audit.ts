/**
 * Admin audit-log browse route — Phase 5 Pipeline C wave 3.
 *
 * ## Endpoint
 *
 *   - `GET /admin/audit-log`   admin only — browse the append-only operator
 *                              audit trail with optional date / actor / action
 *                              / targetKind filters and page-based paging.
 *
 * ## CRITICAL ANONYMITY INVARIANT (ADR-0010 + aggregates §4 I-MOD-2)
 *
 * The audit log NEVER stores a citizen identifier — the schema makes this
 * structurally true (`packages/db/src/schema/audit_log.ts` `actor` is a
 * Supabase Auth user_id, `targetId` references an artifact, NEVER a
 * citizen). This handler enforces defence-in-depth by selecting an
 * **explicit column list** from `audit_log`. Forbidden tokens — checked
 * by `scripts/anonymity-grep-guard.sh` against this file — MUST NOT
 * appear in this handler's code outside line or block comments.
 *
 * ## Retention (ADR-0015)
 *
 * The table holds at most 180 days of rows (the CERT-In floor). This
 * handler is a pure READ — it cannot violate retention; the
 * `scripts/cert-in-retention-sweep` cron handles the daily DELETE.
 *
 * ## Pagination contract
 *
 * Response shape matches `ApiAuditLogPage` from
 * `apps/web/src/lib/api/client.ts`: `{ items, page, pageSize, hasNext }`.
 *
 *   - `page` is 1-indexed.
 *   - `pageSize` is clamped to [1, 100], default 20.
 *   - `hasNext` is derived from a `LIMIT pageSize + 1` over-fetch — cheap
 *     and avoids a second `COUNT(*)` query.
 */

import { createClient } from '@factivist/db/client'
import { auditLog } from '@factivist/db/schema'
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'

import { requireAdmin } from '../../lib/rbac.ts'

/**
 * Pull the Drizzle client from `DATABASE_URL` at request time so tests
 * can stub the env. Mirrors the pattern used by `routes/admin/moderation.ts`.
 */
const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

/**
 * Mirrors `auditEventSchema.shape.action` from `@factivist/shared` — the
 * 10 admin actions that operators may filter on. The DB enum carries one
 * extra value (`identity.prove_attempt`) reserved for the server-side ZKP
 * fallback per `audit_log.ts` enum comments; rows of that action still
 * surface in the unfiltered list, they just are not filterable from this
 * route to keep the operator query surface aligned with the public
 * `AuditEvent` shape exposed to the web client.
 */
const ALLOWED_ACTION_FILTERS = [
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
] as const

const ALLOWED_TARGET_KIND_FILTERS = [
  'complaint',
  'comment',
  'moderation_case',
  'grievance',
  'feature_flag',
  'admin',
] as const

type AllowedAction = (typeof ALLOWED_ACTION_FILTERS)[number]
type AllowedTargetKind = (typeof ALLOWED_TARGET_KIND_FILTERS)[number]

const isAllowedAction = (v: string): v is AllowedAction =>
  (ALLOWED_ACTION_FILTERS as readonly string[]).includes(v)
const isAllowedTargetKind = (v: string): v is AllowedTargetKind =>
  (ALLOWED_TARGET_KIND_FILTERS as readonly string[]).includes(v)

const DEFAULT_PAGE_SIZE = 20 as const
const MAX_PAGE_SIZE = 100 as const

/** Parse a `?from=2026-05-01` or `?to=2026-05-31` date param. Returns null on garbage. */
const parseDateParam = (raw: string | undefined): Date | null => {
  if (!raw) return null
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return null
  return new Date(t)
}

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 1 ? n : fallback
}

export const adminAuditRoute = new Hono().get('/admin/audit-log', requireAdmin, async (c) => {
  const fromDate = parseDateParam(c.req.query('from'))
  const toDate = parseDateParam(c.req.query('to'))
  const actorFilter = c.req.query('actor')?.trim() || null
  const actionRaw = c.req.query('action')?.trim() || null
  const targetKindRaw = c.req.query('targetKind')?.trim() || null
  const page = parsePositiveInt(c.req.query('page'), 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    parsePositiveInt(c.req.query('pageSize'), DEFAULT_PAGE_SIZE),
  )

  const conditions: SQL[] = []
  if (fromDate) conditions.push(gte(auditLog.ts, fromDate))
  if (toDate) conditions.push(lte(auditLog.ts, toDate))
  if (actorFilter) conditions.push(eq(auditLog.actor, actorFilter))
  if (actionRaw && isAllowedAction(actionRaw)) {
    conditions.push(eq(auditLog.action, actionRaw))
  }
  if (targetKindRaw && isAllowedTargetKind(targetKindRaw)) {
    conditions.push(eq(auditLog.targetKind, targetKindRaw))
  }

  /**
   * Over-fetch by one to derive `hasNext` without a second COUNT(*).
   * The extra row is sliced off the response.
   */
  const limit = pageSize + 1
  const offset = (page - 1) * pageSize

  const db = getDb()
  const rows = await db
    .select({
      id: auditLog.id,
      actor: auditLog.actor,
      action: auditLog.action,
      targetKind: auditLog.targetKind,
      targetId: auditLog.targetId,
      payloadHash: auditLog.payloadHash,
      rationale: auditLog.rationale,
      ts: auditLog.ts,
    })
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.ts))
    .limit(limit)
    .offset(offset)

  const hasNext = rows.length > pageSize
  const items = hasNext ? rows.slice(0, pageSize) : rows

  /**
   * Serialise timestamps as ISO strings to match the
   * `ApiAuditLogEntry.ts: string` contract on the web client.
   */
  const serialised = items.map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action,
    targetKind: row.targetKind,
    targetId: row.targetId,
    payloadHash: row.payloadHash,
    rationale: row.rationale,
    ts: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
  }))

  return c.json({ items: serialised, page, pageSize, hasNext })
})

export type AdminAuditRoute = typeof adminAuditRoute
