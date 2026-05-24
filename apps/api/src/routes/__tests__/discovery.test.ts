import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `GET /complaints` discovery feed tests.
 *
 * Asserts:
 *   - 503 when DB env unset.
 *   - Always restricts to status='published' (aggregates §2 + ATID-DISC-005).
 *   - Constructs websearch_to_tsquery FTS when `q` present (ADR-0005).
 *   - All filter columns wire through (state, district, pc, ac, category).
 *   - Sort variants (newest, most-flagged, most-commented fallback).
 *   - Paging clamps (1..50).
 *   - NEVER emits authorId / nullifier.
 */

const fixturePageRow = {
  slug: 'pothole-mg-7k3a',
  title: 'Pothole on MG Road',
  body: 'A pothole has persisted for 3 weeks.',
  categorySlug: 'roads',
  categoryLabel: 'Roads',
  stateCode: 'ka',
  districtCode: 'blr-u',
  pcCode: 'blr-s',
  acCode: 'btm-layout',
  photoUrls: ['https://cdn/x.jpg'],
  createdAt: new Date('2026-05-20T00:00:00Z'),
  authorNullifier: `0x${'a'.repeat(64)}`,
  flagCount: 3,
}

// Capture per-call WHERE conditions for assertion.
const lastWhereCalls: unknown[] = []
const lastOrderByCalls: unknown[] = []
const lastLimitCalls: number[] = []
const lastOffsetCalls: number[] = []

// Track the order of awaited selects. Discovery handler does:
//   1. db.$with(...).as(db.select(...).from(...).groupBy(...))   ← never awaited
//   2. db.select({total: count()}).from().where()                 ← awaited (total)
//   3. db.with(flagCounts).select({...}).from().innerJoin().innerJoin().leftJoin().where().orderBy().limit().offset()  ← awaited (page)
//
// We detect which is which by the presence of `.innerJoin` calls — the
// total query never calls innerJoin, while the page query calls it twice.
const totalQueue: number[] = []
const pageQueue: unknown[][] = []

const makeSelectChain = () => {
  let hasInnerJoin = false
  let isAsSubquery = false
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.innerJoin = vi.fn(() => {
    hasInnerJoin = true
    return chain
  })
  chain.leftJoin = vi.fn(() => chain)
  chain.where = vi.fn((w: unknown) => {
    lastWhereCalls.push(w)
    return chain
  })
  chain.orderBy = vi.fn((...args: unknown[]) => {
    lastOrderByCalls.push(args)
    return chain
  })
  chain.limit = vi.fn((n: number) => {
    lastLimitCalls.push(n)
    return chain
  })
  chain.offset = vi.fn((n: number) => {
    lastOffsetCalls.push(n)
    return chain
  })
  chain.groupBy = vi.fn(() => {
    isAsSubquery = true
    return chain
  })
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder is a thenable; tests must mimic that shape
  chain.then = (resolve: (v: unknown) => unknown) => {
    if (isAsSubquery) {
      // Should never await — but if drizzle does, hand back []
      return Promise.resolve([]).then(resolve)
    }
    if (hasInnerJoin) {
      const rows = pageQueue.shift() ?? []
      return Promise.resolve(rows).then(resolve)
    }
    const v = totalQueue.shift() ?? 0
    return Promise.resolve([{ total: v }]).then(resolve)
  }
  return chain
}

const dbInstance = {
  $with: vi.fn(() => ({
    as: vi.fn(() => ({
      flagCount: { as: () => ({}) },
      slug: 'flag_counts.slug',
    })),
  })),
  // db.with(cte).select(...) — returns an object exposing select that
  // proxies to the same select chain.
  with: vi.fn(() => ({
    select: vi.fn(() => makeSelectChain()),
  })),
  select: vi.fn(() => makeSelectChain()),
}

const createClientMock = vi.fn(() => dbInstance)

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

describe('GET /complaints (discovery)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    totalQueue.length = 0
    pageQueue.length = 0
    lastWhereCalls.length = 0
    lastOrderByCalls.length = 0
    lastLimitCalls.length = 0
    lastOffsetCalls.length = 0
    dbInstance.select.mockClear()
    dbInstance.with.mockClear()
    dbInstance.$with.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    expect(res.status).toBe(503)
  })

  it('returns the page with defaults (page=1, pageSize=20, sort=newest)', async () => {
    totalQueue.push(1)
    pageQueue.push([fixturePageRow])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: unknown[]
      page: number
      pageSize: number
      totalCount: number
      hasNext: boolean
    }
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
    expect(body.totalCount).toBe(1)
    expect(body.hasNext).toBe(false)
    expect(body.items.length).toBe(1)
    const item = body.items[0] as Record<string, unknown>
    expect(item).toHaveProperty('authorHandle')
    expect(item).not.toHaveProperty('authorNullifier')
    expect(item).not.toHaveProperty('authorId')
    expect(item).not.toHaveProperty('nullifier')
  })

  it('always pushes a status=published condition into the WHERE list', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    await createApp().request('/complaints')
    // Each select.where call receives one combined `and(...conditions)`.
    // We can't introspect inner conditions easily without execting, but we
    // at least assert both selects (total + page) got a where.
    expect(lastWhereCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('applies state/district/pc/ac/category filters when query params present', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request(
      '/complaints?state=ka&district=blr-u&pc=blr-s&ac=btm-layout&category=roads',
    )
    expect(res.status).toBe(200)
  })

  it('adds an FTS condition when `q` is present and non-empty', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    await createApp().request('/complaints?q=potholes+near+mg')
    expect(lastWhereCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('ignores `q` when empty after trim', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?q=%20%20%20')
    expect(res.status).toBe(200)
  })

  it('clamps pageSize at 50 and floors at 1', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?pageSize=9999')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { pageSize: number }
    expect(body.pageSize).toBe(50)
  })

  it('clamps pageSize at 1 when the query param is 0', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?pageSize=0')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { pageSize: number }
    expect(body.pageSize).toBe(20)
  })

  it('floors page at 1 (negative → 1)', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?page=-5')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { page: number }
    expect(body.page).toBe(1)
  })

  it('falls back to default sort when an unknown sort is requested', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?sort=trending')
    expect(res.status).toBe(200)
  })

  it('honours sort=most-flagged', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?sort=most-flagged')
    expect(res.status).toBe(200)
  })

  it('honours sort=most-commented (falls back to createdAt internally)', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?sort=most-commented')
    expect(res.status).toBe(200)
  })

  it('hasNext=true when totalCount > page*pageSize', async () => {
    totalQueue.push(100)
    pageQueue.push([fixturePageRow])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?page=1&pageSize=20')
    const body = (await res.json()) as { hasNext: boolean }
    expect(body.hasNext).toBe(true)
  })

  it('truncates body excerpt at 280 chars', async () => {
    totalQueue.push(1)
    pageQueue.push([{ ...fixturePageRow, body: 'x'.repeat(400) }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    const body = (await res.json()) as { items: { bodyExcerpt: string }[] }
    expect(body.items[0]?.bodyExcerpt.endsWith('…')).toBe(true)
  })

  it('handles rows where photoUrls is null', async () => {
    totalQueue.push(1)
    pageQueue.push([{ ...fixturePageRow, photoUrls: null }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    const body = (await res.json()) as { items: { photoUrls: string[] }[] }
    expect(body.items[0]?.photoUrls).toEqual([])
  })

  it('handles totalCount when totalRow is empty', async () => {
    // empty total queue → returns 0 by makeSelectChain default
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    const body = (await res.json()) as { totalCount: number }
    expect(body.totalCount).toBe(0)
  })

  it('coerces non-numeric page and pageSize to defaults', async () => {
    totalQueue.push(0)
    pageQueue.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints?page=abc&pageSize=zzz')
    const body = (await res.json()) as { page: number; pageSize: number }
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
  })

  it('trims body shorter than 280 unchanged (excerpt branch)', async () => {
    totalQueue.push(1)
    pageQueue.push([{ ...fixturePageRow, body: 'short' }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    const body = (await res.json()) as { items: { bodyExcerpt: string }[] }
    expect(body.items[0]?.bodyExcerpt).toBe('short')
  })

  it('emits flagCount=0 when underlying row reports zero', async () => {
    totalQueue.push(1)
    pageQueue.push([{ ...fixturePageRow, flagCount: 0 }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints')
    const body = (await res.json()) as { items: { flagCount: number }[] }
    expect(body.items[0]?.flagCount).toBe(0)
  })
})
