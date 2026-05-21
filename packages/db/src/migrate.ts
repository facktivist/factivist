import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * Apply pending migrations against the database referenced by `DATABASE_URL`.
 *
 * Use the DIRECT (non-pooled, port 5432) Supabase URL here — pgBouncer in
 * transaction mode rejects the DDL drizzle-kit emits.
 *
 * `max: 1` keeps the migrator on a single connection, which postgres-js
 * recommends for one-shot scripts.
 */
const run = async (): Promise<void> => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL must be set to run migrations.')
  }

  const sql = postgres(url, { max: 1, prepare: false })
  const database = drizzle(sql)
  await migrate(database, { migrationsFolder: './drizzle' })
  await sql.end()
}

if (import.meta.main) {
  await run()
}

export { run }
