import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initSpy = vi.fn()

vi.mock('@sentry/node', () => ({
  init: (...args: unknown[]) => initSpy(...args),
}))

describe('apps/api Sentry init', () => {
  beforeEach(() => {
    vi.resetModules()
    initSpy.mockReset()
  })

  afterEach(() => {
    delete process.env.SENTRY_DSN
  })

  it('is a no-op when SENTRY_DSN is unset', async () => {
    delete process.env.SENTRY_DSN
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    expect(mod.initSentry()).toBe(false)
    expect(mod.isSentryEnabled()).toBe(false)
    expect(initSpy).not.toHaveBeenCalled()
  })

  it('initializes when SENTRY_DSN is present', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    expect(mod.initSentry('https://key@sentry.example/1', 'test')).toBe(true)
    expect(mod.isSentryEnabled()).toBe(true)
    expect(initSpy).toHaveBeenCalledOnce()
    const [opts] = initSpy.mock.calls[0] as [Record<string, unknown>]
    expect(opts.dsn).toBe('https://key@sentry.example/1')
    expect(opts.environment).toBe('test')
    expect(typeof opts.beforeSend).toBe('function')
    expect(typeof opts.beforeBreadcrumb).toBe('function')
  })

  it('is idempotent', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    mod.initSentry('https://key@sentry.example/1', 'test')
    mod.initSentry('https://key@sentry.example/1', 'test')
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('beforeSend runs the shared PII scrubber', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    mod.initSentry('https://key@sentry.example/1', 'test')
    const [opts] = initSpy.mock.calls[0] as [{ beforeSend: (e: unknown, h?: unknown) => unknown }]
    const out = opts.beforeSend({ message: 'contact me at user@example.com' }) as {
      message: string
    }
    expect(out.message).not.toContain('user@example.com')
    expect(out.message).toContain('[redacted')
  })

  it('beforeBreadcrumb drops noisy categories', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    mod.initSentry('https://key@sentry.example/1', 'test')
    const [opts] = initSpy.mock.calls[0] as [{ beforeBreadcrumb: (c: unknown) => unknown }]
    expect(opts.beforeBreadcrumb({ category: 'console' })).toBeNull()
    expect(opts.beforeBreadcrumb({ category: 'http' })).toEqual({ category: 'http' })
  })
})
