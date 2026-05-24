/**
 * IT-Act grievance intake — Phase 5 Pipeline C.
 *
 * Endpoint: `POST /grievance` (publicly POST-able from `/legal/grievance`).
 *
 * ## Why this lives under `routes/admin/`
 *
 * The route itself is publicly POST-able (a third party — journalist,
 * subject of allegedly unlawful content — files the grievance). But the
 * artifact it produces (a `moderation_queue` row with the corresponding
 * SLA window + an `audit_log` entry) lives entirely on the admin side.
 * Co-locating the route with the admin handlers keeps the SLA timer and
 * audit-write logic in one bounded context.
 *
 * ## SLA windows (ADR-0014 + ADR-0020)
 *
 *   - 24 h acknowledgement of every grievance (`grievance.acknowledge`
 *     audit row written **synchronously** with the intake).
 *   - 36 h takedown ceiling for unlawful material (Rule 3(1)(d)).
 *   - 24 h takedown for NCII / `pii-leak` / `defamation` / `communal`.
 *
 * The wall-clock SLA is encoded by `computeSlaDueAt` and persisted on the
 * `moderation_queue` row — the SLA monitor reads from there.
 *
 * ## Anonymity invariant (ADR-0010)
 *
 * The complainant is a third party, NOT a citizen-author of the platform.
 * Their email + name are stored in the audit row's `rationale` (free
 * text). Citizen-side identifiers (nullifier, Aadhaar, photo bytes) MUST
 * NEVER appear in this handler — the input schema rejects them at the
 * boundary.
 */

import { createClient } from '@factivist/db/client'
import {
  auditLog,
  computeSlaDueAt,
  moderationQueue,
  type NewAuditLogEntry,
  type NewModerationQueueItem,
} from '@factivist/db/schema'
import { grievanceIntakeSchema } from '@factivist/shared/validators'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

const sha256Hex = async (body: unknown): Promise<string> => {
  const text = JSON.stringify(body)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const adminGrievanceRoute = new Hono().post(
  '/grievance',
  zValidator('json', grievanceIntakeSchema),
  async (c) => {
    const body = c.req.valid('json')
    const now = new Date()
    const slaDueAt = computeSlaDueAt(body.reason, now)
    const payloadHash = await sha256Hex(body)

    const newQueueItem: NewModerationQueueItem = {
      complaintSlug: body.targetRef,
      targetKind: 'complaint',
      reason: body.reason,
      status: 'pending',
      slaDueAt,
    }

    const db = getDb()
    const inserted = await db.transaction(async (tx) => {
      const rows = await tx.insert(moderationQueue).values(newQueueItem).returning({
        id: moderationQueue.id,
        complaintSlug: moderationQueue.complaintSlug,
        targetKind: moderationQueue.targetKind,
        reason: moderationQueue.reason,
        status: moderationQueue.status,
        slaDueAt: moderationQueue.slaDueAt,
        createdAt: moderationQueue.createdAt,
      })
      const queued = rows[0]
      if (!queued) {
        throw new Error('grievance_insert_failed')
      }

      /**
       * SYNCHRONOUS acknowledgement audit row. ADR-0014 mandates a 24h
       * ack SLA — by writing this row inside the same transaction as
       * the queue insert, we guarantee the ack is timestamped at the
       * moment of receipt, no race against a worker.
       *
       * `rationale` carries the public complainant contact (name +
       * email). The grievance officer reads it to issue the human-facing
       * acknowledgement; it is NOT a citizen identifier.
       */
      const ackEntry: NewAuditLogEntry = {
        actor: 'system.grievance.intake',
        action: 'grievance.acknowledge',
        targetKind: 'grievance',
        targetId: queued.id,
        payloadHash,
        rationale: `complainant=${body.complainantName} <${body.complainantEmail}>`,
      }
      await tx.insert(auditLog).values(ackEntry)

      return queued
    })

    return c.json(
      {
        grievanceId: inserted.id,
        slaDueAt: inserted.slaDueAt,
        acknowledgement:
          'Your grievance has been received and acknowledged per IT Rules 2021. The named Grievance Officer will respond within 24 hours.',
      },
      201,
    )
  },
)

export type AdminGrievanceRoute = typeof adminGrievanceRoute
