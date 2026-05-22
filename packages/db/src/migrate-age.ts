/**
 * One-shot migrator for the Apache AGE knowledge-graph layer.
 *
 * The script is intentionally separate from `migrate.ts` (the drizzle-managed
 * relational migrator) because AGE introduces its own catalog and Cypher
 * dialect that drizzle-kit cannot snapshot. Apply order:
 *
 *   1. `bun run db:migrate`      — relational schema (Drizzle)
 *   2. `bun run db:migrate:age`  — AGE extension + graph bootstrap
 *
 * The migration file lives at `drizzle/age/0001_age_init.sql`. Add new AGE
 * migrations alongside it with a strictly-increasing numeric prefix; this
 * runner applies every `*.sql` file in lexicographic order and tracks which
 * ones have been applied in the `__age_migrations` table.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import postgres from 'postgres'

const MIGRATIONS_DIR = './drizzle/age'
const TRACKING_TABLE = '__age_migrations'

const ensureTrackingTable = async (sql: postgres.Sql): Promise<void> => {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

const alreadyApplied = async (sql: postgres.Sql): Promise<Set<string>> => {
  const rows = (await sql.unsafe(`SELECT id FROM ${TRACKING_TABLE}`)) as unknown as { id: string }[]
  return new Set(rows.map((r) => r.id))
}

const listMigrations = async (dir: string): Promise<string[]> => {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const files: string[] = []
  for (const name of entries.sort()) {
    if (!name.endsWith('.sql')) continue
    const s = await stat(join(dir, name)).catch(() => undefined)
    if (s?.isFile()) files.push(name)
  }
  return files
}

export interface MigrationOutcome {
  applied: string[]
  skipped: string[]
}

/**
 * Apply every pending AGE migration. Idempotent: existing applications are
 * detected via `__age_migrations` and skipped. Each migration is wrapped in
 * an implicit transaction by postgres-js when run through `sql.unsafe`.
 */
export const applyAgeMigrations = async (
  sql: postgres.Sql,
  dir: string = MIGRATIONS_DIR,
): Promise<MigrationOutcome> => {
  await ensureTrackingTable(sql)
  const done = await alreadyApplied(sql)
  const all = await listMigrations(dir)
  const applied: string[] = []
  const skipped: string[] = []
  for (const name of all) {
    if (done.has(name)) {
      skipped.push(name)
      continue
    }
    const body = await readFile(join(dir, name), 'utf8')
    await sql.unsafe(body)
    await sql.unsafe(`INSERT INTO ${TRACKING_TABLE} (id) VALUES ($1)`, [name])
    applied.push(name)
  }
  return { applied, skipped }
}

const run = async (): Promise<void> => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL must be set to run AGE migrations.')
  }
  const sql = postgres(url, { max: 1, prepare: false })
  try {
    const outcome = await applyAgeMigrations(sql)
    const msg =
      `AGE: applied ${outcome.applied.length} migration(s), ` +
      `skipped ${outcome.skipped.length}\n`
    process.stdout.write(msg)
    if (outcome.applied.length > 0) {
      process.stdout.write(`  applied: ${outcome.applied.join(', ')}\n`)
    }
  } finally {
    await sql.end()
  }
}

/* v8 ignore start */
if (import.meta.main) {
  await run()
}

/* v8 ignore stop */

export { run }
