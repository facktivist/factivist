/**
 * Comment routes — Phase 5 wave 4.
 *
 * Read: `GET /comments?complaint_slug=<slug>` returns the flat
 * comment list for a published complaint. The compound
 * (`Comment.Thread`) builds the tree client-side from the
 * `(id, parent_id)` shape — we deliberately don't pre-tree here.
 *
 * Write: `POST /comments` creates a top-level or reply comment.
 * Requires a verified citizen session (the `factivist-session`
 * signed cookie set by `/identity/verify`); citizen id is resolved
 * from the session, not from any client header.
 *
 * Anonymity invariants ([[ADR-010]]):
 *   - Read projects `authorHandle` (derived from `citizens.nullifier`
 *     via `deriveHandle`); never `authorId`, never `nullifier`.
 *   - Read drops flagged comments at the API boundary (matches the
 *     RLS predicate in `0006_comments_table.sql`).
 *   - Read returns 404 on unpublished parent complaints to avoid
 *     leaking moderation state.
 */

import { createClient } from '@factivist/db/client'
import {
  COMMENT_BODY_MAX,
  citizens,
  comments,
  complaints,
  type NewComment,
} from '@factivist/db/schema'
import {
  type CommentDto,
  type CommentListResponse,
  type CreateCommentInput,
  createCommentInputSchema,
  deriveHandle,
  type Nullifier,
} from '@factivist/shared/validators'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { extractSessionCookie, verifySession } from '../lib/session-cookie.ts'

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

export const commentRoute = new Hono()
  .get('/comments', async (c) => {
    const slug = c.req.query('complaint_slug')
    if (!slug || slug.length === 0) {
      return c.json({ error: 'missing_complaint_slug' }, 400)
    }
    const url = process.env.DATABASE_URL
    if (!url) return c.json({ error: 'db_down' }, 503)
    const db = getDb()

    // Confirm the parent complaint exists + is published. Matches the
    // RLS predicate exactly; we still gate at the route boundary because
    // the API uses the service-role JWT (which bypasses RLS).
    const parent = await db
      .select({ status: complaints.status })
      .from(complaints)
      .where(eq(complaints.slug, slug))
      .limit(1)
    if (parent.length === 0 || parent[0]?.status !== 'published') {
      return c.json({ error: 'not_found' }, 404)
    }

    const rows = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        complaintSlug: comments.complaintSlug,
        body: comments.body,
        flaggedState: comments.flagged,
        createdAt: comments.createdAt,
        authorNullifier: citizens.nullifier,
      })
      .from(comments)
      .innerJoin(citizens, eq(citizens.id, comments.authorId))
      .where(and(eq(comments.complaintSlug, slug), eq(comments.flagged, 'ok')))

    const items: CommentDto[] = rows
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((r) => ({
        id: r.id,
        parentId: r.parentId,
        complaintId: r.complaintSlug,
        authorHandle: deriveHandle(r.authorNullifier as Nullifier),
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        flagged: false, // we already filtered flagged='ok'
      }))

    return c.json({ items } satisfies CommentListResponse)
  })

  .post('/comments', zValidator('json', createCommentInputSchema), async (c) => {
    const url = process.env.DATABASE_URL
    if (!url) return c.json({ error: 'db_down' }, 503)
    const db = getDb()

    const cookie = extractSessionCookie(c.req.header('cookie') ?? '')
    if (!cookie) return c.json({ error: 'unauthenticated' }, 401)
    const session = verifySession(cookie)
    if (!session.ok) return c.json({ error: 'unauthenticated' }, 401)
    const sessionNullifier = session.payload.nullifier

    const input = c.req.valid('json') as CreateCommentInput

    // Parent complaint must exist + be published.
    const parent = await db
      .select({ status: complaints.status })
      .from(complaints)
      .where(eq(complaints.slug, input.complaintSlug))
      .limit(1)
    if (parent.length === 0 || parent[0]?.status !== 'published') {
      return c.json({ error: 'not_found' }, 404)
    }

    // Resolve citizen id from nullifier on the verified session.
    const citizen = await db
      .select({ id: citizens.id })
      .from(citizens)
      .where(eq(citizens.nullifier, sessionNullifier))
      .limit(1)
    const citizenId = citizen[0]?.id
    if (!citizenId) return c.json({ error: 'unauthenticated' }, 401)

    // If parentId is provided, confirm it belongs to the same
    // complaint (defence in depth against cross-complaint reparenting).
    if (input.parentId) {
      const par = await db
        .select({ complaintSlug: comments.complaintSlug })
        .from(comments)
        .where(eq(comments.id, input.parentId))
        .limit(1)
      if (par.length === 0 || par[0]?.complaintSlug !== input.complaintSlug) {
        return c.json({ error: 'invalid_parent' }, 400)
      }
    }

    const newRow: NewComment = {
      parentId: input.parentId ?? null,
      complaintSlug: input.complaintSlug,
      authorId: citizenId,
      body: input.body,
    }
    const inserted = await db.insert(comments).values(newRow).returning({
      id: comments.id,
      parentId: comments.parentId,
      complaintSlug: comments.complaintSlug,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    const row = inserted[0]
    if (!row) return c.json({ error: 'insert_failed' }, 500)

    return c.json(
      {
        id: row.id,
        parentId: row.parentId,
        complaintId: row.complaintSlug,
        authorHandle: deriveHandle(sessionNullifier),
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        flagged: false,
      } satisfies CommentDto,
      201,
    )
  })

// Re-export the body-max constant so consumers can build matching
// client-side validators without duplicating the value.
export { COMMENT_BODY_MAX }
