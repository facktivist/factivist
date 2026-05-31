/**
 * Unit tests for the `recordDevMetric` helper.
 *
 * ATID-IDENT-004 contract under test:
 *
 *   1. The helper validates events through `devMetricEventSchema` BEFORE
 *      hitting the DB — a stray nullifier / Aadhaar / IP / UA cannot
 *      reach Postgres even if a future caller forgets.
 *   2. Validated rows land on `dev_metrics.zkp_route_events` with the
 *      exact column shape the cost-analyst scorecard expects.
 *   3. DB write failures are swallowed with a single warning — the
 *      proving response MUST NOT block on observability.
 *   4. Malformed event payloads throw synchronously so the test suite
 *      catches programmer bugs early. Route callers `void` the promise
 *      so this rejection never bubbles into a citizen response.
 */

import { zkpRouteEvents } from '@factivist/db/schema'
import type { DevMetricEvent } from '@factivist/shared/validators'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setWarnSink, type DevMetricsDb, recordDevMetric } from '../dev-metrics.ts'

// ─── Test DB stub ─────────────────────────────────────────────────────────
//
// We capture every `values()` argument so each test can introspect the
// exact row Drizzle would have written. The stub matches the minimal
// `DevMetricsDb` interface — no driver dependency.

interface CapturedInsert {
  table: typeof zkpRouteEvents
  row: Record<string, unknown>
}

const makeDbStub = (
  shouldThrow: Error | null = null,
): { db: DevMetricsDb; captured: CapturedInsert[] } => {
  const captured: CapturedInsert[] = []
  const db: DevMetricsDb = {
    insert: (table) => ({
      values: async (row) => {
        captured.push({ table, row })
        if (shouldThrow) throw shouldThrow
      },
    }),
  }
  return { db, captured }
}

let restoreWarn: (() => void) | null = null
let warnings: string[] = []

beforeEach(() => {
  warnings = []
  restoreWarn = __setWarnSink((message) => {
    warnings.push(message)
  })
})

afterEach(() => {
  restoreWarn?.()
  restoreWarn = null
  vi.restoreAllMocks()
})

// ─── Happy path ───────────────────────────────────────────────────────────

describe('recordDevMetric — happy path', () => {
  it('writes exactly one row to zkp_route_events with the validated shape', async () => {
    const { db, captured } = makeDbStub()

    await recordDevMetric(db, {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'ios',
      outcome: 'success',
      durationMs: 1234,
      metadata: { complaintFlagOn: true },
    })

    expect(captured).toHaveLength(1)
    const first = captured[0]
    if (!first) throw new Error('precondition')
    expect(first.table).toBe(zkpRouteEvents)
    expect(first.row).toEqual({
      purpose: 'zkp_route',
      route: 'server',
      platform: 'ios',
      outcome: 'success',
      durationMs: 1234,
      metadata: { complaintFlagOn: true },
    })
  })

  it('normalises omitted durationMs and metadata to null', async () => {
    const { db, captured } = makeDbStub()

    await recordDevMetric(db, {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'web',
      outcome: 'failed',
    })

    expect(captured).toHaveLength(1)
    const row = captured[0]?.row
    expect(row?.durationMs).toBeNull()
    expect(row?.metadata).toBeNull()
  })

  it('passes through an explicit ts when supplied', async () => {
    const { db, captured } = makeDbStub()
    const ts = new Date('2026-05-24T00:00:00.000Z')

    await recordDevMetric(db, {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'android',
      outcome: 'success',
      durationMs: 50,
      ts,
    })

    expect(captured[0]?.row.ts).toBe(ts)
  })

  it('omits ts from the row when the caller does not supply one (DB defaults to now())', async () => {
    const { db, captured } = makeDbStub()

    await recordDevMetric(db, {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'web',
      outcome: 'success',
      durationMs: 1,
    })

    expect(captured[0]?.row).not.toHaveProperty('ts')
  })
})

// ─── PII safety — the headline ATID-IDENT-004 invariant ──────────────────

describe('recordDevMetric — PII safety', () => {
  it('rejects an event carrying a nullifier-shaped property (strict metadata)', () => {
    const { db } = makeDbStub()
    const bad = {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'ios',
      outcome: 'success',
      metadata: { nullifier: `0x${'a'.repeat(64)}` },
    } as unknown as DevMetricEvent

    expect(() => recordDevMetric(db, bad)).toThrow()
  })

  it('rejects an event with an aadhaar-shaped field', () => {
    const { db } = makeDbStub()
    const bad = {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'ios',
      outcome: 'success',
      metadata: { aadhaarNumber: '999999999999' },
    } as unknown as DevMetricEvent

    expect(() => recordDevMetric(db, bad)).toThrow()
  })

  it('rejects free-text metadata values (only whitelisted booleans)', () => {
    const { db } = makeDbStub()
    const bad = {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'ios',
      outcome: 'success',
      metadata: { complaintFlagOn: 'yes-please' },
    } as unknown as DevMetricEvent

    expect(() => recordDevMetric(db, bad)).toThrow()
  })

  it('rejects an unknown purpose (discriminated-union guard)', () => {
    const { db } = makeDbStub()
    const bad = {
      purpose: 'collect_everything',
      route: 'server',
      platform: 'ios',
      outcome: 'success',
    } as unknown as DevMetricEvent

    expect(() => recordDevMetric(db, bad)).toThrow()
  })

  it('rejects an unknown platform string', () => {
    const { db } = makeDbStub()
    const bad = {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'desktop-fingerprint-v3',
      outcome: 'success',
    } as unknown as DevMetricEvent

    expect(() => recordDevMetric(db, bad)).toThrow()
  })

  it('rejects an unknown outcome string', () => {
    const { db } = makeDbStub()
    const bad = {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'ios',
      outcome: 'partial-success-with-details',
    } as unknown as DevMetricEvent

    expect(() => recordDevMetric(db, bad)).toThrow()
  })

  it('rejects negative durationMs', () => {
    const { db } = makeDbStub()
    expect(() =>
      recordDevMetric(db, {
        purpose: 'zkp_route',
        route: 'server',
        platform: 'ios',
        outcome: 'success',
        durationMs: -5,
      }),
    ).toThrow()
  })

  it('rejects durationMs above the 5-minute sanity cap', () => {
    const { db } = makeDbStub()
    expect(() =>
      recordDevMetric(db, {
        purpose: 'zkp_route',
        route: 'server',
        platform: 'ios',
        outcome: 'success',
        durationMs: 6 * 60 * 1000,
      }),
    ).toThrow()
  })
})

// ─── DB-write failure handling ───────────────────────────────────────────

describe('recordDevMetric — fire-and-forget semantics', () => {
  it('swallows DB write errors with a single warning', async () => {
    const { db } = makeDbStub(new Error('connection refused'))

    await expect(
      recordDevMetric(db, {
        purpose: 'zkp_route',
        route: 'server',
        platform: 'ios',
        outcome: 'success',
        durationMs: 10,
      }),
    ).resolves.toBeUndefined()

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('zkp_route insert failed')
    expect(warnings[0]).toContain('connection refused')
  })

  it('handles non-Error throws (string rejection) without crashing', async () => {
    const captured: unknown[] = []
    const db: DevMetricsDb = {
      insert: () => ({
        values: async (row) => {
          captured.push(row)
          // Reject with a non-Error value to exercise the `String(err)`
          // branch of `recordDevMetric`. `Promise.reject` lets us hand
          // back a string without tripping Biome's noThrowLiteral rule.
          return Promise.reject('string-shaped failure')
        },
      }),
    }

    await expect(
      recordDevMetric(db, {
        purpose: 'zkp_route',
        route: 'server',
        platform: 'ios',
        outcome: 'success',
        durationMs: 10,
      }),
    ).resolves.toBeUndefined()

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('string-shaped failure')
  })
})

// ─── Default warn sink ───────────────────────────────────────────────────

describe('recordDevMetric — default warn sink', () => {
  it('falls back to console.warn when no test sink is installed', async () => {
    // Restore the default sink for this test only.
    restoreWarn?.()
    restoreWarn = null
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // intentional no-op so vitest does not print during the assertion
    })

    const { db } = makeDbStub(new Error('boom'))
    await recordDevMetric(db, {
      purpose: 'zkp_route',
      route: 'server',
      platform: 'web',
      outcome: 'failed',
    })

    expect(consoleWarnSpy).toHaveBeenCalledOnce()
    const arg = consoleWarnSpy.mock.calls[0]?.[0]
    expect(typeof arg).toBe('string')
    expect(arg).toContain('boom')
  })
})
