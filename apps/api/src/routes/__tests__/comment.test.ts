import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Integration-style tests for `/comments` routes.
 *
 * Uses `app.request()` per apps/api/CLAUDE.md. Mocks drizzle at the
 * module boundary so we can drive responses per call.
 */

interface ChainState {
  selectResults: unknown[][]
  insertResults: unknown[][]
}

const state: ChainState = {
  selectResults: [],
  insertResults: [],
}

const makeSelectChain = () => {
  const next = state.selectResults.shift() ?? []
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.innerJoin = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  // biome-ignore lint/suspicious/noThenProperty: drizzle is a thenable
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(next).then(resolve)
  return chain
}

const makeInsertChain = () => {
  const next = state.insertResults.shift() ?? []
  const chain: Record<string, unknown> = {}
  chain.values = vi.fn(() => chain)
  chain.returning = vi.fn(async () => next)
  return chain
}

const dbMock = {
  select: vi.fn(() => makeSelectChain()),
  insert: vi.fn(() => makeInsertChain()),
}

vi.mock('@factivist/db/client', () => ({
  createClient: () => dbMock,
}))

// session-cookie module needs FACTIVIST_SESSION_SECRET; mock so tests
// can drive the verify result deterministically.
const verifyResult = {
  ok: true as const,
  payload: {
    nullifier: '0xaaaa',
    handle: 'h',
    stateCode: 'KA',
    districtCode: 'BLR',
    sessionNonce: 'n',
    issuedAt: 0,
  },
}
vi.mock('../../lib/session-cookie.ts', () => ({
  extractSessionCookie: (cookie: string) => (cookie.includes('factivist-session=') ? 'tok' : null),
  verifySession: () => verifyResult,
}))

import { commentRoute } from '../comment.ts'

const app = new Hono().route('/', commentRoute)

beforeEach(() => {
  state.selectResults = []
  state.insertResults = []
  process.env.DATABASE_URL = 'postgres://test'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /comments', () => {
  it('400 when complaint_slug is missing', async () => {
    const res = await app.request('/comments')
    expect(res.status).toBe(400)
  })

  it('503 when DATABASE_URL is unset', async () => {
    delete process.env.DATABASE_URL
    const res = await app.request('/comments?complaint_slug=x')
    expect(res.status).toBe(503)
  })

  it('404 when the parent complaint does not exist', async () => {
    state.selectResults = [[]] // parent lookup → empty
    const res = await app.request('/comments?complaint_slug=missing')
    expect(res.status).toBe(404)
  })

  it('404 when the parent complaint is not published', async () => {
    state.selectResults = [[{ status: 'pending' }]]
    const res = await app.request('/comments?complaint_slug=pending')
    expect(res.status).toBe(404)
  })

  it('returns the flat comment list with derived author handles', async () => {
    const fixedDate = new Date('2026-05-20T10:00:00.000Z')
    state.selectResults = [
      [{ status: 'published' }],
      [
        {
          id: 'cmt_1',
          parentId: null,
          complaintSlug: 'pothole',
          body: 'First',
          flaggedState: 'ok',
          createdAt: fixedDate,
          authorNullifier: '0xaaaa',
        },
      ],
    ]
    const res = await app.request('/comments?complaint_slug=pothole')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<Record<string, unknown>> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.id).toBe('cmt_1')
    expect(body.items[0]?.body).toBe('First')
    expect(body.items[0]?.flagged).toBe(false)
    // authorHandle is deriveHandle(nullifier); we only check shape.
    expect(typeof body.items[0]?.authorHandle).toBe('string')
  })

  it('orders comments by createdAt ascending', async () => {
    const a = new Date('2026-05-21T00:00:00Z')
    const b = new Date('2026-05-20T00:00:00Z') // earlier
    state.selectResults = [
      [{ status: 'published' }],
      [
        {
          id: 'a',
          parentId: null,
          complaintSlug: 's',
          body: 'A',
          flaggedState: 'ok',
          createdAt: a,
          authorNullifier: '0x1',
        },
        {
          id: 'b',
          parentId: null,
          complaintSlug: 's',
          body: 'B',
          flaggedState: 'ok',
          createdAt: b,
          authorNullifier: '0x2',
        },
      ],
    ]
    const res = await app.request('/comments?complaint_slug=s')
    const body = (await res.json()) as { items: Array<{ id: string }> }
    expect(body.items.map((c) => c.id)).toEqual(['b', 'a'])
  })
})

describe('POST /comments', () => {
  const validBody = JSON.stringify({ complaintSlug: 's', body: 'hello' })
  const headers = {
    'content-type': 'application/json',
    cookie: 'factivist-session=tok',
  }

  it('400 on Zod failure (empty body)', async () => {
    const res = await app.request('/comments', {
      method: 'POST',
      headers,
      body: JSON.stringify({ complaintSlug: 's', body: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('401 when no session cookie', async () => {
    const res = await app.request('/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    })
    expect(res.status).toBe(401)
  })

  it('404 when parent complaint is unpublished', async () => {
    state.selectResults = [[{ status: 'draft' }]]
    const res = await app.request('/comments', { method: 'POST', headers, body: validBody })
    expect(res.status).toBe(404)
  })

  it('401 when nullifier cannot be resolved to a citizen', async () => {
    state.selectResults = [[{ status: 'published' }], []]
    const res = await app.request('/comments', { method: 'POST', headers, body: validBody })
    expect(res.status).toBe(401)
  })

  it('400 when parentId belongs to a different complaint', async () => {
    state.selectResults = [
      [{ status: 'published' }], // parent complaint
      [{ id: 'cit_1' }], // citizen lookup
      [{ complaintSlug: 'other-slug' }], // parent comment lookup → mismatch
    ]
    const res = await app.request('/comments', {
      method: 'POST',
      headers,
      body: JSON.stringify({ complaintSlug: 's', body: 'hi', parentId: 'cmt_other' }),
    })
    expect(res.status).toBe(400)
  })

  it('201 with the new comment payload on a happy-path top-level reply', async () => {
    const createdAt = new Date('2026-05-22T08:00:00Z')
    state.selectResults = [[{ status: 'published' }], [{ id: 'cit_1' }]]
    state.insertResults = [
      [{ id: 'cmt_new', parentId: null, complaintSlug: 's', body: 'hello', createdAt }],
    ]
    const res = await app.request('/comments', { method: 'POST', headers, body: validBody })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe('cmt_new')
    expect(body.body).toBe('hello')
    expect(body.flagged).toBe(false)
    expect(typeof body.authorHandle).toBe('string')
  })

  it('201 with a child comment when parentId belongs to the same complaint', async () => {
    state.selectResults = [[{ status: 'published' }], [{ id: 'cit_1' }], [{ complaintSlug: 's' }]]
    state.insertResults = [
      [
        {
          id: 'cmt_child',
          parentId: 'cmt_parent',
          complaintSlug: 's',
          body: 'reply',
          createdAt: new Date('2026-05-22T09:00:00Z'),
        },
      ],
    ]
    const res = await app.request('/comments', {
      method: 'POST',
      headers,
      body: JSON.stringify({ complaintSlug: 's', body: 'reply', parentId: 'cmt_parent' }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.parentId).toBe('cmt_parent')
  })
})
