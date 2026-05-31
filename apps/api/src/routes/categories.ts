import { createClient } from '@factivist/db/client'
import { categories } from '@factivist/db/schema'
import { asc } from 'drizzle-orm'
import { Hono } from 'hono'

/**
 * `GET /categories` — read-only complaint taxonomy.
 *
 * Per `aggregates.md` §Category the closed dataset is 35 rows at S1.
 * No auth required; the picker in `apps/web` + `apps/mobile` consumes
 * this on first render and caches with TanStack Query (`staleTime: 1h`).
 *
 * Response shape matches `ApiCategory[]` from
 * `apps/web/src/lib/api/client.ts` — i.e. `{ slug, label }` per row.
 */
const getDb = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return createClient(url)
}

export const categoriesRoute = new Hono().get('/categories', async (c) => {
  const url = process.env.DATABASE_URL
  if (!url) {
    return c.json({ error: 'db_down', code: 'DB_DOWN' as const }, 503)
  }
  const db = getDb()
  const rows = await db
    .select({ slug: categories.slug, label: categories.label })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.label))
  return c.json(rows)
})

export type CategoriesRoute = typeof categoriesRoute
