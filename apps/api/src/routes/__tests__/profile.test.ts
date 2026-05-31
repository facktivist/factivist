import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface ChainState {
  selectResults: unknown[][]
}

const state: ChainState = { selectResults: [] }

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

const dbMock = {
  select: vi.fn(() => makeSelectChain()),
}

vi.mock('@factivist/db/client', () => ({
  createClient: () => dbMock,
}))

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

import { profileRoute } from '../profile.ts'

const app = new Hono().route('/', profileRoute)

beforeEach(() => {
  state.selectResults = []
  process.env.DATABASE_URL = 'postgres://test'
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /me', () => {
  it('401 when no session cookie', async () => {
    const res = await app.request('/me')
    expect(res.status).toBe(401)
  })

  it('503 when DATABASE_URL is unset (after auth)', async () => {
    delete process.env.DATABASE_URL
    const res = await app.request('/me', { headers: { cookie: 'factivist-session=tok' } })
    expect(res.status).toBe(503)
  })

  it('401 when the session nullifier does not map to a citizen', async () => {
    state.selectResults = [[]] // citizen lookup empty
    const res = await app.request('/me', { headers: { cookie: 'factivist-session=tok' } })
    expect(res.status).toBe(401)
  })

  it('200 with the profile shape on happy path', async () => {
    const fixedDate = new Date('2026-05-01T10:00:00.000Z')
    state.selectResults = [
      [{ id: 'cit_1', createdAt: fixedDate }], // citizen lookup
      [{ total: 7 }], // complaint count
      [{ total: 13 }], // comment count
      [{ total: 2 }], // flags received
    ]
    const res = await app.request('/me', { headers: { cookie: 'factivist-session=tok' } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      handle: string
      nullifierExcerpt: string
      stats: { complaintCount: number; commentCount: number; flagsReceived: number }
      joinedAt: string
    }
    expect(body.nullifierExcerpt).toBe('0xaaaa')
    expect(body.nullifierExcerpt.length).toBeLessThanOrEqual(8)
    expect(body.stats).toEqual({ complaintCount: 7, commentCount: 13, flagsReceived: 2 })
    expect(body.joinedAt).toBe(fixedDate.toISOString())
    expect(typeof body.handle).toBe('string')
  })

  it('clamps counts to zero when the rollup row is empty', async () => {
    state.selectResults = [
      [{ id: 'cit_1', createdAt: new Date() }],
      [], // complaint count missing
      [], // comment count missing
      [], // flags missing
    ]
    const res = await app.request('/me', { headers: { cookie: 'factivist-session=tok' } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      stats: { complaintCount: number; commentCount: number; flagsReceived: number }
    }
    expect(body.stats).toEqual({ complaintCount: 0, commentCount: 0, flagsReceived: 0 })
  })
})
