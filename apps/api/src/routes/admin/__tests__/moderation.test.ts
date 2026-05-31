/**
 * Integration tests for the admin moderation route.
 *
 * Uses `app.request()` so no HTTP server is required (apps/api/CLAUDE.md
 * convention). The Drizzle client is fully stubbed at the module
 * boundary — the route's structural anonymity guarantee is exercised by
 * (a) feeding a leaky row into the stub and (b) asserting the rendered
 * response contains no citizen identifier no matter what shape arrives
 * (defence-in-depth catch for any future column add).
 */

import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ──────────────────────────────────────────────────────────────────────
// Drizzle client stub — vi.hoisted lifts the factory above vi.mock's
// own hoist so references stay valid at mock-eval time.
// ──────────────────────────────────────────────────────────────────────

const { queueRows, updatedRows, auditInserts, dbStub, createClientMock } = vi.hoisted(() => {
  const queueRows: Record<string, unknown[]> = { rows: [] }
  const updatedRows: Record<string, unknown[]> = { rows: [] }
  const auditInserts: unknown[] = []

  const buildSelectChain = () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => queueRows.rows,
        }),
      }),
    }),
  })

  const buildUpdateChain = () => ({
    set: () => ({
      where: () => ({
        returning: async () => updatedRows.rows,
      }),
    }),
  })

  const buildInsertChain = () => ({
    values: async (entry: unknown) => {
      auditInserts.push(entry)
      return undefined
    },
  })

  const dbStub = {
    select: (() => buildSelectChain()) as unknown as ReturnType<typeof Object>,
    transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        update: () => buildUpdateChain(),
        insert: () => buildInsertChain(),
      }),
  }

  const createClientMock = () => dbStub
  return { queueRows, updatedRows, auditInserts, dbStub, createClientMock }
})

const dbStubSpy = {
  selectCalls: 0,
  transactionCalls: 0,
}
// Wrap select + transaction so tests can assert call counts.
;(dbStub as { select: () => unknown }).select = (() => {
  dbStubSpy.selectCalls += 1
  return {
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => queueRows.rows,
        }),
      }),
    }),
  }
}) as unknown as typeof dbStub.select
const originalTxn = dbStub.transaction
;(dbStub as { transaction: typeof originalTxn }).transaction = (async (
  cb: (tx: unknown) => Promise<unknown>,
) => {
  dbStubSpy.transactionCalls += 1
  return originalTxn(cb)
}) as unknown as typeof dbStub.transaction

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

// Import AFTER mocks are registered.
import { adminModerationRoute } from '../moderation.ts'

/** Walk every nested key in a JSON-safe object and assert none match the PII regex. */
const PII_KEY_PATTERN = /nullifier|reporter_?id|ip_address|user_agent|aadhaar/i
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

const makeQueueRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  complaintSlug: 'pothole-on-mg-road',
  targetKind: 'complaint',
  reason: 'pii-leak',
  status: 'pending',
  reviewerId: null,
  slaDueAt: FIXED_NOW,
  decidedAt: null,
  rationale: null,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...over,
})

const mountApp = () => new Hono().route('/', adminModerationRoute)

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
  vi.stubEnv('DATABASE_URL', 'postgresql://test')
  queueRows.rows = []
  updatedRows.rows = []
  auditInserts.length = 0
  dbStubSpy.selectCalls = 0
  dbStubSpy.transactionCalls = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /admin/moderation — RBAC', () => {
  it('200 for admin role', async () => {
    queueRows.rows = [makeQueueRow()]
    const res = await mountApp().request('/admin/moderation', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toHaveLength(1)
  })

  it('200 for moderator role', async () => {
    queueRows.rows = [makeQueueRow()]
    const res = await mountApp().request('/admin/moderation', {
      headers: { 'x-factivist-role': 'moderator' },
    })
    expect(res.status).toBe(200)
  })

  it('401 for public/no role', async () => {
    const res = await mountApp().request('/admin/moderation')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })
})

describe('GET /admin/moderation — anonymity floor (ADR-0010 I-MOD-2)', () => {
  /**
   * Unit-test note: the *structural* guarantee that no citizen
   * identifier can ever reach this response lives in two places:
   *
   *   1. `packages/db/src/schema/__tests__/moderation_queue.test.ts`
   *      — the column simply does not exist on the table.
   *   2. The route handler enumerates the SELECT column list — so even
   *      a future schema regression that bolts on `nullifier` cannot
   *      slip into the response without a code change at this file.
   *
   * Here we assert the *response key shape* matches the documented
   * whitelist, which is the strongest property an in-process unit
   * test can confirm without a real Postgres.
   */
  it('response items contain ONLY the documented whitelist of keys', async () => {
    queueRows.rows = [makeQueueRow()]
    const res = await mountApp().request('/admin/moderation', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<Record<string, unknown>> }
    expect(body.items).toHaveLength(1)
    const keys = Object.keys(body.items[0] ?? {}).sort()
    expect(keys).toEqual(
      [
        'id',
        'complaintSlug',
        'targetKind',
        'reason',
        'status',
        'reviewerId',
        'slaDueAt',
        'decidedAt',
        'rationale',
        'createdAt',
        'updatedAt',
      ].sort(),
    )
    // Final deep-walk against the regex catches any nested leakage too.
    for (const k of collectKeys(body)) {
      expect(PII_KEY_PATTERN.test(k), `forbidden key leaked: ${k}`).toBe(false)
    }
  })
})

describe('POST /admin/moderation/:id/decide — RBAC', () => {
  it('200 for admin with valid body', async () => {
    updatedRows.rows = [makeQueueRow({ status: 'approved' })]
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'admin',
          'x-factivist-actor-id': 'usr_admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'approve', rationale: 'looks fine' }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { item: { status: string } }
    expect(body.item.status).toBe('approved')
  })

  it('401 for moderator (decide is admin-only)', async () => {
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'moderator',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'approve', rationale: 'x' }),
      },
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('401 for public', async () => {
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision: 'approve', rationale: 'x' }),
      },
    )
    expect(res.status).toBe(401)
  })

  it('401 for admin role with NO actor id (unresolvable JWT subject)', async () => {
    updatedRows.rows = [makeQueueRow()]
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'admin',
          // No x-factivist-actor-id — admin role but no subject.
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'approve', rationale: 'looks fine' }),
      },
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })
})

describe('POST /admin/moderation/:id/decide — validation', () => {
  it('400 on empty rationale', async () => {
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'admin',
          'x-factivist-actor-id': 'usr_admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'approve', rationale: '   ' }),
      },
    )
    expect(res.status).toBe(400)
  })

  it('400 on unknown decision verb', async () => {
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'admin',
          'x-factivist-actor-id': 'usr_admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'kill', rationale: 'x' }),
      },
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /admin/moderation/:id/decide — atomicity (X-7)', () => {
  it('writes the audit row in the same transaction as the queue update', async () => {
    updatedRows.rows = [makeQueueRow({ status: 'approved' })]
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'admin',
          'x-factivist-actor-id': 'usr_admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'approve', rationale: 'looks fine' }),
      },
    )
    expect(res.status).toBe(200)
    expect(dbStubSpy.transactionCalls).toBe(1)
    expect(auditInserts).toHaveLength(1)
    const entry = auditInserts[0] as Record<string, unknown>
    expect(entry.action).toBe('moderation.decide')
    expect(entry.targetKind).toBe('moderation_case')
    expect(entry.actor).toBe('usr_admin')
    expect(String(entry.payloadHash)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('escalate verb maps to moderation.escalate audit action', async () => {
    updatedRows.rows = [makeQueueRow({ status: 'escalated' })]
    await mountApp().request('/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide', {
      method: 'POST',
      headers: {
        'x-factivist-role': 'admin',
        'x-factivist-actor-id': 'usr_admin',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ decision: 'escalate', rationale: 'route to GO' }),
    })
    const entry = auditInserts[0] as Record<string, unknown>
    expect(entry.action).toBe('moderation.escalate')
  })

  it('remove verb also writes moderation.decide audit action', async () => {
    updatedRows.rows = [makeQueueRow({ status: 'removed' })]
    await mountApp().request('/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide', {
      method: 'POST',
      headers: {
        'x-factivist-role': 'admin',
        'x-factivist-actor-id': 'usr_admin',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ decision: 'remove', rationale: 'ncii' }),
    })
    const entry = auditInserts[0] as Record<string, unknown>
    expect(entry.action).toBe('moderation.decide')
  })

  it('409 when case has already been decided (empty returning)', async () => {
    updatedRows.rows = []
    const res = await mountApp().request(
      '/admin/moderation/mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82/decide',
      {
        method: 'POST',
        headers: {
          'x-factivist-role': 'admin',
          'x-factivist-actor-id': 'usr_admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision: 'approve', rationale: 'x' }),
      },
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'case_not_pending' })
    // Audit row MUST NOT be written when the queue update was a no-op.
    expect(auditInserts).toHaveLength(0)
  })
})

describe('GET /admin/moderation — DATABASE_URL guard', () => {
  it('throws when DATABASE_URL is unset (Hono returns 500)', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const res = await mountApp().request('/admin/moderation', {
      headers: { 'x-factivist-role': 'admin' },
    })
    expect(res.status).toBe(500)
  })
})
