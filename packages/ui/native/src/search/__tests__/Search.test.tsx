import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
}))

describe('Search compound shape (native)', () => {
  it('exposes Bar, Results, EmptyState', async () => {
    const { Search } = await import('../Search.tsx')
    expect(typeof Search.Bar).toBe('function')
    expect(typeof Search.Results).toBe('function')
    expect(typeof Search.EmptyState).toBe('function')
  })
})
