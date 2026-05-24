#!/usr/bin/env bun
/**
 * `audit-log-sweep` — CERT-In 180-day retention sweep for `audit_log`.
 *
 * ## Why this script exists
 *
 *   - ADR-0015 (CERT-In direction 20(3)/2022-CERT-In, 28 April 2022) mandates
 *     180-day retention of system logs, hosted within India. Anything older
 *     is hard-deleted (no archive), per ADR-0015 §"Storage location".
 *   - `packages/db/src/schema/audit_log.ts` exports the only authoritative
 *     retention constant — `AUDIT_LOG_RETENTION_DAYS = 180`. This script is
 *     the **only** DELETE the schema authorises.
 *   - The append-only invariant on `audit_log` means production code MUST
 *     NEVER call this DELETE — it runs from a scheduled GitHub Actions job
 *     under workspace-level credentials.
 *
 * ## Cron schedule
 *
 * Daily at 03:00 UTC via `.github/workflows/audit-log-sweep.yml`. The exact
 * minute is unimportant; what matters is that the boundary is recomputed
 * each run from `now()` so the script is idempotent and safe to re-run on
 * the same day. Repeated runs delete only the rows that crossed the 180-day
 * boundary since the previous run (typically zero on a second same-day run).
 *
 * ## Observability
 *
 * Emits exactly one JSON line on stdout shaped as
 *   { deletedRows, oldestKeptTs, newestKeptTs, boundaryTs, durationMs }
 * Errors go to stderr as a JSON line with `{ error }`. Both shapes are
 * grep-able from GitHub Actions logs without a log shipper.
 *
 * ## Exit codes
 *
 *   0 — success (including the "zero rows deleted" case)
 *   1 — config error (DATABASE_URL missing / unparseable)
 *   2 — database error (connect / query failure)
 *
 * ATIDs: AUDIT-002 (retention sweep)
 */

import { AUDIT_LOG_RETENTION_DAYS, auditLog } from '@factivist/db/schema'
import { lt, sql } from 'drizzle-orm'

/**
 * Compute the boundary timestamp: rows with `ts < boundaryTs` are expired
 * and will be deleted. Pure function so tests can pin `now` without
 * mocking the clock.
 */
export const computeBoundaryTs = (now: Date, retentionDays: number): Date => {
  const boundary = new Date(now.getTime())
  boundary.setUTCDate(boundary.getUTCDate() - retentionDays)
  return boundary
}

/**
 * Minimal Drizzle surface we need. Typed by hand so tests don't have to
 * stand up a real `postgres-js` client.
 */
export interface SweepDatabase {
  delete: (table: typeof auditLog) => {
    where: (predicate: ReturnType<typeof lt>) => Promise<{ count?: number } | unknown[]>
  }
  select: (selection: Record<string, unknown>) => {
    from: (table: typeof auditLog) => Promise<Array<{ oldest: Date | null; newest: Date | null }>>
  }
}

export interface SweepReport {
  deletedRows: number
  oldestKeptTs: string | null
  newestKeptTs: string | null
  boundaryTs: string
  durationMs: number
}

/**
 * Best-effort row-count extraction. `postgres-js` returns an array-like
 * result whose `count` property is the affected-row count; some drivers
 * surface it as `rowCount`. Tests assert against both shapes.
 */
export const extractDeletedRows = (result: unknown): number => {
  if (result == null) return 0
  if (typeof result === 'number') return result
  if (Array.isArray(result)) {
    const withCount = result as Array<unknown> & { count?: number }
    if (typeof withCount.count === 'number') return withCount.count
    return result.length
  }
  if (typeof result === 'object') {
    const obj = result as { count?: number; rowCount?: number }
    if (typeof obj.count === 'number') return obj.count
    if (typeof obj.rowCount === 'number') return obj.rowCount
  }
  return 0
}

/**
 * Run the sweep against the provided Drizzle client. Returns a structured
 * report. Throws on DB failure — caller decides how to surface it.
 */
export const runSweep = async (
  database: SweepDatabase,
  now: Date = new Date(),
  retentionDays: number = AUDIT_LOG_RETENTION_DAYS,
): Promise<SweepReport> => {
  const start = Date.now()
  const boundaryTs = computeBoundaryTs(now, retentionDays)

  const deleteResult = await database.delete(auditLog).where(lt(auditLog.ts, boundaryTs))
  const deletedRows = extractDeletedRows(deleteResult)

  const bounds = await database
    .select({
      oldest: sql<Date | null>`min(${auditLog.ts})`,
      newest: sql<Date | null>`max(${auditLog.ts})`,
    })
    .from(auditLog)
  const oldestKeptTs = bounds[0]?.oldest ? bounds[0].oldest.toISOString() : null
  const newestKeptTs = bounds[0]?.newest ? bounds[0].newest.toISOString() : null

  return {
    deletedRows,
    oldestKeptTs,
    newestKeptTs,
    boundaryTs: boundaryTs.toISOString(),
    durationMs: Date.now() - start,
  }
}

export interface MainDeps {
  env: Record<string, string | undefined>
  log: (msg: string) => void
  error: (msg: string) => void
  createClient: (url: string) => SweepDatabase
  now?: Date
}

/**
 * CLI entry. Returns the desired process exit code so the harness can
 * assert without forcing `process.exit`.
 */
export const main = async (deps: MainDeps): Promise<0 | 1 | 2> => {
  const url = deps.env.DATABASE_URL
  if (!url || url.trim().length === 0) {
    deps.error(
      JSON.stringify({
        error: 'DATABASE_URL is not set. Refusing to run CERT-In retention sweep without a DB.',
      }),
    )
    return 1
  }

  let database: SweepDatabase
  try {
    database = deps.createClient(url)
  } catch (err) {
    deps.error(JSON.stringify({ error: `failed to open DB client: ${(err as Error).message}` }))
    return 2
  }

  try {
    const report = await runSweep(database, deps.now)
    deps.log(JSON.stringify(report))
    return 0
  } catch (err) {
    deps.error(JSON.stringify({ error: `sweep failed: ${(err as Error).message}` }))
    return 2
  }
}

// Guard against accidental boot when imported from tests.
/* c8 ignore start */
if (import.meta.main) {
  const { createClient } = await import('@factivist/db/client')
  const code = await main({
    env: process.env,
    log: (m) => process.stdout.write(`${m}\n`),
    error: (m) => process.stderr.write(`${m}\n`),
    createClient: (url) => createClient(url) as unknown as SweepDatabase,
  })
  process.exit(code)
}
/* c8 ignore stop */
