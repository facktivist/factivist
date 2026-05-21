import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index.ts'

export type Database = ReturnType<typeof createClient>

/**
 * Build a Drizzle client backed by the postgres-js driver.
 *
 * `prepare: false` is REQUIRED when connecting through Supabase's pooled
 * endpoint (pgBouncer in transaction mode, port 6543) because prepared
 * statements are not supported across pooled connections. Leave it off
 * even for direct connections — Drizzle's query builder doesn't rely on
 * server-side prepares, so we lose nothing.
 */
export const createClient = (url: string): ReturnType<typeof drizzle<typeof schema>> => {
  const sql = postgres(url, { prepare: false })
  return drizzle(sql, { schema, casing: 'snake_case' })
}

let _db: Database | undefined

/**
 * Lazily-initialized singleton bound to `process.env.DATABASE_URL`.
 *
 * Prefer `createClient(url)` in tests and short-lived scripts; reach for
 * `db` only inside long-running app processes where one connection pool
 * per process is the right answer.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    if (!_db) {
      const url = process.env.DATABASE_URL
      if (!url) {
        throw new Error(
          'DATABASE_URL is not set. Define it in your environment before importing `db`.',
        )
      }
      _db = createClient(url)
    }
    return Reflect.get(_db as object, prop, receiver)
  },
})

/**
 * Test-only escape hatch to reset the cached singleton between cases.
 * Intentionally unexported from the public barrel.
 */
export const __resetDbForTests = (): void => {
  _db = undefined
}
