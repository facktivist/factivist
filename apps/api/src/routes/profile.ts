/**
 * Profile routes — Phase 5 wave 4 (mobile profile tab data wiring).
 *
 * GET /me — returns the authenticated citizen's anonymous profile
 * (handle + nullifier excerpt + aggregate stats). Required for the
 * mobile profile tab to surface the verified-citizen view.
 *
 * Anonymity invariants ([[ADR-010]]):
 *   - Response carries `handle` (deriveHandle output) +
 *     `nullifierExcerpt` (first 8 chars only — defence in depth).
 *   - Aggregate stats are counts only; never row-level data that
 *     could correlate the citizen across surfaces.
 *   - 401 when the session cookie is absent or invalid.
 */

import { createClient } from '@factivist/db/client'
import { citizens, comments, complaintFlags, complaints } from '@factivist/db/schema'
import { deriveHandle } from '@factivist/shared/validators'
import { and, count, eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { extractSessionCookie, verifySession } from '../lib/session-cookie.ts'

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

export interface ProfileResponse {
  readonly handle: string
  readonly nullifierExcerpt: string
  readonly stats: {
    readonly complaintCount: number
    readonly commentCount: number
    readonly flagsReceived: number
  }
  readonly joinedAt: string
}

export const profileRoute = new Hono().get('/me', async (c) => {
  const cookie = extractSessionCookie(c.req.header('cookie') ?? '')
  if (!cookie) return c.json({ error: 'unauthenticated' }, 401)
  const session = verifySession(cookie)
  if (!session.ok) return c.json({ error: 'unauthenticated' }, 401)

  const url = process.env.DATABASE_URL
  if (!url) return c.json({ error: 'db_down' }, 503)
  const db = getDb()

  const nullifier = session.payload.nullifier

  // Look up the citizen row so we can return joinedAt + confirm the
  // session corresponds to a still-existing citizen.
  const citizenRows = await db
    .select({ id: citizens.id, createdAt: citizens.createdAt })
    .from(citizens)
    .where(eq(citizens.nullifier, nullifier))
    .limit(1)
  const citizen = citizenRows[0]
  if (!citizen) return c.json({ error: 'unauthenticated' }, 401)

  const [complaintCountRow, commentCountRow, flagsReceivedRow] = await Promise.all([
    db
      .select({ total: count() })
      .from(complaints)
      .where(and(eq(complaints.authorId, citizen.id), eq(complaints.status, 'published'))),
    db.select({ total: count() }).from(comments).where(eq(comments.authorId, citizen.id)),
    db
      .select({ total: count() })
      .from(complaintFlags)
      .innerJoin(complaints, eq(complaints.slug, complaintFlags.complaintSlug))
      .where(eq(complaints.authorId, citizen.id)),
  ])

  const body: ProfileResponse = {
    handle: deriveHandle(nullifier),
    nullifierExcerpt: nullifier.slice(0, 8),
    stats: {
      complaintCount: Number(complaintCountRow[0]?.total ?? 0),
      commentCount: Number(commentCountRow[0]?.total ?? 0),
      flagsReceived: Number(flagsReceivedRow[0]?.total ?? 0),
    },
    joinedAt: citizen.createdAt.toISOString(),
  }
  return c.json(body)
})
