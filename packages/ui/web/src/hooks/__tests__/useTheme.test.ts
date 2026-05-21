import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from '../useTheme.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
})

describe('useTheme()', () => {
  it("returns 'light' when no data-theme attribute is set", () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe('light')
  })

  it("returns 'dark' when data-theme='dark'", () => {
    document.documentElement.dataset.theme = 'dark'
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe('dark')
  })

  it("returns 'light' when data-theme='light'", () => {
    document.documentElement.dataset.theme = 'light'
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe('light')
  })

  it("falls back to 'light' for an unknown data-theme value", () => {
    document.documentElement.dataset.theme = 'sepia'
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe('light')
  })

  it("falls back to 'light' for an empty data-theme value", () => {
    document.documentElement.dataset.theme = ''
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe('light')
  })

  it("returns 'light' on the server (no `document` global)", () => {
    vi.stubGlobal('document', undefined)
    // Call directly (not via renderHook) since there's no DOM to render into.
    expect(useTheme()).toBe('light')
  })
})
