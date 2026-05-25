import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initSpy = vi.fn()

vi.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => initSpy(...args),
}))

describe('apps/mobile Sentry init', () => {
  beforeEach(() => {
    vi.resetModules()
    initSpy.mockReset()
  })

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN
    delete process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT
  })

  it('is a no-op when EXPO_PUBLIC_SENTRY_DSN is unset', async () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    expect(mod.initSentry()).toBe(false)
    expect(mod.isSentryEnabled()).toBe(false)
    expect(initSpy).not.toHaveBeenCalled()
  })

  it('initializes when DSN is present', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    expect(mod.initSentry('https://key@sentry.example/1', 'test')).toBe(true)
    expect(mod.isSentryEnabled()).toBe(true)
    expect(initSpy).toHaveBeenCalledOnce()
    const [opts] = initSpy.mock.calls[0] as [Record<string, unknown>]
    expect(opts.dsn).toBe('https://key@sentry.example/1')
    expect(opts.environment).toBe('test')
  })

  it('is idempotent', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    mod.initSentry('https://k@s.io/1', 'test')
    mod.initSentry('https://k@s.io/1', 'test')
    expect(initSpy).toHaveBeenCalledOnce()
  })

  it('beforeSend scrubs PII', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    mod.initSentry('https://k@s.io/1', 'test')
    const [opts] = initSpy.mock.calls[0] as [{ beforeSend: (e: unknown, h?: unknown) => unknown }]
    const out = opts.beforeSend({ message: 'reach user@example.com' }) as { message: string }
    expect(out.message).not.toContain('user@example.com')
    expect(out.message).toContain('[redacted')
  })

  it('beforeBreadcrumb drops noisy categories', async () => {
    const mod = await import('../sentry.ts')
    mod.resetSentryForTest()
    mod.initSentry('https://k@s.io/1', 'test')
    const [opts] = initSpy.mock.calls[0] as [{ beforeBreadcrumb: (c: unknown) => unknown }]
    expect(opts.beforeBreadcrumb({ category: 'console' })).toBeNull()
    expect(opts.beforeBreadcrumb({ category: 'http' })).toEqual({ category: 'http' })
  })
})
