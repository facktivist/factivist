import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `GET /constituency/:level` and `GET /constituency/search` tests.
 *
 * Anchored to:
 *   - ADR-0007 (closed dataset).
 *   - ADR-0017 (combobox + breadcrumb feed).
 */

const queues: {
  states: unknown[][]
  districts: unknown[][]
  pcs: unknown[][]
  acs: unknown[][]
} = { states: [], districts: [], pcs: [], acs: [] }

const makeSelectChain = (which: 'states' | 'districts' | 'pcs' | 'acs') => {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.orderBy = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder is a thenable; tests must mimic that shape
  chain.then = (resolve: (v: unknown) => unknown) => {
    const rows = queues[which].shift() ?? []
    return Promise.resolve(rows).then(resolve)
  }
  return chain
}

// We decide which level table is being queried by inspecting the args
// to `.from()`. Drizzle pgTable instances have a Symbol.for('drizzle:Name')
// metadata; rather than introspect that, we let the route's caller path
// determine ordering since each route handler calls a known sequence.
let nextSelectKind: 'states' | 'districts' | 'pcs' | 'acs' | 'auto' = 'auto'
const autoQueue: ('states' | 'districts' | 'pcs' | 'acs')[] = []

const dbInstance = {
  select: vi.fn(() => {
    const which = nextSelectKind === 'auto' ? (autoQueue.shift() ?? 'states') : nextSelectKind
    nextSelectKind = 'auto'
    return makeSelectChain(which)
  }),
}

const createClientMock = vi.fn(() => dbInstance)

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

describe('GET /constituency/:level', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    queues.states.length = 0
    queues.districts.length = 0
    queues.pcs.length = 0
    queues.acs.length = 0
    autoQueue.length = 0
    nextSelectKind = 'auto'
    dbInstance.select.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 400 for an invalid level token', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/galaxy')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('INVALID_LEVEL')
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/state')
    expect(res.status).toBe(503)
  })

  it('lists states with parentCode=null and level=state', async () => {
    autoQueue.push('states')
    queues.states.push([
      { code: 'KA', label: 'Karnataka' },
      { code: 'MH', label: 'Maharashtra' },
    ])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/state')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      code: string
      label: string
      parentCode: string | null
      level: string
    }[]
    expect(body.length).toBe(2)
    expect(body[0]).toEqual({
      code: 'KA',
      label: 'Karnataka',
      parentCode: null,
      level: 'state',
    })
  })

  it('returns [] for district level without a parent', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/district')
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown[]
    expect(body).toEqual([])
  })

  it('lists districts when parent state given', async () => {
    autoQueue.push('districts')
    queues.districts.push([{ code: 'KA-560', label: 'Bangalore Urban', stateCode: 'KA' }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/district?parent=KA')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { parentCode: string; level: string }[]
    expect(body[0]?.parentCode).toBe('KA')
    expect(body[0]?.level).toBe('district')
  })

  it('returns [] for pc level without a parent', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/pc')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('lists pcs and prefers districtCode for parentCode when present', async () => {
    autoQueue.push('pcs')
    queues.pcs.push([
      { code: 'KA-PC-26', label: 'Bangalore South', stateCode: 'KA', districtCode: 'KA-560' },
    ])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/pc?parent=KA-560')
    const body = (await res.json()) as { parentCode: string }[]
    expect(body[0]?.parentCode).toBe('KA-560')
  })

  it('lists pcs and falls back to stateCode when districtCode is null', async () => {
    autoQueue.push('pcs')
    queues.pcs.push([{ code: 'KA-PC-1', label: 'Bidar', stateCode: 'KA', districtCode: null }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/pc?parent=KA')
    const body = (await res.json()) as { parentCode: string }[]
    expect(body[0]?.parentCode).toBe('KA')
  })

  it('returns [] for ac level without a parent', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/ac')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('lists acs with parentCode=pcCode', async () => {
    autoQueue.push('acs')
    queues.acs.push([{ code: 'KA-AC-150', label: 'BTM Layout', pcCode: 'KA-PC-26' }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/ac?parent=KA-PC-26')
    const body = (await res.json()) as { parentCode: string; level: string }[]
    expect(body[0]?.parentCode).toBe('KA-PC-26')
    expect(body[0]?.level).toBe('ac')
  })
})

describe('GET /constituency/search', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    queues.states.length = 0
    queues.districts.length = 0
    queues.pcs.length = 0
    queues.acs.length = 0
    autoQueue.length = 0
    dbInstance.select.mockClear()
  })

  it('returns [] for queries shorter than 2 chars', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/search?q=a')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns [] when q is omitted', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/search')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/search?q=bang')
    expect(res.status).toBe(503)
  })

  it('returns unified rows across all four levels', async () => {
    // search fires Promise.all([states, districts, pcs, acs])
    autoQueue.push('states', 'districts', 'pcs', 'acs')
    queues.states.push([{ code: 'KA', label: 'Karnataka' }])
    queues.districts.push([{ code: 'KA-560', label: 'Bangalore Urban', stateCode: 'KA' }])
    queues.pcs.push([
      { code: 'KA-PC-26', label: 'Bangalore South', stateCode: 'KA', districtCode: 'KA-560' },
    ])
    queues.acs.push([{ code: 'KA-AC-150', label: 'BTM Layout', pcCode: 'KA-PC-26' }])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/search?q=bang')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { level: string }[]
    expect(body.length).toBe(4)
    const levels = body.map((r) => r.level).sort()
    expect(levels).toEqual(['ac', 'district', 'pc', 'state'])
  })

  it('caps results at MAX_SEARCH (50)', async () => {
    autoQueue.push('states', 'districts', 'pcs', 'acs')
    queues.states.push(Array.from({ length: 20 }, (_, i) => ({ code: `S${i}`, label: `s${i}` })))
    queues.districts.push(
      Array.from({ length: 20 }, (_, i) => ({
        code: `D${i}`,
        label: `d${i}`,
        stateCode: 'KA',
      })),
    )
    queues.pcs.push(
      Array.from({ length: 20 }, (_, i) => ({
        code: `P${i}`,
        label: `p${i}`,
        stateCode: 'KA',
        districtCode: null,
      })),
    )
    queues.acs.push(
      Array.from({ length: 20 }, (_, i) => ({
        code: `A${i}`,
        label: `a${i}`,
        pcCode: 'P0',
      })),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/search?q=ab')
    const body = (await res.json()) as unknown[]
    expect(body.length).toBe(50)
  })

  it('emits pcs with fallback parentCode=stateCode when districtCode null', async () => {
    autoQueue.push('states', 'districts', 'pcs', 'acs')
    queues.states.push([])
    queues.districts.push([])
    queues.pcs.push([{ code: 'KA-PC-1', label: 'X', stateCode: 'KA', districtCode: null }])
    queues.acs.push([])
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/constituency/search?q=xx')
    const body = (await res.json()) as { level: string; parentCode: string }[]
    const pc = body.find((b) => b.level === 'pc')
    expect(pc?.parentCode).toBe('KA')
  })
})
