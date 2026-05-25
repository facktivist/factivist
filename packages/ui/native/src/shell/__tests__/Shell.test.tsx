import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
}))

describe('Shell compound shape (native)', () => {
  it('exposes TabBar, OfflineBanner, SkeletonRow', async () => {
    const { Shell } = await import('../Shell.tsx')
    expect(typeof Shell.TabBar).toBe('function')
    expect(typeof Shell.OfflineBanner).toBe('function')
    expect(typeof Shell.SkeletonRow).toBe('function')
  })
})
