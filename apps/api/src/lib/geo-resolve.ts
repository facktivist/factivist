import type { Database } from '@factivist/db/client'
import {
  assemblyConstituencies,
  districts,
  parliamentaryConstituencies,
  states,
} from '@factivist/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Resolve the four constituency codes a complaint carries
 * (`state` / `district` / `pc` / `ac`) into human-readable labels for the
 * public API surface.
 *
 * Why four parallel single-row lookups instead of one big LEFT JOIN:
 *   - The four reference tables (see `packages/db/src/schema/constituencies.ts`)
 *     are read-only at runtime ([[ADR-007]] closed dataset) and each row is
 *     keyed by its own PK. The complaint already carries all four PK values,
 *     so the join graph the planner would build degenerates to four PK seeks
 *     anyway — keeping them separate keeps each query trivial to mock and
 *     index-tune.
 *   - `Promise.all` issues the four queries in one round-trip from the
 *     application's perspective. Drizzle on `postgres-js` pipelines them on
 *     the same TCP connection, so wall-clock cost is dominated by a single
 *     RTT plus four PK-index seeks (~sub-ms even at S2 scale).
 *   - A single 4-way LEFT JOIN would also work, but it forces an artificial
 *     "from where?" anchor table — there is no row in the four reference
 *     tables that naturally owns all four codes. Anchoring on `complaints`
 *     was already done in the route; doing it again here would duplicate
 *     the row fetch.
 *
 * Fallback behaviour:
 *   When a reference row is missing (data drift between a complaint's
 *   stored code and the seeded reference set), the resolver returns the
 *   **code itself** as the label rather than throwing. This is defence in
 *   depth — the FK constraints in `complaints.ts` should make this
 *   impossible, but a missing reference row should degrade the detail
 *   surface gracefully (show "MH" instead of 500) rather than break it.
 *
 * Closes the wave-1 reviewer stub item #3: the GET /complaints/:slug
 * detail handler was hard-coding `stateLabel = stateCode` etc.
 */
export interface GeoCodes {
  readonly stateCode: string
  readonly districtCode: string
  readonly pcCode: string
  readonly acCode: string
}

export interface GeoLabels {
  readonly stateLabel: string
  readonly districtLabel: string
  readonly pcLabel: string
  readonly acLabel: string
}

export const resolveGeoLabels = async (db: Database, codes: GeoCodes): Promise<GeoLabels> => {
  const [stateRows, districtRows, pcRows, acRows] = await Promise.all([
    db
      .select({ label: states.label })
      .from(states)
      .where(eq(states.code, codes.stateCode))
      .limit(1),
    db
      .select({ label: districts.label })
      .from(districts)
      .where(eq(districts.code, codes.districtCode))
      .limit(1),
    db
      .select({ label: parliamentaryConstituencies.label })
      .from(parliamentaryConstituencies)
      .where(eq(parliamentaryConstituencies.code, codes.pcCode))
      .limit(1),
    db
      .select({ label: assemblyConstituencies.label })
      .from(assemblyConstituencies)
      .where(eq(assemblyConstituencies.code, codes.acCode))
      .limit(1),
  ])

  return {
    stateLabel: stateRows[0]?.label ?? codes.stateCode,
    districtLabel: districtRows[0]?.label ?? codes.districtCode,
    pcLabel: pcRows[0]?.label ?? codes.pcCode,
    acLabel: acRows[0]?.label ?? codes.acCode,
  }
}
