/**
 * Integration tests for the admin grievance inbox browse route.
 *
 * The Drizzle client is stubbed at the module boundary. The handler MUST:
 *
 *   - 401 anyone but `admin`.
 *   - Project ONLY the six contract columns from `moderation_queue` —
 *     `complainantName` / `complainantEmail` are not on the table at all,
 *     but the explicit projection is asserted here as defence-in-depth.
 *   - Serialise timestamps as ISO strings.
 *   - Never surface a key matching the forbidden regex (nullifier /
 *     aadhaar / ip_address / user_agent) nor any complainant key.
 */

import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { grievanceRows, lastSelect, createClientMock } = vi.hoisted(() => {
  const grievanceRows: { rows: unknown[] } = { rows: [] }
  const lastSelect: {
    selectArg?: unknown
    whereArg?: unknown
    orderByArg?: unknown
    limitArg?: number
  } = {}

  const dbStub = {
    select: (selectArg: unknown) => {
      lastSelect.selectArg = selectArg
      return {
        from: () => ({
          where: (whereArg: unknown) => {
            lastSelect.whereArg = whereArg
            return {
              orderBy: (orderByArg: unknown) => {
                lastSelect.orderByArg = orderByArg
                return {
                  limit: async (limitArg: number) => {
                    lastSelect.limitArg = limitArg
                    return grievanceRows.rows
                  },
                }
              },
            }
          },
        }),
      }
    },
  }

  const createClientMock = () => dbStub
  return { grievanceRows, lastSelect, createClientMock }
})

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

import { adminGrievancesRoute } from '../grievances.ts'

const FORBIDDEN_PII_PATTERN = /nullifier|aadhaar|ip_address|user_agent/i
const FORBIDDEN_COMPLAINANT_PATTERN = /complainantName|complainantEmail/
const collectKeys = (value: unknown, out: string[] = []): string[] => {
  if (value === null || typeof value !== 'object') return out
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, out)
    return out
  }
  for (const [k, v] of Object.entries(value)) {
    out.push(k)
    collectKeys(v, out)
  }
  return out
}

const FIXED_NOW = new Date('2026-05-23T12:00:00.000Z')
const FIXED_SLA = new Date('2026-05-24T12:00:00.000Z')

const makeRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  complaintSlug: 'pothole-on-mg-road',
  reason: 'ncii',
  status: 'pending',
  slaDueAt: FIXED_SLA,
  createdAt: FIXED_NOW,
  ...over,
})

const mountApp = () => new Hono().route('/', adminGrievancesRoute)

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
  vi.stubEnv('DATABASE_URL', 'postgresql://test')
  grievanceRows.rows = []
  lastSelect.selectArg = undefined
  lastSelect.whereArg = undefined
  lastSelect.orderByArg = undefined
  lastSelect.limitArg = undefined
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /admin/grievances — RBAC', () => {
  it('200 for admin role', async () => {
    grievanceRows.rows = [makeRow()]
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toHaveLength(1)
  })

  it('401 for moderator (admin-only)', async () => {
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'moderator' },
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('401 for public/no role', async () => {
    const res = await mountApp().request('/admin/grievances')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })
})

describe('GET /admin/grievances — response shape & minimisation invariant', () => {
  it('returns the documented whitelist of six keys per row', async () => {
    grievanceRows.rows = [makeRow()]
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: Array<Record<string, unknown>> }
    const keys = Object.keys(body.items[0] ?? {}).sort()
    expect(keys).toEqual(
      ['id', 'complaintSlug', 'reason', 'status', 'slaDueAt', 'createdAt'].sort(),
    )
  })

  it('explicit SELECT projection includes ONLY the six contract columns', async () => {
    grievanceRows.rows = [makeRow()]
    await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const keys = Object.keys((lastSelect.selectArg as Record<string, unknown>) ?? {}).sort()
    expect(keys).toEqual(
      ['id', 'complaintSlug', 'reason', 'status', 'slaDueAt', 'createdAt'].sort(),
    )
  })

  it('response payload contains ZERO forbidden anonymity keys (deep walk)', async () => {
    grievanceRows.rows = [makeRow(), makeRow({ id: 'mq_2' })]
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = await res.json()
    for (const k of collectKeys(body)) {
      expect(FORBIDDEN_PII_PATTERN.test(k), `forbidden PII key leaked: ${k}`).toBe(false)
    }
  })

  it('response payload contains ZERO complainantName / complainantEmail keys', async () => {
    // Even if a future regression hands these to the handler from the DB
    // stub, the explicit projection in the route MUST strip them.
    grievanceRows.rows = [
      {
        ...makeRow(),
        complainantName: 'A. Journalist',
        complainantEmail: 'journo@example.com',
      },
    ]
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = await res.json()
    for (const k of collectKeys(body)) {
      expect(
        FORBIDDEN_COMPLAINANT_PATTERN.test(k),
        `complainant key leaked into admin response: ${k}`,
      ).toBe(false)
    }
    // The handler reads the explicit projection from the DB stub; the
    // extra keys above are simulating a leaky stub, not a real row. The
    // route's `.map()` step is what enforces the contract.
    const json = JSON.stringify(body)
    expect(json).not.toContain('A. Journalist')
    expect(json).not.toContain('journo@example.com')
  })

  it('serialises slaDueAt and createdAt as ISO strings', async () => {
    grievanceRows.rows = [makeRow()]
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: Array<{ slaDueAt: string; createdAt: string }> }
    expect(body.items[0]?.slaDueAt).toBe(FIXED_SLA.toISOString())
    expect(body.items[0]?.createdAt).toBe(FIXED_NOW.toISOString())
  })

  it('coerces non-Date timestamp shapes via String() fallback', async () => {
    // Some drivers may surface timestamps as strings rather than Date
    // objects depending on the column mode; the route must not blow up.
    grievanceRows.rows = [
      makeRow({
        slaDueAt: '2026-05-24T12:00:00.000Z',
        createdAt: '2026-05-23T12:00:00.000Z',
      }),
    ]
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: Array<{ slaDueAt: string; createdAt: string }> }
    expect(body.items[0]?.slaDueAt).toBe('2026-05-24T12:00:00.000Z')
    expect(body.items[0]?.createdAt).toBe('2026-05-23T12:00:00.000Z')
  })
})

describe('GET /admin/grievances — query composition', () => {
  it('applies a WHERE filter (status pending + grievance reasons)', async () => {
    grievanceRows.rows = []
    await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeDefined()
  })

  it('orders by slaDueAt ascending and caps at 100 rows', async () => {
    grievanceRows.rows = []
    await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.orderByArg).toBeDefined()
    expect(lastSelect.limitArg).toBe(100)
  })

  it('returns an empty list (200 with items=[]) when no rows match', async () => {
    grievanceRows.rows = []
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toEqual([])
  })
})

describe('GET /admin/grievances — DATABASE_URL guard', () => {
  it('returns 500 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const res = await mountApp().request('/admin/grievances', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(500)
  })
})
