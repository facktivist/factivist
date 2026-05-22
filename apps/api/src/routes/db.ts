import { createClient } from '@factivist/db/client'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'

/**
 * DB health route. Uses `createClient(url)` rather than the lazy `db`
 * singleton so the connection lifetime is request-scoped and tests can
 * inject a fake DATABASE_URL without touching process env.
 *
 * Returns 503 when `DATABASE_URL` is unset or the query fails; the API
 * itself stays alive so `/health` continues to report `ok`.
 */
export const dbRoute = new Hono().get('/db/ping', async (c) => {
  const url = process.env.DATABASE_URL
  if (!url) {
    return c.json({ db: 'down', reason: 'DATABASE_URL not set' }, 503)
  }

  try {
    const client = createClient(url)
    const rows = (await client.execute(sql`select 1 as ok`)) as Array<{ ok: number }>
    const ok = rows.length > 0 && rows[0]?.ok === 1
    return c.json({ db: ok ? 'up' : 'down' })
  } catch (err) {
    return c.json({ db: 'down', reason: (err as Error).message }, 503)
  }
})

export type DbRoute = typeof dbRoute
