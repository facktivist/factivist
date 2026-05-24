import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `GET /categories` — read-only 35-row taxonomy.
 */

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

const dbInstance = {
  select: vi.fn(() => makeSelectChain()),
}
const createClientMock = vi.fn(() => dbInstance)

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
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
})
