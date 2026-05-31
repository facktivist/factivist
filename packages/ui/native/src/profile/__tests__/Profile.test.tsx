import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Image: 'Image',
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
}))

describe('Profile compound shape (native)', () => {
  it('exposes Handle, Stats, ComplaintList', async () => {
    const { Profile } = await import('../Profile.tsx')
    expect(typeof Profile.Handle).toBe('function')
    expect(typeof Profile.Stats).toBe('function')
    expect(typeof Profile.ComplaintList).toBe('function')
  })
})
