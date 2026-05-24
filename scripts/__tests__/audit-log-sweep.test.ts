import { AUDIT_LOG_RETENTION_DAYS } from '@factivist/db/schema'
import { describe, expect, it, vi } from 'vitest'

import {
  computeBoundaryTs,
  extractDeletedRows,
  main,
  runSweep,
  type SweepDatabase,
} from '../audit-log-sweep.ts'

describe('computeBoundaryTs', () => {
  it('subtracts exactly the retention window in UTC days', () => {
    const now = new Date('2026-05-24T03:00:00.000Z')
    const boundary = computeBoundaryTs(now, AUDIT_LOG_RETENTION_DAYS)
    // 2026-05-24 - 180 days = 2025-11-25 (UTC)
    expect(boundary.toISOString()).toBe('2025-11-25T03:00:00.000Z')
  })

  it('uses the constant from the schema, not a hardcoded 180', () => {
    // If a future ADR moves the floor, the test moves with the constant.
    const now = new Date('2026-01-01T00:00:00.000Z')
    const boundary = computeBoundaryTs(now, AUDIT_LOG_RETENTION_DAYS)
    const diffMs = now.getTime() - boundary.getTime()
    expect(diffMs).toBe(AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  })

  it('is pure — repeated calls with the same input return equal Dates', () => {
    const now = new Date('2026-05-24T03:00:00.000Z')
    expect(computeBoundaryTs(now, 180).getTime()).toBe(computeBoundaryTs(now, 180).getTime())
  })
})

describe('extractDeletedRows', () => {
  it('returns 0 for null/undefined results', () => {
    expect(extractDeletedRows(null)).toBe(0)
    expect(extractDeletedRows(undefined)).toBe(0)
  })

  it('returns numeric results as-is', () => {
    expect(extractDeletedRows(7)).toBe(7)
  })

  it('reads `count` off an array-with-count (postgres-js shape)', () => {
    const arr: unknown[] = []
    Object.defineProperty(arr, 'count', { value: 12, enumerable: false })
    expect(extractDeletedRows(arr)).toBe(12)
  })

  it('falls back to array length when no count is attached', () => {
    expect(extractDeletedRows([{ id: 'a' }, { id: 'b' }])).toBe(2)
  })

  it('reads `count` from object results', () => {
    expect(extractDeletedRows({ count: 3 })).toBe(3)
  })

  it('reads `rowCount` from object results', () => {
    expect(extractDeletedRows({ rowCount: 5 })).toBe(5)
  })

  it('returns 0 for object results without count/rowCount', () => {
    expect(extractDeletedRows({})).toBe(0)
  })
})

/**
 * Build a deterministic Drizzle stub. We only need three behaviours:
 *   - record the table passed to `delete()`
 *   - record the predicate passed to `where()` so we can assert the boundary
 *   - return whatever the test wants for the delete result and bounds query
 */
const makeDatabase = (
  opts: {
    deleteResult?: unknown
    bounds?: Array<{ oldest: Date | null; newest: Date | null }>
    deleteThrows?: Error
    selectThrows?: Error
  } = {},
) => {
  const wherePredicate = vi.fn<(p: unknown) => Promise<unknown>>(async () => {
    if (opts.deleteThrows) throw opts.deleteThrows
    return opts.deleteResult ?? { count: 0 }
  })
  const deleteFn = vi.fn(() => ({ where: wherePredicate }))

  const fromFn = vi.fn(async () => {
    if (opts.selectThrows) throw opts.selectThrows
    return opts.bounds ?? [{ oldest: null, newest: null }]
  })
  const selectFn = vi.fn(() => ({ from: fromFn }))

  return {
    db: { delete: deleteFn, select: selectFn } as unknown as SweepDatabase,
    deleteFn,
    wherePredicate,
    selectFn,
    fromFn,
  }
}

describe('runSweep', () => {
  it('returns deletedRows = 0 when no rows are expired', async () => {
    const { db } = makeDatabase({ deleteResult: { count: 0 } })
    const report = await runSweep(db, new Date('2026-05-24T03:00:00.000Z'))
    expect(report.deletedRows).toBe(0)
    expect(report.oldestKeptTs).toBeNull()
    expect(report.newestKeptTs).toBeNull()
  })

  it('calls DELETE with a predicate against the audit_log table', async () => {
    const { db, deleteFn, wherePredicate } = makeDatabase({ deleteResult: { count: 4 } })
    await runSweep(db, new Date('2026-05-24T03:00:00.000Z'))
    expect(deleteFn).toHaveBeenCalledOnce()
    expect(wherePredicate).toHaveBeenCalledOnce()
    // We can't easily destructure the Drizzle predicate object, but we can
    // confirm a predicate object was forwarded.
    expect(wherePredicate.mock.calls[0]?.[0]).toBeDefined()
  })

  it('boundary in the report matches now() - AUDIT_LOG_RETENTION_DAYS', async () => {
    const { db } = makeDatabase({ deleteResult: { count: 1 } })
    const now = new Date('2026-05-24T03:00:00.000Z')
    const report = await runSweep(db, now)
    expect(report.boundaryTs).toBe('2025-11-25T03:00:00.000Z')
  })

  it('echoes oldest/newest kept timestamps as ISO strings', async () => {
    const oldest = new Date('2025-12-01T00:00:00.000Z')
    const newest = new Date('2026-05-23T22:00:00.000Z')
    const { db } = makeDatabase({
      deleteResult: { count: 2 },
      bounds: [{ oldest, newest }],
    })
    const report = await runSweep(db, new Date('2026-05-24T03:00:00.000Z'))
    expect(report.oldestKeptTs).toBe(oldest.toISOString())
    expect(report.newestKeptTs).toBe(newest.toISOString())
  })

  it('reports a non-negative durationMs', async () => {
    const { db } = makeDatabase()
    const report = await runSweep(db, new Date('2026-05-24T03:00:00.000Z'))
    expect(report.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('propagates DB errors from the DELETE leg', async () => {
    const { db } = makeDatabase({ deleteThrows: new Error('boom') })
    await expect(runSweep(db, new Date('2026-05-24T03:00:00.000Z'))).rejects.toThrow('boom')
  })

  it('honours a custom retentionDays override', async () => {
    const { db } = makeDatabase()
    const now = new Date('2026-05-24T03:00:00.000Z')
    const report = await runSweep(db, now, 90)
    // 2026-05-24 - 90d = 2026-02-23
    expect(report.boundaryTs).toBe('2026-02-23T03:00:00.000Z')
  })
})

describe('main()', () => {
  const makeDeps = (overrides: Partial<Parameters<typeof main>[0]> = {}) => {
    const log = vi.fn<(msg: string) => void>()
    const error = vi.fn<(msg: string) => void>()
    const { db } = makeDatabase({ deleteResult: { count: 0 } })
    return {
      log,
      error,
      db,
      deps: {
        env: { DATABASE_URL: 'postgres://localhost:5432/test' },
        log,
        error,
        createClient: () => db,
        now: new Date('2026-05-24T03:00:00.000Z'),
        ...overrides,
      } satisfies Parameters<typeof main>[0],
    }
  }

  it('exits 1 with a structured error when DATABASE_URL is missing', async () => {
    const { deps, error, log } = makeDeps({ env: {} })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(log).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledOnce()
    const payload = JSON.parse(error.mock.calls[0]?.[0] ?? '{}')
    expect(payload.error).toMatch(/DATABASE_URL/)
  })

  it('exits 1 when DATABASE_URL is set but empty/whitespace', async () => {
    const { deps, error } = makeDeps({ env: { DATABASE_URL: '   ' } })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(error).toHaveBeenCalledOnce()
  })

  it('exits 0 and emits one JSON line when the sweep succeeds', async () => {
    const { deps, log, error } = makeDeps()
    const code = await main(deps)
    expect(code).toBe(0)
    expect(error).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledOnce()
    const payload = JSON.parse(log.mock.calls[0]?.[0] ?? '{}')
    expect(payload).toMatchObject({
      deletedRows: 0,
      boundaryTs: '2025-11-25T03:00:00.000Z',
    })
    expect(typeof payload.durationMs).toBe('number')
  })

  it('exits 2 when createClient throws (DB unavailable)', async () => {
    const { deps, error } = makeDeps({
      createClient: () => {
        throw new Error('ECONNREFUSED')
      },
    })
    const code = await main(deps)
    expect(code).toBe(2)
    const payload = JSON.parse(error.mock.calls[0]?.[0] ?? '{}')
    expect(payload.error).toMatch(/ECONNREFUSED/)
  })

  it('exits 2 when the sweep query throws', async () => {
    const { db: throwingDb } = makeDatabase({ deleteThrows: new Error('relation missing') })
    const { deps, error } = makeDeps({ createClient: () => throwingDb })
    const code = await main(deps)
    expect(code).toBe(2)
    const payload = JSON.parse(error.mock.calls[0]?.[0] ?? '{}')
    expect(payload.error).toMatch(/sweep failed/)
    expect(payload.error).toMatch(/relation missing/)
  })

  it('is safe to re-run on the same day (idempotent — second run deletes 0)', async () => {
    const { deps: deps1, log: log1 } = makeDeps()
    expect(await main(deps1)).toBe(0)
    const first = JSON.parse(log1.mock.calls[0]?.[0] ?? '{}')

    const { deps: deps2, log: log2 } = makeDeps()
    expect(await main(deps2)).toBe(0)
    const second = JSON.parse(log2.mock.calls[0]?.[0] ?? '{}')

    expect(first.boundaryTs).toBe(second.boundaryTs)
    expect(first.deletedRows).toBe(0)
    expect(second.deletedRows).toBe(0)
  })

  it('boundary value matches AUDIT_LOG_RETENTION_DAYS exactly', async () => {
    const { deps, log } = makeDeps()
    await main(deps)
    const payload = JSON.parse(log.mock.calls[0]?.[0] ?? '{}')
    const boundaryMs = new Date(payload.boundaryTs).getTime()
    const nowMs = new Date('2026-05-24T03:00:00.000Z').getTime()
    expect(nowMs - boundaryMs).toBe(AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  })
})
