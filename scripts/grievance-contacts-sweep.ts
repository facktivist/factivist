#!/usr/bin/env bun
/**
 * `grievance-contacts-sweep` — DPDP §8(7) post-resolve PII erasure.
 *
 * Companion to `audit-log-sweep.ts`. Where the audit-log sweep clears
 * the immutable record of action past 365 days (DPDP Rules 2025 Rule
 * 8(3) joint floor with CERT-In 180 days), this sweep clears the
 * **recoverable contact PII** much sooner: 30 days after each
 * grievance is resolved, per DPDP §8(7) ("erase once purpose served").
 *
 * ## Cron schedule
 *
 * Daily at 03:30 UTC via `.github/workflows/audit-log-sweep.yml`
 * (shares the workflow with `audit-log-sweep`; ordered so audit_log
 * sweep runs first, then this).
 *
 * ## Observability
 *
 * Emits one JSON line on stdout shaped as:
 *   { deletedRows, oldestErasedAt, newestErasedAt, durationMs }
 * Errors go to stderr as `{ error }`.
 *
 * ## Exit codes
 *
 *   0 — success (including zero rows deleted)
 *   1 — config error (DATABASE_URL missing)
 *   2 — database error
 *
 * ATIDs: AUDIT-002.
 */

import { grievanceContacts } from '@factivist/db/schema'
import { lt } from 'drizzle-orm'

export interface SweepReport {
  deletedRows: number
  oldestErasedAt: string | null
  newestErasedAt: string | null
  durationMs: number
}

export interface SweepDatabase {
  select: () => {
    from: (table: typeof grievanceContacts) => {
      where: (cond: unknown) => Promise<Array<{ eraseAfter: Date | null }>>
    }
  }
  delete: (table: typeof grievanceContacts) => {
    where: (cond: unknown) => Promise<unknown>
  }
}

export const runSweep = async (
  database: SweepDatabase,
  now: Date = new Date(),
): Promise<SweepReport> => {
  const start = Date.now()
  const condition = lt(grievanceContacts.eraseAfter, now)

  const expired = await database.select().from(grievanceContacts).where(condition)
  const eraseAfters = expired
    .map((row) => row.eraseAfter)
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())

  await database.delete(grievanceContacts).where(condition)

  return {
    deletedRows: expired.length,
    oldestErasedAt: eraseAfters[0]?.toISOString() ?? null,
    newestErasedAt: eraseAfters[eraseAfters.length - 1]?.toISOString() ?? null,
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

export const main = async (deps: MainDeps): Promise<0 | 1 | 2> => {
  const url = deps.env.DATABASE_URL
  if (!url || url.trim().length === 0) {
    deps.error(
      JSON.stringify({
        error:
          'DATABASE_URL is not set. Refusing to run DPDP §8(7) grievance-contacts sweep without a DB.',
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
