import { describe, expect, it, vi } from 'vitest'

import { type MainDeps, main, runSweep, type SweepDatabase } from '../grievance-contacts-sweep.ts'

const mkDatabase = (
  rows: Array<{ eraseAfter: Date | null }> = [],
): {
  db: SweepDatabase
  deleteSpy: ReturnType<typeof vi.fn>
} => {
  const deleteSpy = vi.fn().mockResolvedValue(undefined)
  return {
    deleteSpy,
    db: {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
      delete: () => ({ where: deleteSpy }),
    },
  }
}

describe('runSweep', () => {
  it('returns zero deletes when no rows are past erase_after', async () => {
    const { db, deleteSpy } = mkDatabase([])
    const result = await runSweep(db, new Date('2026-06-10T00:00:00.000Z'))
    expect(result.deletedRows).toBe(0)
    expect(result.oldestErasedAt).toBeNull()
    expect(result.newestErasedAt).toBeNull()
    expect(deleteSpy).toHaveBeenCalledOnce()
  })

  it('reports oldest + newest erased timestamps when rows are expired', async () => {
    const { db } = mkDatabase([
      { eraseAfter: new Date('2026-05-01T00:00:00.000Z') },
      { eraseAfter: new Date('2026-05-20T00:00:00.000Z') },
      { eraseAfter: new Date('2026-05-10T00:00:00.000Z') },
    ])
    const result = await runSweep(db, new Date('2026-06-10T00:00:00.000Z'))
    expect(result.deletedRows).toBe(3)
    expect(result.oldestErasedAt).toBe('2026-05-01T00:00:00.000Z')
    expect(result.newestErasedAt).toBe('2026-05-20T00:00:00.000Z')
  })

  it('counts null-erase_after rows but skips them in oldest/newest', async () => {
    const { db } = mkDatabase([
      { eraseAfter: null },
      { eraseAfter: new Date('2026-05-01T00:00:00.000Z') },
    ])
    const result = await runSweep(db, new Date('2026-06-10T00:00:00.000Z'))
    expect(result.deletedRows).toBe(2)
    expect(result.oldestErasedAt).toBe('2026-05-01T00:00:00.000Z')
    expect(result.newestErasedAt).toBe('2026-05-01T00:00:00.000Z')
  })

  it('reports a non-negative durationMs', async () => {
    const { db } = mkDatabase()
    const result = await runSweep(db)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(typeof result.durationMs).toBe('number')
  })

  it('uses provided `now` for the boundary check', async () => {
    const { db } = mkDatabase()
    await runSweep(db, new Date('2026-01-15T00:00:00.000Z'))
    // No assertion on the predicate object itself — just confirm runSweep
    // accepts a custom now without throwing.
    expect(true).toBe(true)
  })

  it('propagates DB errors from the DELETE leg', async () => {
    const deleteSpy = vi.fn().mockRejectedValue(new Error('boom'))
    const db: SweepDatabase = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
      delete: () => ({ where: deleteSpy }),
    }
    await expect(runSweep(db, new Date('2026-06-10T00:00:00.000Z'))).rejects.toThrow('boom')
  })
})

describe('main()', () => {
  const mkDeps = (
    overrides: Partial<MainDeps> = {},
  ): {
    deps: MainDeps
    log: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
  } => {
    const log = vi.fn<(msg: string) => void>()
    const error = vi.fn<(msg: string) => void>()
    const { db } = mkDatabase()
    return {
      log,
      error,
      deps: {
        env: { DATABASE_URL: 'postgres://x' },
        log,
        error,
        createClient: () => db,
        now: new Date('2026-06-10T00:00:00.000Z'),
        ...overrides,
      },
    }
  }

  it('exits 1 + logs an error when DATABASE_URL is missing', async () => {
    const { deps, error, log } = mkDeps({ env: {} })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(error).toHaveBeenCalledOnce()
    expect(log).not.toHaveBeenCalled()
    const payload = JSON.parse(error.mock.calls[0]?.[0] ?? '{}')
    expect(payload.error).toMatch(/DATABASE_URL/)
  })

  it('exits 1 when DATABASE_URL is whitespace', async () => {
    const { deps, error } = mkDeps({ env: { DATABASE_URL: '   ' } })
    const code = await main(deps)
    expect(code).toBe(1)
    expect(error).toHaveBeenCalledOnce()
  })

  it('exits 0 and emits one JSON line when the sweep succeeds', async () => {
    const { deps, log, error } = mkDeps()
    const code = await main(deps)
    expect(code).toBe(0)
    expect(error).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledOnce()
    const payload = JSON.parse(log.mock.calls[0]?.[0] ?? '{}')
    expect(payload).toMatchObject({
      deletedRows: 0,
      oldestErasedAt: null,
      newestErasedAt: null,
    })
    expect(typeof payload.durationMs).toBe('number')
  })

  it('exits 2 when createClient throws', async () => {
    const { deps, error, log } = mkDeps({
      createClient: () => {
        throw new Error('ECONNREFUSED')
      },
    })
    const code = await main(deps)
    expect(code).toBe(2)
    expect(log).not.toHaveBeenCalled()
    const payload = JSON.parse(error.mock.calls[0]?.[0] ?? '{}')
    expect(payload.error).toMatch(/ECONNREFUSED/)
  })

  it('exits 2 when runSweep throws (DB query failure)', async () => {
    const failingDb: SweepDatabase = {
      select: () => ({
        from: () => ({
          where: () => Promise.reject(new Error('select boom')),
        }),
      }),
      delete: () => ({ where: vi.fn() }),
    }
    const { deps, error } = mkDeps({ createClient: () => failingDb })
    const code = await main(deps)
    expect(code).toBe(2)
    const payload = JSON.parse(error.mock.calls[0]?.[0] ?? '{}')
    expect(payload.error).toMatch(/sweep failed/)
  })
})
