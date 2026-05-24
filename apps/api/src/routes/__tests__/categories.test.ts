import { S1_CATEGORIES } from '@factivist/db/seed/categories'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `GET /categories` — read-only 35-row taxonomy.
 *
 * The drizzle client is mocked: the seed itself is exercised in
 * `packages/db/src/seed/__tests__/categories.test.ts`. Here we only need
 * to prove the route is shape-correct and surfaces seeded rows in the
 * order drizzle yields. The "post-seed" case is asserted by handing the
 * route the same `S1_CATEGORIES` payload the seed would produce.
 */

// `vi.mock` is hoisted; mock state lives in a `vi.hoisted` block so the
// factory can close over it without tripping the "cannot access before
// initialization" guard that fires when ESM imports above evaluate first.
const mocks = vi.hoisted(() => {
  const rowQueue: unknown[][] = []
  const makeSelectChain = () => {
    const chain: Record<string, unknown> = {}
    chain.from = vi.fn(() => chain)
    chain.orderBy = vi.fn(() => chain)
    // biome-ignore lint/suspicious/noThenProperty: drizzle query builder is a thenable; tests must mimic that shape
    chain.then = (resolve: (v: unknown) => unknown) => {
      const rows = rowQueue.shift() ?? []
      return Promise.resolve(rows).then(resolve)
    }
    return chain
  }
  const dbInstance = { select: vi.fn(() => makeSelectChain()) }
  const createClientMock = vi.fn(() => dbInstance)
  return { rowQueue, dbInstance, createClientMock }
})
const { rowQueue, dbInstance } = mocks

vi.mock('@factivist/db/client', () => ({
  createClient: mocks.createClientMock,
}))

describe('GET /categories', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    rowQueue.length = 0
    dbInstance.select.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/categories')
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('DB_DOWN')
  })

  it('returns the categories list in the order surfaced by drizzle', async () => {
    rowQueue.push([
      { slug: 'roads', label: 'Roads' },
      { slug: 'health', label: 'Health' },
    ])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/categories')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { slug: string; label: string }[]
    expect(body).toEqual([
      { slug: 'roads', label: 'Roads' },
      { slug: 'health', label: 'Health' },
    ])
  })

  it('returns an empty list when none seeded', async () => {
    rowQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/categories')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns all 35 seeded categories in sortOrder', async () => {
    // Mirror what the categories seed lands: `{ slug, label }` rows in
    // ascending sortOrder. The route projects exactly these two columns,
    // so the payload + ordering MUST round-trip 1:1.
    const seededShape = S1_CATEGORIES.map((r) => ({ slug: r.slug, label: r.label }))
    rowQueue.push(seededShape)

    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/categories')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { slug: string; label: string }[]
    expect(body.length).toBe(35)
    expect(body).toEqual(seededShape)
  })
})
