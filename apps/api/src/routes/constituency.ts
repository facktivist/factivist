import { createClient } from '@factivist/db/client'
import {
  assemblyConstituencies,
  districts,
  parliamentaryConstituencies,
  states,
} from '@factivist/db/schema'
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'

/**
 * Constituency lookup routes.
 *
 * Drives the combobox + breadcrumb picker per [[ADR-017]]. Two surfaces:
 *
 *   - `GET /constituency/:level?parent=<code>`
 *     List nodes at one level. `parent` narrows the scope and is REQUIRED
 *     for `district | pc | ac`.
 *
 *   - `GET /constituency/search?q=<term>`
 *     Fuzzy search across all four levels. Used when the citizen knows
 *     their AC name but not the upstream state/district.
 *
 * Output matches `ApiConstituencyNode[]` from `apps/web/src/lib/api/client.ts`
 * (i.e. `{ code, label, parentCode, level }`).
 *
 * The dataset is closed ([[ADR-007]]) so we order alphabetically by label
 * to keep deterministic UX even after a re-seed adds a new row.
 */

const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

const LEVELS = ['state', 'district', 'pc', 'ac'] as const
type Level = (typeof LEVELS)[number]

/** Narrow `string | undefined` → `Level | undefined`. */
const parseLevel = (raw: string | undefined): Level | undefined =>
  raw && (LEVELS as readonly string[]).includes(raw) ? (raw as Level) : undefined

/** Maximum rows returned in one response — keeps the wire under 1 MB. */
const MAX_LIST = 1000
/** Maximum rows in a fuzzy search response. */
const MAX_SEARCH = 50

const listAtLevel = async (
  db: ReturnType<typeof createClient>,
  level: Level,
  parent: string | undefined,
) => {
  switch (level) {
    case 'state': {
      const rows = await db
        .select({ code: states.code, label: states.label })
        .from(states)
        .orderBy(asc(states.label))
        .limit(MAX_LIST)
      return rows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: null as string | null,
        level: 'state' as const,
      }))
    }
    case 'district': {
      if (!parent) return []
      const rows = await db
        .select({
          code: districts.code,
          label: districts.label,
          stateCode: districts.stateCode,
        })
        .from(districts)
        .where(eq(districts.stateCode, parent))
        .orderBy(asc(districts.label))
        .limit(MAX_LIST)
      return rows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: r.stateCode,
        level: 'district' as const,
      }))
    }
    case 'pc': {
      if (!parent) return []
      // Parent for a PC list is either a state OR a district — the UI
      // currently passes the district. Match both for forward-compat.
      const rows = await db
        .select({
          code: parliamentaryConstituencies.code,
          label: parliamentaryConstituencies.label,
          stateCode: parliamentaryConstituencies.stateCode,
          districtCode: parliamentaryConstituencies.districtCode,
        })
        .from(parliamentaryConstituencies)
        .where(
          or(
            eq(parliamentaryConstituencies.districtCode, parent),
            eq(parliamentaryConstituencies.stateCode, parent),
          ),
        )
        .orderBy(asc(parliamentaryConstituencies.label))
        .limit(MAX_LIST)
      return rows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: r.districtCode ?? r.stateCode,
        level: 'pc' as const,
      }))
    }
    case 'ac': {
      if (!parent) return []
      const rows = await db
        .select({
          code: assemblyConstituencies.code,
          label: assemblyConstituencies.label,
          pcCode: assemblyConstituencies.pcCode,
        })
        .from(assemblyConstituencies)
        .where(eq(assemblyConstituencies.pcCode, parent))
        .orderBy(asc(assemblyConstituencies.label))
        .limit(MAX_LIST)
      return rows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: r.pcCode,
        level: 'ac' as const,
      }))
    }
  }
}

export const constituencyRoute = new Hono()
  /** Fuzzy search — comes BEFORE `:level` so `/constituency/search` does
   *  not collide with the dynamic-segment route. */
  .get('/constituency/search', async (c) => {
    const q = c.req.query('q')?.trim()
    if (!q || q.length < 2) return c.json([])
    const url = process.env.DATABASE_URL
    if (!url) {
      return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
    }
    const db = getDb()
    const pattern = `%${q}%`

    // One query per level so we can return a uniform shape with the
    // `level` discriminator. The closed dataset is small enough
    // (~5k rows across all four tables) that four indexed ILIKE scans
    // are well under 50 ms at S1 volumes.
    const [stateRows, districtRows, pcRows, acRows] = await Promise.all([
      db
        .select({ code: states.code, label: states.label })
        .from(states)
        .where(ilike(states.label, pattern))
        .orderBy(asc(states.label))
        .limit(MAX_SEARCH),
      db
        .select({
          code: districts.code,
          label: districts.label,
          stateCode: districts.stateCode,
        })
        .from(districts)
        .where(ilike(districts.label, pattern))
        .orderBy(asc(districts.label))
        .limit(MAX_SEARCH),
      db
        .select({
          code: parliamentaryConstituencies.code,
          label: parliamentaryConstituencies.label,
          stateCode: parliamentaryConstituencies.stateCode,
          districtCode: parliamentaryConstituencies.districtCode,
        })
        .from(parliamentaryConstituencies)
        .where(ilike(parliamentaryConstituencies.label, pattern))
        .orderBy(asc(parliamentaryConstituencies.label))
        .limit(MAX_SEARCH),
      db
        .select({
          code: assemblyConstituencies.code,
          label: assemblyConstituencies.label,
          pcCode: assemblyConstituencies.pcCode,
        })
        .from(assemblyConstituencies)
        .where(ilike(assemblyConstituencies.label, pattern))
        .orderBy(asc(assemblyConstituencies.label))
        .limit(MAX_SEARCH),
    ])

    const out = [
      ...stateRows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: null as string | null,
        level: 'state' as const,
      })),
      ...districtRows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: r.stateCode,
        level: 'district' as const,
      })),
      ...pcRows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: r.districtCode ?? r.stateCode,
        level: 'pc' as const,
      })),
      ...acRows.map((r) => ({
        code: r.code,
        label: r.label,
        parentCode: r.pcCode,
        level: 'ac' as const,
      })),
    ]
    return c.json(out.slice(0, MAX_SEARCH))
  })
  /** Level listing — `state | district | pc | ac`. */
  .get('/constituency/:level', async (c) => {
    const level = parseLevel(c.req.param('level'))
    if (!level) {
      return c.json({ error: 'invalid_level', code: 'INVALID_LEVEL' as const }, 400)
    }
    const url = process.env.DATABASE_URL
    if (!url) {
      return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
    }
    const db = getDb()
    const parent = c.req.query('parent') || undefined
    const rows = await listAtLevel(db, level, parent)
    return c.json(rows)
  })

export type ConstituencyRoute = typeof constituencyRoute

// `sql` is imported above but only used when expanding to PG ILIKE; keep
// it referenced so tree-shaking doesn't surprise anyone debugging the
// query plan from this file.
void sql
void and
