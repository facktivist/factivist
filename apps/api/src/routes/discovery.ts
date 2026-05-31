import { createClient } from '@factivist/db/client'
import { categories, citizens, complaintFlags, complaints } from '@factivist/db/schema'
import { deriveHandle, type Nullifier } from '@factivist/shared/validators'
import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'

/**
 * Discovery feed — `GET /complaints` list.
 *
 * Lives in its own file (separate from `complaint.ts` detail/create/flag)
 * because the FTS construction is non-trivial and we want one obvious
 * landing site for index tuning later.
 *
 * Query params (mirroring `discoveryFiltersSchema` from `@factivist/shared`):
 *
 *   - `q`        full-text search across `title || body` ([[ADR-005]])
 *   - `state`    `complaints.state_code`
 *   - `district` `complaints.district_code`
 *   - `pc`       `complaints.pc_code`
 *   - `ac`       `complaints.ac_code`
 *   - `category` `complaints.category_slug`
 *   - `sort`     `newest | most-commented | most-flagged`
 *   - `page`     1-indexed
 *   - `pageSize` 1..50, default 20
 *
 * Anonymity invariant:
 *   The handler NEVER projects `authorId`. It joins `citizens` for the
 *   `nullifier` column ONLY to call `deriveHandle(nullifier)` server-side
 *   — `nullifier` itself never leaves this handler. The response shape
 *   matches `ApiComplaintSummary[]` from the API client.
 *
 * Status filter:
 *   Public reads always restrict to `status='published'` (aggregates §2 +
 *   ATID-DISC-005). `moderation_pending` / `removed` rows are admin-only.
 */

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

/** Build a body excerpt — first 280 chars + ellipsis. */
const excerpt = (body: string): string =>
  body.length <= 280 ? body : `${body.slice(0, 280).trimEnd()}…`

/**
 * Sanitise the FTS query string. Postgres `websearch_to_tsquery` already
 * does the heavy lifting; we just collapse whitespace and cap length so
 * pathological inputs (a 10 KB string of garbage) don't pin a worker.
 */
const sanitiseQ = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, 200)

export const discoveryRoute = new Hono().get('/complaints', async (c) => {
  const url = process.env.DATABASE_URL
  if (!url) {
    return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
  }
  const db = getDb()

  const q = c.req.query('q')?.trim()
  const stateCode = c.req.query('state')?.trim()
  const districtCode = c.req.query('district')?.trim()
  const pcCode = c.req.query('pc')?.trim()
  const acCode = c.req.query('ac')?.trim()
  const categorySlug = c.req.query('category')?.trim()
  const sortRaw = c.req.query('sort') ?? 'newest'
  const sort = (['newest', 'most-commented', 'most-flagged'] as const).includes(
    sortRaw as 'newest' | 'most-commented' | 'most-flagged',
  )
    ? (sortRaw as 'newest' | 'most-commented' | 'most-flagged')
    : 'newest'
  const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10) || 1)
  const pageSize = Math.min(
    50,
    Math.max(1, Number.parseInt(c.req.query('pageSize') ?? '20', 10) || 20),
  )

  // Compose WHERE.
  const conditions = [eq(complaints.status, 'published')]
  if (stateCode) conditions.push(eq(complaints.stateCode, stateCode))
  if (districtCode) conditions.push(eq(complaints.districtCode, districtCode))
  if (pcCode) conditions.push(eq(complaints.pcCode, pcCode))
  if (acCode) conditions.push(eq(complaints.acCode, acCode))
  if (categorySlug) conditions.push(eq(complaints.categorySlug, categorySlug))
  if (q && q.length > 0) {
    const sanitised = sanitiseQ(q)
    // `websearch_to_tsquery` accepts citizen-typed natural-language input
    // (quoted phrases, OR, -) without throwing on unbalanced operators.
    conditions.push(
      sql`${complaints.searchVector} @@ websearch_to_tsquery('english', ${sanitised})`,
    )
  }
  const where = and(...conditions)

  /**
   * Aggregate flag counts in a sub-select keyed by complaintSlug. Joining
   * the raw `complaint_flags` table would inflate the row count; the
   * sub-select keeps the page query a single SELECT.
   */
  const flagCounts = db.$with('flag_counts').as(
    db
      .select({
        slug: complaintFlags.complaintSlug,
        flagCount: count(complaintFlags.id).as('flag_count'),
      })
      .from(complaintFlags)
      .groupBy(complaintFlags.complaintSlug),
  )

  const orderBy = (() => {
    switch (sort) {
      case 'newest':
        return desc(complaints.createdAt)
      case 'most-flagged':
        return desc(sql`coalesce(${flagCounts.flagCount}, 0)`)
      case 'most-commented':
        // Comments table is not in S1 yet — fall back to newest so the
        // discovery feed still returns something. Stub for Pipeline G.
        return desc(complaints.createdAt)
    }
  })()

  // Count total — separate query so the LIMIT/OFFSET planner isn't
  // confused by the WITH on the page query.
  const totalRow = await db.select({ total: count() }).from(complaints).where(where)
  const totalCount = Number(totalRow[0]?.total ?? 0)

  const rows = await db
    .with(flagCounts)
    .select({
      slug: complaints.slug,
      title: complaints.title,
      body: complaints.body,
      categorySlug: complaints.categorySlug,
      categoryLabel: categories.label,
      stateCode: complaints.stateCode,
      districtCode: complaints.districtCode,
      pcCode: complaints.pcCode,
      acCode: complaints.acCode,
      photoUrls: complaints.photoUrls,
      createdAt: complaints.createdAt,
      authorNullifier: citizens.nullifier,
      flagCount: sql<number>`coalesce(${flagCounts.flagCount}, 0)::int`.as('flag_count'),
    })
    .from(complaints)
    .innerJoin(citizens, eq(citizens.id, complaints.authorId))
    .innerJoin(categories, eq(categories.slug, complaints.categorySlug))
    .leftJoin(flagCounts, eq(flagCounts.slug, complaints.slug))
    .where(where)
    .orderBy(orderBy, asc(complaints.slug))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const items = rows.map((r) => ({
    id: r.slug,
    title: r.title,
    bodyExcerpt: excerpt(r.body),
    categorySlug: r.categorySlug,
    categoryLabel: r.categoryLabel,
    stateCode: r.stateCode,
    districtCode: r.districtCode,
    pcCode: r.pcCode,
    acCode: r.acCode,
    photoUrls: r.photoUrls ?? [],
    // Public surface — derive on read, NEVER emit the raw nullifier.
    authorHandle: deriveHandle(r.authorNullifier as Nullifier),
    commentCount: 0,
    flagCount: Number(r.flagCount ?? 0),
    createdAt: r.createdAt.toISOString(),
  }))

  return c.json({
    items,
    page,
    pageSize,
    totalCount,
    hasNext: page * pageSize < totalCount,
  })
})

export type DiscoveryRoute = typeof discoveryRoute
