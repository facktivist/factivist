import { createClient } from '@factivist/db/client'
import {
  type AssemblyConstituency,
  assemblyConstituencies,
  categories,
  citizens,
  complaintFlags,
  complaints,
  computeSlaDueAt,
  type ModerationQueueItem,
  moderationQueue,
} from '@factivist/db/schema'
import {
  COMPLAINT_DISCLAIMER,
  createComplaintInputSchema,
  deriveHandle,
  flagComplaintInputSchema,
  type Nullifier,
  nullifierSchema,
} from '@factivist/shared/validators'
import { zValidator } from '@hono/zod-validator'
import { and, count, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'

import { isFlagEnabled } from '../lib/flags.ts'
import { resolveGeoLabels } from '../lib/geo-resolve.ts'

/**
 * Complaint routes — detail, create, flag.
 *
 * Per `aggregates.md` §Complaint (PK = slug, [[ADR-012]]) + the API
 * client surface in `apps/web/src/lib/api/client.ts`:
 *
 *   GET  /complaints/:slug          — detail (public)
 *   POST /complaints                — create (S1_COMPLAINT_SUBMIT gated)
 *   POST /complaints/:slug/flag     — moderation flag (auth: x-factivist-nullifier)
 *
 * The list endpoint (`GET /complaints`) lives in `discovery.ts` next door
 * because that handler is dominated by FTS query construction.
 *
 * Authentication for write paths uses the same `x-factivist-nullifier`
 * header convention as `identity.ts` (Phase 5 wave 1 stand-in; Pipeline F
 * lands the cookie-signed session).
 */

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

/** Body excerpt cap — keeps card body uniform with discovery feed. */
const excerpt = (body: string): string =>
  body.length <= 280 ? body : `${body.slice(0, 280).trimEnd()}…`

/**
 * Build a stable, URL-safe slug from the trimmed title plus a short
 * base36 suffix. Pattern: `<short-title>-<6 base36 chars>`. The suffix is
 * random to keep collisions unlikely without a DB lookup.
 *
 * Title segment is at most 60 chars after normalisation; non-alphanumerics
 * collapse to single hyphens.
 */
const buildSlug = (title: string): string => {
  const norm = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const base = norm || 'complaint'
  // 6 chars of base36 — ~2.1 billion variants. At S1 scale (1k MAU) the
  // birthday-collision probability over a year is negligible.
  const suffix = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')
  return `${base}-${suffix}`
}

/**
 * Resolve the bearer of `x-factivist-nullifier` to a citizen row. Returns
 * `null` when the header is missing, malformed, or unknown.
 */
const resolveCitizen = async (
  db: ReturnType<typeof createClient>,
  header: string | undefined,
): Promise<{ id: string; nullifier: Nullifier } | null> => {
  if (!header) return null
  const parsed = nullifierSchema.safeParse(header)
  if (!parsed.success) return null
  const rows = await db
    .select({ id: citizens.id, nullifier: citizens.nullifier })
    .from(citizens)
    .where(eq(citizens.nullifier, parsed.data))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return { id: row.id, nullifier: row.nullifier as Nullifier }
}

/**
 * Validate the constituency tuple is consistent — the AC must belong to
 * the PC, the PC's state must match, etc. The FK constraints enforce
 * row-level validity individually; this guard catches "valid codes that
 * don't agree with each other" before we waste a write.
 */
const validateConstituencyTuple = async (
  db: ReturnType<typeof createClient>,
  tuple: { stateCode: string; districtCode: string; pcCode: string; acCode: string },
): Promise<AssemblyConstituency | null> => {
  const rows = await db
    .select()
    .from(assemblyConstituencies)
    .where(
      and(
        eq(assemblyConstituencies.code, tuple.acCode),
        eq(assemblyConstituencies.pcCode, tuple.pcCode),
        eq(assemblyConstituencies.stateCode, tuple.stateCode),
      ),
    )
    .limit(1)
  const row = rows[0]
  if (!row) return null
  // District is optional on AC/PC (some span boundaries) — only enforce
  // when both sides agree on a district.
  if (row.districtCode && row.districtCode !== tuple.districtCode) return null
  return row
}

export const complaintRoute = new Hono()
  /**
   * Complaint detail. Public — surfaces the same `ApiComplaint` shape the
   * web/mobile clients expect. NEVER returns `authorId`; derives
   * `authorHandle` from the joined `citizens.nullifier`.
   */
  .get('/complaints/:slug', async (c) => {
    const slug = c.req.param('slug')
    const url = process.env.DATABASE_URL
    if (!url) return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
    const db = getDb()

    const rows = await db
      .select({
        slug: complaints.slug,
        title: complaints.title,
        body: complaints.body,
        status: complaints.status,
        categorySlug: complaints.categorySlug,
        categoryLabel: categories.label,
        stateCode: complaints.stateCode,
        districtCode: complaints.districtCode,
        pcCode: complaints.pcCode,
        acCode: complaints.acCode,
        photoUrls: complaints.photoUrls,
        createdAt: complaints.createdAt,
        authorNullifier: citizens.nullifier,
      })
      .from(complaints)
      .innerJoin(citizens, eq(citizens.id, complaints.authorId))
      .innerJoin(categories, eq(categories.slug, complaints.categorySlug))
      .where(eq(complaints.slug, slug))
      .limit(1)

    const row = rows[0]
    if (!row) return c.json({ error: 'not_found' }, 404)
    if (row.status !== 'published') {
      // Non-published rows are admin-only — surface as 404 to anonymous
      // callers to avoid leaking moderation state (aggregates §2 +
      // ATID-DISC-005).
      return c.json({ error: 'not_found' }, 404)
    }

    const flagRow = await db
      .select({ total: count() })
      .from(complaintFlags)
      .where(eq(complaintFlags.complaintSlug, slug))

    // Resolve the four constituency codes to human-readable labels via
    // `lib/geo-resolve.ts` (wave 3B). Falls back to the code itself when
    // a reference row is missing — see the helper for the rationale.
    const labels = await resolveGeoLabels(db, {
      stateCode: row.stateCode,
      districtCode: row.districtCode,
      pcCode: row.pcCode,
      acCode: row.acCode,
    })

    return c.json({
      id: row.slug,
      title: row.title,
      body: row.body,
      bodyExcerpt: excerpt(row.body),
      categorySlug: row.categorySlug,
      categoryLabel: row.categoryLabel,
      stateCode: row.stateCode,
      districtCode: row.districtCode,
      pcCode: row.pcCode,
      acCode: row.acCode,
      stateLabel: labels.stateLabel,
      districtLabel: labels.districtLabel,
      pcLabel: labels.pcLabel,
      acLabel: labels.acLabel,
      photoUrls: row.photoUrls ?? [],
      authorHandle: deriveHandle(row.authorNullifier as Nullifier),
      disclaimer: COMPLAINT_DISCLAIMER,
      commentCount: 0,
      flagCount: Number(flagRow[0]?.total ?? 0),
      createdAt: row.createdAt.toISOString(),
    })
  })

  /**
   * Create a complaint. Gated by:
   *   1. `S1_COMPLAINT_SUBMIT` feature flag (returns 503 when off).
   *   2. `x-factivist-nullifier` header → resolves to `citizens.id`
   *      (returns 401 when missing/unknown).
   *
   * The write is one transaction:
   *   - INSERT complaints
   *   - (future: photo persistence is owned by `lib/upload.ts`'s
   *     `acceptUpload` hook; this route accepts the URLs verbatim,
   *     trusting that the upload pipeline already stripped EXIF —
   *     defence-in-depth: the URLs must originate from the configured
   *     public base, otherwise we reject).
   */
  .post('/complaints', zValidator('json', createComplaintInputSchema), async (c) => {
    const url = process.env.DATABASE_URL
    if (!url) return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
    const db = getDb()

    const submitEnabled = await isFlagEnabled(db, 'S1_COMPLAINT_SUBMIT')
    if (!submitEnabled) {
      return c.json({ error: 'feature_disabled', code: 'S1_COMPLAINT_SUBMIT_OFF' as const }, 503)
    }

    const me = await resolveCitizen(db, c.req.header('x-factivist-nullifier'))
    if (!me) return c.json({ error: 'unauthorized', code: 'UNVERIFIED' as const }, 401)

    const input = c.req.valid('json')

    const ac = await validateConstituencyTuple(db, {
      stateCode: input.stateCode,
      districtCode: input.districtCode,
      pcCode: input.pcCode,
      acCode: input.acCode,
    })
    if (!ac) {
      return c.json(
        {
          error: 'invalid_constituency',
          code: 'CONSTITUENCY_HIERARCHY_INVALID' as const,
        },
        400,
      )
    }

    // Slug collision is theoretically possible at scale; retry up to 3
    // times before giving up. At S1 volumes a single attempt practically
    // never collides.
    let inserted: { slug: string; createdAt: Date } | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = buildSlug(input.title)
      const rows = await db
        .insert(complaints)
        .values({
          slug,
          authorId: me.id,
          categorySlug: input.categorySlug,
          title: input.title,
          body: input.body,
          stateCode: input.stateCode,
          districtCode: input.districtCode,
          pcCode: input.pcCode,
          acCode: input.acCode,
          photoUrls: input.photoUrls,
          status: 'published',
        })
        .onConflictDoNothing({ target: complaints.slug })
        .returning({ slug: complaints.slug, createdAt: complaints.createdAt })
      const row = rows[0]
      if (row) {
        inserted = row
        break
      }
    }

    if (!inserted) {
      return c.json({ error: 'slug_collision', code: 'SLUG_COLLISION' as const }, 500)
    }

    return c.json(
      {
        id: inserted.slug,
        createdAt: inserted.createdAt.toISOString(),
      },
      201,
    )
  })

  /**
   * Flag a complaint for moderation.
   *
   * One transaction:
   *   1. INSERT `complaint_flags` (one-per-(reporter, complaint) — duplicate
   *      flags are absorbed as 200 without throwing).
   *   2. UPSERT `moderation_queue` — open a pending case if none exists,
   *      otherwise tighten the SLA when this flag's reason is more urgent.
   *
   * I-MOD-4 / aggregates §4: the SLA is set from the FIRST reason on a
   * case and never relaxed; if a later flag introduces a 24h-tier reason
   * (`pii-leak`, `ncii`, `defamation`, `communal`) on a 36h case, the
   * deadline tightens.
   */
  .post('/complaints/:slug/flag', zValidator('json', flagComplaintInputSchema), async (c) => {
    const slug = c.req.param('slug')
    const url = process.env.DATABASE_URL
    if (!url) return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
    const db = getDb()

    const me = await resolveCitizen(db, c.req.header('x-factivist-nullifier'))
    if (!me) return c.json({ error: 'unauthorized', code: 'UNVERIFIED' as const }, 401)

    const target = await db
      .select({ slug: complaints.slug })
      .from(complaints)
      .where(eq(complaints.slug, slug))
      .limit(1)
    if (!target[0]) return c.json({ error: 'not_found' }, 404)

    const input = c.req.valid('json')

    // `complaint_flags.reason` and `moderation_queue.reason` are
    // distinct enums (different scope: reporter-facing vs moderator-
    // facing). The mapping is identity-on-overlap; reporter reasons
    // outside the moderation enum land as `other`.
    type ModReason = ModerationQueueItem['reason']
    const reporterToModReason: Record<typeof input.reason, ModReason> = {
      'pii-leak': 'pii-leak',
      harassment: 'other',
      misinformation: 'false',
      spam: 'other',
      'off-topic': 'other',
    }
    const modReason: ModReason = reporterToModReason[input.reason]

    await db.transaction(async (tx) => {
      await tx
        .insert(complaintFlags)
        .values({
          complaintSlug: slug,
          reporterId: me.id,
          reason: input.reason,
          note: input.note,
        })
        .onConflictDoNothing({
          target: [complaintFlags.complaintSlug, complaintFlags.reporterId],
        })

      // Try to open a queue case. The partial unique index on
      // `(targetKind, complaintSlug) WHERE status='pending'` guards
      // against duplicate open cases (`moderation_queue.ts`).
      const now = new Date()
      await tx
        .insert(moderationQueue)
        .values({
          complaintSlug: slug,
          targetKind: 'complaint',
          reason: modReason,
          slaDueAt: computeSlaDueAt(modReason, now),
        })
        .onConflictDoNothing()

      // If a case already exists, tighten SLA when this flag's reason
      // is more urgent (24h tier). Atomic UPDATE … WHERE so we never
      // relax.
      const newDeadline = computeSlaDueAt(modReason, now)
      await tx
        .update(moderationQueue)
        .set({ slaDueAt: newDeadline })
        .where(
          and(
            eq(moderationQueue.complaintSlug, slug),
            eq(moderationQueue.status, 'pending'),
            // Relax-guard — only tighten.
            sql`${moderationQueue.slaDueAt} > ${newDeadline}`,
          ),
        )
    })

    // 204 No Content — the API client treats `Promise<void>` as success.
    return c.body(null, 204)
  })

export type ComplaintRoute = typeof complaintRoute
