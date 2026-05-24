/**
 * Tests for `resolveGeoLabels` — the four-way constituency-code → label
 * resolver used by `GET /complaints/:slug` (wave 3B).
 *
 * Per the helper contract:
 *   - Returns the resolved label when a reference row exists.
 *   - Falls back to the code itself when a reference row is missing
 *     (defensive: never throws, never 500s the public detail surface).
 *   - Issues the four lookups in parallel (`Promise.all`).
 */
import type { Database } from '@factivist/db/client'
import { describe, expect, it, vi } from 'vitest'

import { resolveGeoLabels } from '../geo-resolve.ts'

/**
 * Build a chainable Drizzle stub where each call to `select()` pops the
 * next pre-seeded result array. Mirrors the pattern in `flags.test.ts`
 * but supports multiple sequential select chains so we can drive the four
 * parallel queries from a single fixture.
 */
const buildDbStub = (selectResults: Array<Array<{ label: string }>>) => {
  const calls: number[] = []
  let cursor = 0
  const select = vi.fn(() => {
    const idx = cursor++
    calls.push(idx)
    const rows = selectResults[idx] ?? []
    const limit = vi.fn().mockResolvedValue(rows)
    const where = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ where }))
    return { from }
  })
  return { stub: { select } as unknown as Database, select, calls }
}

const codes = {
  stateCode: 'KA',
  districtCode: 'KA-560',
  pcCode: 'KA-PC-26',
  acCode: 'KA-AC-152',
} as const

describe('resolveGeoLabels', () => {
  it('returns the four resolved labels on the happy path', async () => {
    const { stub } = buildDbStub([
      [{ label: 'Karnataka' }],
      [{ label: 'Bangalore Urban' }],
      [{ label: 'Bangalore South' }],
      [{ label: 'BTM Layout' }],
    ])

    const labels = await resolveGeoLabels(stub, codes)

    expect(labels).toEqual({
      stateLabel: 'Karnataka',
      districtLabel: 'Bangalore Urban',
      pcLabel: 'Bangalore South',
      acLabel: 'BTM Layout',
    })
  })

  it('falls back to the code when a single reference row is missing', async () => {
    const { stub } = buildDbStub([
      [{ label: 'Karnataka' }],
      [{ label: 'Bangalore Urban' }],
      [], // PC missing — should fall back to `codes.pcCode`
      [{ label: 'BTM Layout' }],
    ])

    const labels = await resolveGeoLabels(stub, codes)

    expect(labels.pcLabel).toBe(codes.pcCode)
    expect(labels.stateLabel).toBe('Karnataka')
    expect(labels.acLabel).toBe('BTM Layout')
  })

  it('falls back to all four codes when every reference row is missing', async () => {
    const { stub } = buildDbStub([[], [], [], []])

    const labels = await resolveGeoLabels(stub, codes)

    expect(labels).toEqual({
      stateLabel: codes.stateCode,
      districtLabel: codes.districtCode,
      pcLabel: codes.pcCode,
      acLabel: codes.acCode,
    })
  })

  it('mixes resolved and fallback labels (state+district found, pc+ac missing)', async () => {
    const { stub } = buildDbStub([[{ label: 'Karnataka' }], [{ label: 'Bangalore Urban' }], [], []])

    const labels = await resolveGeoLabels(stub, codes)

    expect(labels).toEqual({
      stateLabel: 'Karnataka',
      districtLabel: 'Bangalore Urban',
      pcLabel: codes.pcCode,
      acLabel: codes.acCode,
    })
  })

  it('issues exactly four select queries (one per reference table)', async () => {
    const { stub, select } = buildDbStub([
      [{ label: 'Karnataka' }],
      [{ label: 'Bangalore Urban' }],
      [{ label: 'Bangalore South' }],
      [{ label: 'BTM Layout' }],
    ])

    await resolveGeoLabels(stub, codes)

    expect(select).toHaveBeenCalledTimes(4)
  })

  it('propagates DB errors to the caller (lets the route map to 503)', async () => {
    const select = vi.fn(() => {
      const limit = vi.fn().mockRejectedValue(new Error('connection refused'))
      const where = vi.fn(() => ({ limit }))
      const from = vi.fn(() => ({ where }))
      return { from }
    })
    const stub = { select } as unknown as Database

    await expect(resolveGeoLabels(stub, codes)).rejects.toThrow('connection refused')
  })
})
