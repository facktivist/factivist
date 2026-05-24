import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Integration-style tests for `/complaints` routes (detail, create, flag).
 *
 * Uses `app.request()` per apps/api/CLAUDE.md (no HTTP server). The DB
 * client is mocked at the module boundary; we drive responses per call by
 * resetting the chain mocks between tests.
 */

// Mocks for chain-style Drizzle calls. The route uses:
//   db.select({...}).from(...).innerJoin(...).innerJoin(...).where(...).limit(n)
//   db.select({total: count()}).from(complaintFlags).where(...)
//   db.insert(complaints).values(...).onConflictDoNothing(...).returning(...)
//   db.transaction(async (tx) => { tx.insert(...).values(...).onConflictDoNothing(...) ; tx.update(...).set(...).where(...) })

interface ChainState {
  // configurable per-test by pushing onto these queues
  selectResults: unknown[][]
  insertResults: unknown[][]
  flagEnabled: boolean
  txInsertCalls: { table: 'complaintFlags' | 'moderationQueue'; values: unknown }[]
  txUpdateCalls: { values: unknown }[]
}

const state: ChainState = {
  selectResults: [],
  insertResults: [],
  flagEnabled: true,
  txInsertCalls: [],
  txUpdateCalls: [],
}

const makeSelectChain = () => {
  // Each call to db.select() pops the next result. Drizzle's chain methods
  // ALL return `this`-shaped objects that finally resolve as a Promise.
  const next = state.selectResults.shift() ?? []
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.innerJoin = vi.fn(() => chain)
  chain.leftJoin = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.orderBy = vi.fn(() => chain)
  chain.groupBy = vi.fn(() => chain)
  chain.offset = vi.fn(() => chain)
  // Make the chain `await`-able by attaching `.then`.
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builder is a thenable; tests must mimic that shape
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(next).then(resolve)
  return chain
}

const makeInsertChain = () => {
  const next = state.insertResults.shift() ?? [
    { slug: 'pothole-mg-7k3a', createdAt: new Date('2026-05-23T00:00:00Z') },
  ]
  const chain: Record<string, unknown> = {}
  chain.values = vi.fn(() => chain)
  chain.onConflictDoNothing = vi.fn(() => chain)
  chain.returning = vi.fn(async () => next)
  return chain
}

const makeTxChain = () => {
  const ops: Record<string, unknown> = {}
  ops.insert = vi.fn((tbl: unknown) => {
    // Distinguish complaint_flags from moderation_queue by introspecting
    // drizzle's internal symbol-keyed identity. Schema-level access via
    // `getTableName` would be cleaner, but here we inspect the `complaintSlug`
    // column presence: complaint_flags has `reporterId` while moderation_queue
    // has `targetKind`.
    // biome-ignore lint/suspicious/noExplicitAny: drizzle table internals
    const cols = (tbl as any) ?? {}
    const isFlag = Boolean(cols.reporterId)
    const tableTag: 'complaintFlags' | 'moderationQueue' = isFlag
      ? 'complaintFlags'
      : 'moderationQueue'
    const chain: Record<string, unknown> = {}
    chain.values = vi.fn((v: unknown) => {
      state.txInsertCalls.push({ table: tableTag, values: v })
      return chain
    })
    chain.onConflictDoNothing = vi.fn(async () => undefined)
    return chain
  })
  ops.update = vi.fn(() => {
    const chain: Record<string, unknown> = {}
    chain.set = vi.fn((v: unknown) => {
      state.txUpdateCalls.push({ values: v })
      return chain
    })
    chain.where = vi.fn(async () => undefined)
    return chain
  })
  return ops
}

const dbInstance = {
  select: vi.fn(() => makeSelectChain()),
  insert: vi.fn(() => makeInsertChain()),
  transaction: vi.fn(async (cb: (tx: ReturnType<typeof makeTxChain>) => Promise<void>) => {
    await cb(makeTxChain())
  }),
}

const createClientMock = vi.fn(() => dbInstance)

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

// Mock the flags module so we control S1_COMPLAINT_SUBMIT.
vi.mock('../../lib/flags.ts', () => ({
  isFlagEnabled: vi.fn(async (_db: unknown, _key: string) => state.flagEnabled),
}))

const VALID_NULLIFIER = `0x${'a'.repeat(64)}`

const baseCreateBody = {
  title: 'Pothole on MG Road',
  body: 'A persistent pothole has been at the corner for 3 weeks.',
  categorySlug: 'roads',
  stateCode: 'ka',
  districtCode: 'blr-u',
  pcCode: 'blr-s',
  acCode: 'btm-layout',
  photoUrls: [],
}

const fixtureCitizen = { id: 'cit_abc', nullifier: VALID_NULLIFIER }
const fixtureAcRow = {
  code: 'btm-layout',
  pcCode: 'blr-s',
  stateCode: 'ka',
  districtCode: 'blr-u',
  label: 'BTM Layout',
  reservation: 'general',
  createdAt: new Date('2026-01-01'),
}

const fixtureComplaintDetail = {
  slug: 'pothole-mg-7k3a',
  title: 'Pothole on MG Road',
  body: 'Body text',
  status: 'published',
  categorySlug: 'roads',
  categoryLabel: 'Roads',
  stateCode: 'ka',
  districtCode: 'blr-u',
  pcCode: 'blr-s',
  acCode: 'btm-layout',
  photoUrls: ['https://cdn.test/x.jpg'],
  createdAt: new Date('2026-05-20T00:00:00Z'),
  authorNullifier: VALID_NULLIFIER,
}

describe('POST /complaints', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    state.selectResults = []
    state.insertResults = []
    state.flagEnabled = true
    state.txInsertCalls = []
    state.txUpdateCalls = []
    dbInstance.select.mockClear()
    dbInstance.insert.mockClear()
    dbInstance.transaction.mockClear()
    createClientMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('DB_DOWN')
  })

  it('returns 503 when S1_COMPLAINT_SUBMIT is off', async () => {
    state.flagEnabled = false
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('S1_COMPLAINT_SUBMIT_OFF')
  })

  it('returns 401 when the x-factivist-nullifier header is missing', async () => {
    state.selectResults = [[]] // resolveCitizen lookup
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('UNVERIFIED')
  })

  it('returns 401 when the nullifier header is malformed', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': 'not-hex' },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when the nullifier is not in citizens', async () => {
    state.selectResults = [[]] // resolveCitizen → no row
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when the constituency tuple does not validate', async () => {
    state.selectResults = [
      [fixtureCitizen], // resolveCitizen
      [], // validateConstituencyTuple → none
    ]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('CONSTITUENCY_HIERARCHY_INVALID')
  })

  it('returns 400 when the Zod payload is invalid', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ ...baseCreateBody, title: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 201 with the new slug on happy path', async () => {
    state.selectResults = [[fixtureCitizen], [fixtureAcRow]]
    state.insertResults = [
      [{ slug: 'pothole-mg-7k3a', createdAt: new Date('2026-05-23T00:00:00Z') }],
    ]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { id: string; createdAt: string }
    expect(body.id).toBe('pothole-mg-7k3a')
    expect(typeof body.createdAt).toBe('string')
    expect(body).not.toHaveProperty('authorId')
    expect(body).not.toHaveProperty('nullifier')
  })

  it('rejects district-mismatch when AC has districtCode that disagrees', async () => {
    state.selectResults = [[fixtureCitizen], [{ ...fixtureAcRow, districtCode: 'different' }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(400)
  })

  it('retries on slug collision and returns 500 if all 3 attempts collide', async () => {
    state.selectResults = [[fixtureCitizen], [fixtureAcRow]]
    state.insertResults = [[], [], []]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('SLUG_COLLISION')
  })

  it('allows AC rows whose districtCode is null (PC spans districts)', async () => {
    state.selectResults = [[fixtureCitizen], [{ ...fixtureAcRow, districtCode: null }]]
    state.insertResults = [[{ slug: 'ok-slug-aa', createdAt: new Date('2026-05-23T00:00:00Z') }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(baseCreateBody),
    })
    expect(res.status).toBe(201)
  })
})

describe('GET /complaints/:slug', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    state.selectResults = []
    state.insertResults = []
    state.flagEnabled = true
    dbInstance.select.mockClear()
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a')
    expect(res.status).toBe(503)
  })

  it('returns 200 with full detail for published complaints', async () => {
    // 6 selects expected: 1 detail row + 1 flag count + 4 geo-label lookups
    // (state, district, pc, ac) — wave 3B `resolveGeoLabels`.
    state.selectResults = [
      [fixtureComplaintDetail],
      [{ total: 2 }],
      [{ label: 'Karnataka' }],
      [{ label: 'Bangalore Urban' }],
      [{ label: 'Bangalore South' }],
      [{ label: 'BTM Layout' }],
    ]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe('pothole-mg-7k3a')
    expect(body.disclaimer).toBe('User-submitted; not verified by Factivist.')
    expect(body.flagCount).toBe(2)
    // Real labels resolved from the four reference tables (closes the
    // wave-1 stub item #3 — labels are no longer the bare codes).
    expect(body.stateLabel).toBe('Karnataka')
    expect(body.districtLabel).toBe('Bangalore Urban')
    expect(body.pcLabel).toBe('Bangalore South')
    expect(body.acLabel).toBe('BTM Layout')
    expect(body).toHaveProperty('authorHandle')
    expect(body).not.toHaveProperty('authorNullifier')
    expect(body).not.toHaveProperty('authorId')
    expect(body).not.toHaveProperty('nullifier')
  })

  it('falls back to codes when a reference row is missing (graceful degradation)', async () => {
    // PC reference row missing — handler must still return 200 and surface
    // the code as the label rather than 500-ing.
    state.selectResults = [
      [fixtureComplaintDetail],
      [{ total: 0 }],
      [{ label: 'Karnataka' }],
      [{ label: 'Bangalore Urban' }],
      [], // pc missing
      [{ label: 'BTM Layout' }],
    ]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.pcLabel).toBe('blr-s')
    expect(body.stateLabel).toBe('Karnataka')
  })

  it('returns 404 when the complaint does not exist', async () => {
    state.selectResults = [[]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/unknown')
    expect(res.status).toBe(404)
  })

  it('returns 404 when the complaint exists but is not published', async () => {
    state.selectResults = [[{ ...fixtureComplaintDetail, status: 'moderation_pending' }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pending-x')
    expect(res.status).toBe(404)
  })

  it('returns flagCount=0 when the count subquery yields no rows', async () => {
    state.selectResults = [[fixtureComplaintDetail], []]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { flagCount: number }
    expect(body.flagCount).toBe(0)
  })

  it('truncates body excerpt at 280 chars with ellipsis', async () => {
    const longBody = 'x'.repeat(400)
    state.selectResults = [[{ ...fixtureComplaintDetail, body: longBody }], [{ total: 0 }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { bodyExcerpt: string; body: string }
    expect(body.body).toBe(longBody)
    expect(body.bodyExcerpt.endsWith('…')).toBe(true)
    expect(body.bodyExcerpt.length).toBeLessThanOrEqual(281)
  })

  it('returns photoUrls=[] when DB row carries no photoUrls', async () => {
    state.selectResults = [[{ ...fixtureComplaintDetail, photoUrls: null }], [{ total: 0 }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { photoUrls: string[] }
    expect(body.photoUrls).toEqual([])
  })
})

describe('POST /complaints/:slug/flag', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('DATABASE_URL', 'postgres://test')
    state.selectResults = []
    state.insertResults = []
    state.txInsertCalls = []
    state.txUpdateCalls = []
    dbInstance.select.mockClear()
    dbInstance.transaction.mockClear()
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'pii-leak' }),
    })
    expect(res.status).toBe(503)
  })

  it('returns 401 when the nullifier header is missing', async () => {
    state.selectResults = [[]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'pii-leak' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the target complaint does not exist', async () => {
    state.selectResults = [[fixtureCitizen], []]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/unknown/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'pii-leak' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 on invalid Zod body (unknown reason)', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'defamation' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 204 on the happy path and opens both flag + moderation case', async () => {
    state.selectResults = [[fixtureCitizen], [{ slug: 'pothole-mg-7k3a' }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'pii-leak', note: 'PII visible' }),
    })
    expect(res.status).toBe(204)
    // body should be empty
    const text = await res.text()
    expect(text).toBe('')
    expect(dbInstance.transaction).toHaveBeenCalledOnce()
    expect(state.txInsertCalls.length).toBeGreaterThanOrEqual(2)
    const flagInsert = state.txInsertCalls.find((c) => c.table === 'complaintFlags')
    expect(flagInsert).toBeDefined()
    expect((flagInsert?.values as { reason: string }).reason).toBe('pii-leak')
    const queueInsert = state.txInsertCalls.find((c) => c.table === 'moderationQueue')
    expect(queueInsert).toBeDefined()
  })

  it('maps non-overlapping reporter reasons to moderation `other`', async () => {
    state.selectResults = [[fixtureCitizen], [{ slug: 'pothole-mg-7k3a' }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'harassment' }),
    })
    expect(res.status).toBe(204)
    const queueInsert = state.txInsertCalls.find((c) => c.table === 'moderationQueue')
    expect((queueInsert?.values as { reason: string }).reason).toBe('other')
  })

  it('maps misinformation → false', async () => {
    state.selectResults = [[fixtureCitizen], [{ slug: 'pothole-mg-7k3a' }]]
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'misinformation' }),
    })
    expect(res.status).toBe(204)
    const queueInsert = state.txInsertCalls.find((c) => c.table === 'moderationQueue')
    expect((queueInsert?.values as { reason: string }).reason).toBe('false')
  })

  it('attempts an SLA tighten via UPDATE in the same transaction', async () => {
    state.selectResults = [[fixtureCitizen], [{ slug: 'pothole-mg-7k3a' }]]
    const { createApp } = await import('../../app.ts')
    await createApp().request('/complaints/pothole-mg-7k3a/flag', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ reason: 'pii-leak' }),
    })
    expect(state.txUpdateCalls.length).toBe(1)
    expect((state.txUpdateCalls[0]?.values as { slaDueAt: Date }).slaDueAt).toBeInstanceOf(Date)
  })
})
