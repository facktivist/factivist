import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock react-native's Appearance API at the module level. Vitest hoists
// `vi.mock` above imports, so this is in effect before useTheme imports it.
const getColorScheme = vi.fn<() => 'light' | 'dark' | null | undefined>()
vi.mock('react-native', () => ({
  Appearance: {
    get getColorScheme() {
      return getColorScheme
    },
  },
}))

import { useTheme } from '../useTheme.ts'

afterEach(() => {
  getColorScheme.mockReset()
})

describe('useTheme()', () => {
  it("returns 'dark' when Appearance reports 'dark'", () => {
    getColorScheme.mockReturnValue('dark')
    expect(useTheme()).toBe('dark')
    expect(getColorScheme).toHaveBeenCalledTimes(1)
  })

  it("returns 'light' when Appearance reports 'light'", () => {
    getColorScheme.mockReturnValue('light')
    expect(useTheme()).toBe('light')
  })

  it("falls back to 'light' when Appearance returns null", () => {
    getColorScheme.mockReturnValue(null)
    expect(useTheme()).toBe('light')
  })

  it("falls back to 'light' when Appearance returns undefined", () => {
    getColorScheme.mockReturnValue(undefined)
    expect(useTheme()).toBe('light')
  })
})
