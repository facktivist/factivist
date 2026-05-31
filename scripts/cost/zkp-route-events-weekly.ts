#!/usr/bin/env bun
/**
 * `zkp-route-events-weekly` — cost-analyst scorecard query.
 *
 * Reads the last 7 days of `dev_metrics.zkp_route_events` rows and prints
 * the daily success / failure / p50 / p95 breakdown documented in
 * `docs/architecture/phase-5/wave-2-auth.md` §"Cost-analyst hookup".
 *
 * Origin: nice-to-have #8 from [[s1-phase-5-done]] — the scorecard SQL
 * was documented but never automated. This script + the matching cron
 * (`.github/workflows/zkp-cost-scorecard.yml`) thread the query into
 * the weekly cadence so the [[s1-cost-drift]] tracker auto-refreshes.
 *
 * ## Output
 *
 * One JSON object on stdout shaped:
 *
 *   {
 *     "windowDays": 7,
 *     "generatedAt": "2026-05-26T11:00:00.000Z",
 *     "rows": [
 *       { "day": "2026-05-20", "okCount": 12, "failCount": 1,
 *         "failRate": 0.0769, "p50Ms": 4200, "p95Ms": 11800 },
 *       …
 *     ],
 *     "totals": {
 *       "okCount": 84, "failCount": 6, "failRate": 0.0666,
 *       "p50Ms": 4400, "p95Ms": 12100
 *     }
 *   }
 *
 * The cron pipes this into `docs/data-points/zkp-cost-scorecard-latest.json`
 * + a one-line summary comment on the scorecard tracking issue.
 *
 * ## Exit codes
 *
 *   0 — success (including zero rows in the window)
 *   1 — config error (DATABASE_URL missing)
 *   2 — database error
 *
 * ATIDs: IDENT-004 (cost-analyst observability of the server-fallback rate).
 */

import { zkpRouteEvents } from '@factivist/db/schema'
import { and, gt, sql } from 'drizzle-orm'

/** One day-bucket as emitted by the SQL. */
export interface ScorecardRow {
  readonly day: string
  readonly okCount: number
  readonly failCount: number
  /** failCount / (okCount + failCount); 0 when both are zero. */
  readonly failRate: number
  readonly p50Ms: number | null
  readonly p95Ms: number | null
}

export interface ScorecardReport {
  readonly windowDays: number
  readonly generatedAt: string
  readonly rows: readonly ScorecardRow[]
  readonly totals: {
    readonly okCount: number
    readonly failCount: number
    readonly failRate: number
    readonly p50Ms: number | null
    readonly p95Ms: number | null
  }
}

/** Drizzle subset the script uses — narrowed so tests can stub it. */
export interface ScorecardDatabase {
  execute: (q: ReturnType<typeof sql> | unknown) => Promise<unknown>
}

interface RawRow {
  readonly day: Date | string
  readonly ok_count: number | string
  readonly fail_count: number | string
  readonly p50_ms: number | string | null
  readonly p95_ms: number | string | null
}

const asNumber = (v: number | string): number => (typeof v === 'number' ? v : Number(v))
const asNullableNumber = (v: number | string | null): number | null =>
  v === null ? null : asNumber(v)
const toIsoDay = (v: Date | string): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  // Postgres returns `date` columns as `YYYY-MM-DD` strings via pg/postgres-js.
  return String(v).slice(0, 10)
}

const buildFailRate = (ok: number, fail: number): number =>
  ok + fail === 0 ? 0 : Number((fail / (ok + fail)).toFixed(4))

export const runScorecard = async (
  database: ScorecardDatabase,
  now: Date = new Date(),
  windowDays = 7,
): Promise<ScorecardReport> => {
  // Mirror the documented query verbatim — kept inline so a reviewer can
  // diff against wave-2-auth.md §"Cost-analyst hookup" without leaving
  // the file.
  //
  // `route='server'` is the only value emitted today; the filter still
  // matches the doc so a future `'client'` beacon never silently slips
  // into the cost line.
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const query = sql`
    select
      date_trunc('day', ts)::date as day,
      count(*) filter (where outcome = 'success') as ok_count,
      count(*) filter (where outcome = 'failed')  as fail_count,
      percentile_cont(0.5)  within group (order by duration_ms) as p50_ms,
      percentile_cont(0.95) within group (order by duration_ms) as p95_ms
    from ${zkpRouteEvents}
    where ${and(
      sql`${zkpRouteEvents.purpose} = 'zkp_route'`,
      sql`${zkpRouteEvents.route} = 'server'`,
      gt(zkpRouteEvents.ts, cutoff),
    )}
    group by day
    order by day
  `

  const raw = (await database.execute(query)) as { rows?: RawRow[] } | RawRow[]
  const rawRows: RawRow[] = Array.isArray(raw) ? raw : (raw.rows ?? [])

  const rows: ScorecardRow[] = rawRows.map((r) => {
    const ok = asNumber(r.ok_count)
    const fail = asNumber(r.fail_count)
    return {
      day: toIsoDay(r.day),
      okCount: ok,
      failCount: fail,
      failRate: buildFailRate(ok, fail),
      p50Ms: asNullableNumber(r.p50_ms),
      p95Ms: asNullableNumber(r.p95_ms),
    }
  })

  const okTotal = rows.reduce((acc, r) => acc + r.okCount, 0)
  const failTotal = rows.reduce((acc, r) => acc + r.failCount, 0)
  // Rolling p50/p95 across the window — the per-day values are what the
  // doc emits, but the issue comment is much easier to scan with one
  // headline number. Computed via a second SQL pass would be ideal; the
  // cheap approximation here is the simple median/p95 across the
  // available per-day numbers (each weighted equally regardless of
  // sample size). Documented limitation.
  const pickPercentile = (values: ReadonlyArray<number | null>, p: number): number | null => {
    const xs = values.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)
    if (xs.length === 0) return null
    const idx = Math.min(xs.length - 1, Math.floor(p * xs.length))
    return xs[idx] ?? null
  }
  const totals = {
    okCount: okTotal,
    failCount: failTotal,
    failRate: buildFailRate(okTotal, failTotal),
    p50Ms: pickPercentile(
      rows.map((r) => r.p50Ms),
      0.5,
    ),
    p95Ms: pickPercentile(
      rows.map((r) => r.p95Ms),
      0.95,
    ),
  }

  return {
    windowDays,
    generatedAt: now.toISOString(),
    rows,
    totals,
  }
}

/* c8 ignore start — covered by the live cron, not the unit suite */
const isCli = import.meta.main
if (isCli) {
  if (!process.env.DATABASE_URL) {
    process.stderr.write(
      `${JSON.stringify({ error: 'DATABASE_URL missing — cost scorecard cannot run' })}\n`,
    )
    process.exit(1)
  }
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const postgres = (await import('postgres')).default
  const client = postgres(process.env.DATABASE_URL, { prepare: false })
  const db = drizzle(client)
  try {
    const report = await runScorecard({ execute: (q) => db.execute(q as never) })
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    await client.end({ timeout: 1 })
    process.exit(0)
  } catch (err) {
    process.stderr.write(`${JSON.stringify({ error: String(err) })}\n`)
    await client.end({ timeout: 1 })
    process.exit(2)
  }
}
/* c8 ignore stop */
