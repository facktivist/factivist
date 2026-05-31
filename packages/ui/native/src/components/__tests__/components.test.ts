import { describe, expect, it, vi } from 'vitest'

// heroui-native is a peer dependency; consumers install it in their Expo
// app, but it has no business being installed inside this wrapper package.
// Mock it so the re-export shim can be imported in a node test environment.
vi.mock('heroui-native', () => ({
  Button: () => null,
  Card: () => null,
  Input: () => null,
  TextArea: () => null,
  TextField: () => null,
}))

describe('@factivist/ui-native components barrel', () => {
  it('re-exports Button, Card, Input, TextArea, and TextField from heroui-native', async () => {
    const mod = await import('../index.ts')
    expect('Button' in mod).toBe(true)
    expect('Card' in mod).toBe(true)
    expect('Input' in mod).toBe(true)
    expect('TextArea' in mod).toBe(true)
    expect('TextField' in mod).toBe(true)
  })

  it('each re-export is a callable component', async () => {
    const mod = await import('../index.ts')
    expect(typeof mod.Button).toBe('function')
    expect(typeof mod.Card).toBe('function')
    expect(typeof mod.Input).toBe('function')
    expect(typeof mod.TextArea).toBe('function')
    expect(typeof mod.TextField).toBe('function')
  })
})
