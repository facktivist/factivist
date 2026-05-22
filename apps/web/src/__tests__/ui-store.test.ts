import { beforeEach, describe, expect, it } from 'vitest'

import { useUIStore } from '../lib/zustand/ui.ts'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'light' })
  })

  it('defaults to light theme', () => {
    expect(useUIStore.getState().theme).toBe('light')
  })

  it('sets theme directly', () => {
    useUIStore.getState().setTheme('dark')
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('toggles between light and dark', () => {
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('dark')
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('light')
  })
})
