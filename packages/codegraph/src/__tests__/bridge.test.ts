import { describe, expect, it, vi } from 'vitest'

import {
  cliTransport,
  fileUrn,
  memoryTransport,
  packageUrn,
  recordFileTouch,
  recordPackageNote,
  symbolUrn,
} from '../bridge/index.ts'

describe('URN constructors', () => {
  it('prefix every URN with its kind', () => {
    expect(fileUrn('a/b.ts')).toBe('file:a/b.ts')
    expect(packageUrn('apps/api')).toBe('pkg:apps/api')
    expect(symbolUrn('a/b.ts#X')).toBe('sym:a/b.ts#X')
  })
})

describe('memoryTransport', () => {
  it('keeps every recorded entry in order', async () => {
    const t = memoryTransport()
    await recordFileTouch(t, 'a.ts', 'edited', { lines: 3 })
    await recordPackageNote(t, 'apps/api', 'reviewed')
    expect(t.records).toEqual([
      { about: 'file:a.ts', label: 'edited', payload: { lines: 3 } },
      { about: 'pkg:apps/api', label: 'reviewed', payload: undefined },
    ])
  })
})

describe('cliTransport', () => {
  it('invokes the binary with a memory-store argv', async () => {
    const spawned: { bin: string; args: string[] }[] = []
    vi.doMock('node:child_process', () => ({
      spawn: (bin: string, args: string[]) => {
        spawned.push({ bin, args })
        return {
          on: (event: string, cb: (code?: number) => void) => {
            if (event === 'exit') cb(0)
          },
        }
      },
    }))
    vi.resetModules()
    const mod = await import('../bridge/index.ts')
    const t = mod.cliTransport('fake-ruflo')
    await t.record({ about: 'file:a.ts', label: 'demo' })
    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.bin).toBe('fake-ruflo')
    expect(spawned[0]?.args.slice(0, 5)).toEqual([
      'memory',
      'store',
      '--namespace',
      'causal-graph',
      '--key',
    ])
    expect(spawned[0]?.args[5]).toBe('file:a.ts')
    vi.doUnmock('node:child_process')
    vi.resetModules()
  })

  it('rejects when the binary exits non-zero', async () => {
    vi.doMock('node:child_process', () => ({
      spawn: () => ({
        on: (event: string, cb: (code?: number) => void) => {
          if (event === 'exit') cb(1)
        },
      }),
    }))
    vi.resetModules()
    const mod = await import('../bridge/index.ts')
    const t = mod.cliTransport('fake-ruflo')
    await expect(t.record({ about: 'file:a.ts', label: 'x' })).rejects.toThrow(/code 1/)
    vi.doUnmock('node:child_process')
    vi.resetModules()
  })

  it('rejects when spawn emits an error', async () => {
    vi.doMock('node:child_process', () => ({
      spawn: () => ({
        on: (event: string, cb: (err?: Error) => void) => {
          if (event === 'error') cb(new Error('boom'))
        },
      }),
    }))
    vi.resetModules()
    const mod = await import('../bridge/index.ts')
    const t = mod.cliTransport()
    await expect(t.record({ about: 'pkg:x', label: 'y' })).rejects.toThrow('boom')
    vi.doUnmock('node:child_process')
    vi.resetModules()
  })
})
