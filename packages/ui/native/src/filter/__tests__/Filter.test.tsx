import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
}))

describe('Filter (native) helpers + compound shape', () => {
  it('DEFAULT_SORT is newest', async () => {
    const { DEFAULT_SORT } = await import('../Filter.tsx')
    expect(DEFAULT_SORT).toBe('newest')
  })

  it('SORT_OPTIONS exposes the three ComplaintSort variants in order', async () => {
    const { SORT_OPTIONS } = await import('../Filter.tsx')
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['newest', 'most-commented', 'most-flagged'])
  })

  it('isFilterActive returns true when any axis is non-default', async () => {
    const { isFilterActive } = await import('../Filter.tsx')
    expect(isFilterActive(null, [], 'newest')).toBe(false)
    expect(isFilterActive('KA', [], 'newest')).toBe(true)
    expect(isFilterActive(null, [1], 'newest')).toBe(true)
    expect(isFilterActive(null, [], 'most-flagged')).toBe(true)
  })

  it('exposes ConstituencyTree, CategoryChips, SortToggle on the compound', async () => {
    const { Filter } = await import('../Filter.tsx')
    expect(typeof Filter.ConstituencyTree).toBe('function')
    expect(typeof Filter.CategoryChips).toBe('function')
    expect(typeof Filter.SortToggle).toBe('function')
  })
})
