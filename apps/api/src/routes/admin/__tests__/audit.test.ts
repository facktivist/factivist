/**
 * Integration tests for the admin audit-log browse route.
 *
 * Uses `app.request()` so no HTTP server is required. The Drizzle client
 * is stubbed at the module boundary; the chained query builder records
 * every call site so tests can assert on:
 *
 *   - WHERE clause composition for the date / actor / action / targetKind
 *     filters (validated via the stubbed select chain).
 *   - LIMIT / OFFSET / ORDER BY (pagination + ts DESC).
 *   - Response key shape — no citizen identifier may surface, ever.
 */

import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ──────────────────────────────────────────────────────────────────────
// Drizzle client stub. The chain captures every call so the tests can
// inspect `select` projection, the `where`/`orderBy`/`limit`/`offset`
// arguments, and the rows the route returned.
// ──────────────────────────────────────────────────────────────────────

const { auditRows, lastSelect, createClientMock } = vi.hoisted(() => {
  const auditRows: { rows: unknown[] } = { rows: [] }
  const lastSelect: {
    selectArg?: unknown
    whereArg?: unknown
    orderByArg?: unknown
    limitArg?: number
    offsetArg?: number
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
                  limit: (limitArg: number) => {
                    lastSelect.limitArg = limitArg
                    return {
                      offset: async (offsetArg: number) => {
                        lastSelect.offsetArg = offsetArg
                        return auditRows.rows
                      },
                    }
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
  return { auditRows, lastSelect, createClientMock }
})

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

import { adminAuditRoute } from '../audit.ts'

const PII_KEY_PATTERN = /nullifier|aadhaar|ip_address|user_agent/i
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

const FIXED_TS = new Date('2026-05-23T12:00:00.000Z')

const makeAuditRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'al_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  actor: 'usr_admin',
  action: 'moderation.decide',
  targetKind: 'moderation_case',
  targetId: 'mq_1',
  payloadHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  rationale: null,
  ts: FIXED_TS,
  ...over,
})

const mountApp = () => new Hono().route('/', adminAuditRoute)

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
  vi.stubEnv('DATABASE_URL', 'postgresql://test')
  auditRows.rows = []
  lastSelect.selectArg = undefined
  lastSelect.whereArg = undefined
  lastSelect.orderByArg = undefined
  lastSelect.limitArg = undefined
  lastSelect.offsetArg = undefined
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /admin/audit-log — RBAC', () => {
  it('200 for admin role', async () => {
    auditRows.rows = [makeAuditRow()]
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toHaveLength(1)
  })

  it('401 for moderator (admin-only)', async () => {
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'moderator' },
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('401 for public/no role', async () => {
    const res = await mountApp().request('/admin/audit-log')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })
})

describe('GET /admin/audit-log — response shape & anonymity floor', () => {
  it('returns the documented whitelist of keys per row', async () => {
    auditRows.rows = [makeAuditRow()]
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<Record<string, unknown>> }
    expect(body.items).toHaveLength(1)
    const keys = Object.keys(body.items[0] ?? {}).sort()
    expect(keys).toEqual(
      ['id', 'actor', 'action', 'targetKind', 'targetId', 'payloadHash', 'rationale', 'ts'].sort(),
    )
  })

  it('response payload contains ZERO forbidden keys (deep walk)', async () => {
    auditRows.rows = [makeAuditRow(), makeAuditRow({ id: 'al_2' })]
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = await res.json()
    for (const k of collectKeys(body)) {
      expect(PII_KEY_PATTERN.test(k), `forbidden key leaked: ${k}`).toBe(false)
    }
  })

  it('serialises ts as an ISO string', async () => {
    auditRows.rows = [makeAuditRow()]
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: Array<{ ts: string }> }
    expect(body.items[0]?.ts).toBe(FIXED_TS.toISOString())
  })

  it('coerces non-Date ts via String() fallback', async () => {
    // Some drivers may surface timestamps as strings; the route must
    // not blow up on a non-Date `ts` column.
    auditRows.rows = [makeAuditRow({ ts: '2026-05-23T12:00:00.000Z' })]
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: Array<{ ts: string }> }
    expect(body.items[0]?.ts).toBe('2026-05-23T12:00:00.000Z')
  })

  it('explicit SELECT projection includes ONLY the eight contract columns', async () => {
    auditRows.rows = [makeAuditRow()]
    await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const keys = Object.keys((lastSelect.selectArg as Record<string, unknown>) ?? {}).sort()
    expect(keys).toEqual(
      ['id', 'actor', 'action', 'targetKind', 'targetId', 'payloadHash', 'rationale', 'ts'].sort(),
    )
  })
})

describe('GET /admin/audit-log — filters', () => {
  it('applies no WHERE clause when no filters are provided', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeUndefined()
  })

  it('builds a WHERE clause when `from` is supplied', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?from=2026-05-01', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeDefined()
  })

  it('builds a WHERE clause when `to` is supplied', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?to=2026-05-31', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeDefined()
  })

  it('builds a WHERE clause when `actor` is supplied', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?actor=usr_admin', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeDefined()
  })

  it('honours a known `action` filter', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?action=moderation.decide', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeDefined()
  })

  it('silently drops an unknown `action` filter (no WHERE)', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?action=unknown.action', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeUndefined()
  })

  it('honours a known `targetKind` filter', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?targetKind=grievance', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeDefined()
  })

  it('silently drops an unknown `targetKind` filter', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?targetKind=unknown_kind', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeUndefined()
  })

  it('silently drops malformed date params', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?from=not-a-date&to=also-bad', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.whereArg).toBeUndefined()
  })
})

describe('GET /admin/audit-log — pagination', () => {
  it('defaults to page=1 pageSize=20', async () => {
    auditRows.rows = []
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { page: number; pageSize: number; hasNext: boolean }
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
    expect(body.hasNext).toBe(false)
    // limit is pageSize+1 (over-fetch for hasNext)
    expect(lastSelect.limitArg).toBe(21)
    expect(lastSelect.offsetArg).toBe(0)
  })

  it('clamps pageSize to MAX_PAGE_SIZE=100', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?pageSize=9999', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.limitArg).toBe(101)
  })

  it('clamps invalid page/pageSize values to defaults', async () => {
    auditRows.rows = []
    const res = await mountApp().request('/admin/audit-log?page=banana&pageSize=carrot', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { page: number; pageSize: number }
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
  })

  it('computes offset = (page - 1) * pageSize', async () => {
    auditRows.rows = []
    await mountApp().request('/admin/audit-log?page=3&pageSize=10', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(lastSelect.offsetArg).toBe(20)
    expect(lastSelect.limitArg).toBe(11)
  })

  it('sets hasNext=true when the over-fetch returns one extra row', async () => {
    // pageSize=2, return 3 rows
    auditRows.rows = [makeAuditRow(), makeAuditRow({ id: 'al_2' }), makeAuditRow({ id: 'al_3' })]
    const res = await mountApp().request('/admin/audit-log?pageSize=2', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: unknown[]; hasNext: boolean }
    expect(body.items).toHaveLength(2)
    expect(body.hasNext).toBe(true)
  })

  it('sets hasNext=false when the over-fetch returns exactly pageSize rows', async () => {
    auditRows.rows = [makeAuditRow(), makeAuditRow({ id: 'al_2' })]
    const res = await mountApp().request('/admin/audit-log?pageSize=2', {
      headers: { 'x-factivist-role': 'admin' },
    })
    const body = (await res.json()) as { items: unknown[]; hasNext: boolean }
    expect(body.items).toHaveLength(2)
    expect(body.hasNext).toBe(false)
  })
})

describe('GET /admin/audit-log — DATABASE_URL guard', () => {
  it('returns 500 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const res = await mountApp().request('/admin/audit-log', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(500)
  })
})
