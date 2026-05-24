/**
 * Tests for the categories seed.
 *
 * Two layers:
 *
 *   1. Static fixture asserts on `S1_CATEGORIES` — count, slug regex,
 *      sortOrder uniqueness + density, no bias-prone descriptors. These
 *      catch a typo in the seed array without any DB round-trip.
 *   2. Mocked-drizzle asserts on `seedCategories()` — env guard,
 *      onConflictDoNothing target, idempotency across two runs. Matches
 *      the existing `feature_flags.test.ts` pattern, so the package's
 *      ≥95% line / ≥90% branch coverage gate holds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { S1_CATEGORIES } from '../categories.ts'

const SLUG_REGEX = /^[a-z0-9-]+$/

/**
 * Bias-prone descriptors we explicitly refuse in category labels. Sourced
 * from the project's anonymity invariants (see `aggregates.md` §Anonymity)
 * + general civic-tech editorial guidance: never punch down on protected
 * groups, never use caste/communal slurs as labels, never frame a category
 * as the alleged actor's identity.
 *
 * If a future migration needs to add a label containing one of these, the
 * fix is to relabel — not to relax this list.
 */
const BANNED_LABEL_SUBSTRINGS = [
  'untouchable',
  'untouchables',
  'lower caste',
  'upper caste',
  'illegal alien',
  'illegals',
  'anti-national',
  'antinational',
  'jihadi',
  'jihadis',
  'naxal',
  'naxals',
  'urban naxal',
  'love jihad',
  'tukde',
  'tukde-tukde',
  // Avoid framing categories as the alleged actor's group identity.
  'muslim ',
  'hindu ',
  'sikh ',
  'christian ',
  'dalit ',
  'adivasi ',
]

describe('S1_CATEGORIES (static fixture)', () => {
  it('contains exactly 35 rows (I-CAT-1, AMB-05 merge applied)', () => {
    expect(S1_CATEGORIES.length).toBe(35)
  })

  it('every slug matches ^[a-z0-9-]+$ ([[ADR-012]])', () => {
    for (const row of S1_CATEGORIES) {
      expect(row.slug, `slug for label "${row.label}"`).toMatch(SLUG_REGEX)
    }
  })

  it('slugs are globally unique', () => {
    const slugs = S1_CATEGORIES.map((r) => r.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('labels are globally unique', () => {
    const labels = S1_CATEGORIES.map((r) => r.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('sortOrder is unique and dense 0..34 (lexicographically sortable)', () => {
    const orders = S1_CATEGORIES.map((r) => r.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)
    // Sorted lexicographically (because column is `text`); must equal the
    // numeric sequence 0..34 zero-padded to two digits.
    const sorted = [...orders].sort()
    const expected = Array.from({ length: 35 }, (_, i) => i.toString().padStart(2, '0'))
    expect(sorted).toEqual(expected)
  })

  it('seed array is already sorted by sortOrder (matches API render order)', () => {
    const orders = S1_CATEGORIES.map((r) => r.sortOrder)
    const sorted = [...orders].sort()
    expect(orders).toEqual(sorted)
  })

  it('labels contain no bias-prone descriptors', () => {
    for (const row of S1_CATEGORIES) {
      const lower = row.label.toLowerCase()
      for (const banned of BANNED_LABEL_SUBSTRINGS) {
        expect(
          lower.includes(banned),
          `label "${row.label}" contains banned substring "${banned}"`,
        ).toBe(false)
      }
    }
  })

  it('applies the AMB-05 merge: keeps "Corruption" row, drops "Public Money Scandals"', () => {
    const slugs = new Set(S1_CATEGORIES.map((r) => r.slug))
    expect(slugs.has('corruption-systemic-everyday')).toBe(true)
    expect(slugs.has('public-money-scandals')).toBe(false)
  })
})

// --- seedCategories() mocked-drizzle layer -----------------------------------
//
// `vi.mock` is hoisted to the top of the file; mock state lives in a
// `vi.hoisted` block so the factory can close over it without tripping the
// "cannot access before initialization" guard.
const mocks = vi.hoisted(() => {
  const returningMock = vi.fn()
  const onConflictMock = vi.fn(() => ({ returning: returningMock }))
  const valuesMock = vi.fn(() => ({ onConflictDoNothing: onConflictMock }))
  const insertMock = vi.fn(() => ({ values: valuesMock }))
  const createClientMock = vi.fn(() => ({ insert: insertMock }))
  return { returningMock, onConflictMock, valuesMock, insertMock, createClientMock }
})
const { returningMock, onConflictMock, valuesMock, insertMock, createClientMock } = mocks

vi.mock('../../client.ts', () => ({
  createClient: mocks.createClientMock,
}))

describe('seedCategories()', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    createClientMock.mockClear()
    insertMock.mockClear()
    valuesMock.mockClear()
    onConflictMock.mockClear()
    returningMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { seedCategories } = await import('../categories.ts')
    await expect(seedCategories()).rejects.toThrow(/DATABASE_URL must be set/)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('inserts all 35 rows with onConflictDoNothing on slug', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce(S1_CATEGORIES.map((r) => ({ slug: r.slug })))

    const { seedCategories } = await import('../categories.ts')
    const result = await seedCategories()

    expect(createClientMock).toHaveBeenCalledWith('postgres://seed/db')
    expect(valuesMock).toHaveBeenCalledTimes(1)
    // The exact payload is what hits the DB; lock it to S1_CATEGORIES so a
    // drift in the seed array surfaces in this test.
    expect(valuesMock).toHaveBeenCalledWith([...S1_CATEGORIES])
    expect(onConflictMock).toHaveBeenCalledTimes(1)
    expect(onConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.anything() }),
    )
    expect(result).toEqual({ inserted: 35, total: 35 })
  })

  it('is idempotent: re-running with all rows present inserts 0', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce(S1_CATEGORIES.map((r) => ({ slug: r.slug })))
    returningMock.mockResolvedValueOnce([])

    const { seedCategories } = await import('../categories.ts')
    const first = await seedCategories()
    const second = await seedCategories()

    expect(first).toEqual({ inserted: 35, total: 35 })
    expect(second).toEqual({ inserted: 0, total: 35 })
    // Same payload both times — proves idempotency lives in the DB
    // (onConflictDoNothing), not in branching in the seed function.
    expect(valuesMock).toHaveBeenCalledTimes(2)
    expect(valuesMock).toHaveBeenNthCalledWith(1, [...S1_CATEGORIES])
    expect(valuesMock).toHaveBeenNthCalledWith(2, [...S1_CATEGORIES])
  })

  it('returns inserted count even when partial (some slugs already present)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://seed/db')
    returningMock.mockResolvedValueOnce([{ slug: 'infrastructure' }, { slug: 'farmer-issues' }])

    const { seedCategories } = await import('../categories.ts')
    const result = await seedCategories()
    expect(result).toEqual({ inserted: 2, total: 35 })
  })
})
