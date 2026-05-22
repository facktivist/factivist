import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildEntry, memoryAuditTransport } from '../audit.ts'

describe('memoryAuditTransport', () => {
  it('keeps every recorded entry in order', async () => {
    const t = memoryAuditTransport()
    await t.record(buildEntry({ guardrail: 'a', outcome: 'pass' }))
    await t.record(buildEntry({ guardrail: 'b', outcome: 'fail', reason: 'r' }))
    expect(t.entries.map((e) => e.guardrail)).toEqual(['a', 'b'])
  })
})

describe('buildEntry', () => {
  it('fills in ts when omitted', () => {
    const e = buildEntry({ guardrail: 'x', outcome: 'pass' })
    expect(e.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('preserves an explicitly-provided ts', () => {
    const e = buildEntry({ guardrail: 'x', outcome: 'pass', ts: '2026-05-22T00:00:00.000Z' })
    expect(e.ts).toBe('2026-05-22T00:00:00.000Z')
  })
})

afterEach(() => {
  vi.doUnmock('node:child_process')
  vi.resetModules()
})

describe('cliAuditTransport', () => {
  it('invokes ruflo memory store with a guardrail-bypass namespace', async () => {
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
    const { cliAuditTransport, buildEntry } = await import('../audit.ts')
    const t = cliAuditTransport('fake-ruflo')
    await t.record(buildEntry({ guardrail: 'secret-leak', outcome: 'fail' }))
    expect(spawned[0]?.bin).toBe('fake-ruflo')
    expect(spawned[0]?.args.slice(0, 4)).toEqual([
      'memory',
      'store',
      '--namespace',
      'guardrail-bypass',
    ])
  })

  it('swallows ruflo failures so audit cannot break the build', async () => {
    vi.doMock('node:child_process', () => ({
      spawn: () => ({
        on: (event: string, cb: (code?: number) => void) => {
          if (event === 'exit') cb(1)
        },
      }),
    }))
    vi.resetModules()
    const { cliAuditTransport, buildEntry } = await import('../audit.ts')
    const t = cliAuditTransport('fake-ruflo')
    const origWrite = process.stderr.write.bind(process.stderr)
    const captured: string[] = []
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      captured.push(typeof chunk === 'string' ? chunk : chunk.toString())
      return true
    }) as typeof process.stderr.write
    try {
      await t.record(buildEntry({ guardrail: 'x', outcome: 'pass' }))
    } finally {
      process.stderr.write = origWrite
    }
    expect(captured.join('')).toMatch(/audit write failed/)
  })

  it('swallows spawn errors too', async () => {
    vi.doMock('node:child_process', () => ({
      spawn: () => ({
        on: (event: string, cb: (err?: Error) => void) => {
          if (event === 'error') cb(new Error('boom'))
        },
      }),
    }))
    vi.resetModules()
    const { cliAuditTransport, buildEntry } = await import('../audit.ts')
    const t = cliAuditTransport()
    const origWrite = process.stderr.write.bind(process.stderr)
    process.stderr.write = (() => true) as typeof process.stderr.write
    try {
      await expect(
        t.record(buildEntry({ guardrail: 'x', outcome: 'pass' })),
      ).resolves.toBeUndefined()
    } finally {
      process.stderr.write = origWrite
    }
  })
})
