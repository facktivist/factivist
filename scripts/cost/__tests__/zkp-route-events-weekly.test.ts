import { describe, expect, it, vi } from 'vitest'

import { runScorecard, type ScorecardDatabase } from '../zkp-route-events-weekly.ts'

const makeDb = (rows: ReadonlyArray<Record<string, unknown>>): ScorecardDatabase => ({
  execute: vi.fn().mockResolvedValue({ rows }),
})

describe('runScorecard', () => {
  it('emits an empty totals block when the table has no rows in the window', async () => {
    const db = makeDb([])
    const report = await runScorecard(db, new Date('2026-05-26T11:00:00.000Z'))
    expect(report.windowDays).toBe(7)
    expect(report.rows).toEqual([])
    expect(report.totals).toEqual({
      okCount: 0,
      failCount: 0,
      failRate: 0,
      p50Ms: null,
      p95Ms: null,
    })
  })

  it('maps per-day SQL rows into the public scorecard shape', async () => {
    const db = makeDb([
      {
        day: '2026-05-20',
        ok_count: '10',
        fail_count: '2',
        p50_ms: '4200',
        p95_ms: '11800',
      },
      {
        day: '2026-05-21',
        ok_count: 5,
        fail_count: 0,
        p50_ms: 4400,
        p95_ms: 12100,
      },
    ])
    const report = await runScorecard(db, new Date('2026-05-26T00:00:00.000Z'))
    expect(report.rows).toHaveLength(2)
    expect(report.rows[0]).toEqual({
      day: '2026-05-20',
      okCount: 10,
      failCount: 2,
      failRate: 0.1667,
      p50Ms: 4200,
      p95Ms: 11800,
    })
    expect(report.rows[1].failRate).toBe(0)
  })

  it('produces totals that sum the per-day buckets', async () => {
    const db = makeDb([
      { day: '2026-05-20', ok_count: 4, fail_count: 1, p50_ms: 3000, p95_ms: 9000 },
      { day: '2026-05-21', ok_count: 6, fail_count: 1, p50_ms: 5000, p95_ms: 12000 },
    ])
    const report = await runScorecard(db, new Date('2026-05-26T00:00:00.000Z'))
    expect(report.totals.okCount).toBe(10)
    expect(report.totals.failCount).toBe(2)
    // 2 / (10 + 2) = 0.1666… → rounded to 4 dp.
    expect(report.totals.failRate).toBe(0.1667)
  })

  it('treats a Date column the same as an ISO string for the day field', async () => {
    const db = makeDb([
      {
        day: new Date('2026-05-20T00:00:00.000Z'),
        ok_count: 1,
        fail_count: 0,
        p50_ms: 1000,
        p95_ms: 1000,
      },
    ])
    const report = await runScorecard(db, new Date('2026-05-26T00:00:00.000Z'))
    expect(report.rows[0].day).toBe('2026-05-20')
  })

  it('passes through null p50/p95 values when a day saw only failures with no durationMs', async () => {
    const db = makeDb([
      { day: '2026-05-20', ok_count: 0, fail_count: 3, p50_ms: null, p95_ms: null },
    ])
    const report = await runScorecard(db, new Date('2026-05-26T00:00:00.000Z'))
    expect(report.rows[0].p50Ms).toBeNull()
    expect(report.rows[0].p95Ms).toBeNull()
    expect(report.totals.p50Ms).toBeNull()
    expect(report.totals.p95Ms).toBeNull()
  })

  it('accepts a `rows[]` shape or a bare array from the driver', async () => {
    const bareArrayDb: ScorecardDatabase = {
      execute: vi
        .fn()
        .mockResolvedValue([
          { day: '2026-05-20', ok_count: 1, fail_count: 0, p50_ms: 100, p95_ms: 100 },
        ]),
    }
    const report = await runScorecard(bareArrayDb, new Date('2026-05-26T00:00:00.000Z'))
    expect(report.rows[0].okCount).toBe(1)
  })

  it('honours a non-default window override', async () => {
    const db = makeDb([])
    const report = await runScorecard(db, new Date('2026-05-26T00:00:00.000Z'), 30)
    expect(report.windowDays).toBe(30)
  })

  it('stamps generatedAt from the provided `now`', async () => {
    const db = makeDb([])
    const report = await runScorecard(db, new Date('2026-05-26T11:00:00.000Z'))
    expect(report.generatedAt).toBe('2026-05-26T11:00:00.000Z')
  })
})
