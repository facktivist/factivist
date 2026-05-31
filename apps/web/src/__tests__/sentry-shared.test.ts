import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  resolveDsn,
  resolveEnv,
  resolveTracesSampleRate,
  sentryBeforeBreadcrumb,
  sentryBeforeSend,
} from '../../sentry.shared.ts'

const ENV_KEYS = ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_ENVIRONMENT', 'NODE_ENV'] as const
type EnvKey = (typeof ENV_KEYS)[number]
const snapshot: Partial<Record<EnvKey, string | undefined>> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) snapshot[key] = process.env[key]
  for (const key of ENV_KEYS) delete process.env[key]
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const v = snapshot[key]
    if (v === undefined) delete process.env[key]
    else process.env[key] = v
  }
})

describe('apps/web sentry shared helpers', () => {
  it('resolveDsn prefers SENTRY_DSN over NEXT_PUBLIC_SENTRY_DSN', () => {
    process.env.SENTRY_DSN = 'https://server'
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://browser'
    expect(resolveDsn()).toBe('https://server')
  })

  it('resolveDsn falls back to NEXT_PUBLIC_SENTRY_DSN', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://browser'
    expect(resolveDsn()).toBe('https://browser')
  })

  it('resolveDsn returns undefined when both unset', () => {
    expect(resolveDsn()).toBeUndefined()
  })

  it('resolveEnv prefers SENTRY_ENVIRONMENT', () => {
    process.env.SENTRY_ENVIRONMENT = 'staging'
    process.env.NODE_ENV = 'production'
    expect(resolveEnv()).toBe('staging')
  })

  it('resolveEnv falls back to NODE_ENV then development', () => {
    process.env.NODE_ENV = 'production'
    expect(resolveEnv()).toBe('production')
    delete process.env.NODE_ENV
    expect(resolveEnv()).toBe('development')
  })

  it('resolveTracesSampleRate is 0.1 in production, 0 elsewhere', () => {
    expect(resolveTracesSampleRate('production')).toBe(0.1)
    expect(resolveTracesSampleRate('staging')).toBe(0)
    expect(resolveTracesSampleRate('development')).toBe(0)
  })

  it('sentryBeforeSend scrubs PII via the shared scrubber', () => {
    const out = sentryBeforeSend({ message: 'mail user@example.com' }, undefined) as {
      message: string
    }
    expect(out.message).not.toContain('user@example.com')
    expect(out.message).toContain('[redacted')
  })

  it('sentryBeforeBreadcrumb drops console + xhr + fetch, passes others', () => {
    expect(sentryBeforeBreadcrumb({ category: 'console' })).toBeNull()
    expect(sentryBeforeBreadcrumb({ category: 'xhr' })).toBeNull()
    expect(sentryBeforeBreadcrumb({ category: 'fetch' })).toBeNull()
    expect(sentryBeforeBreadcrumb({ category: 'navigation' })).toEqual({ category: 'navigation' })
    expect(sentryBeforeBreadcrumb({})).toEqual({})
  })
})
