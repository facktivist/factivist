/**
 * `getSiteUrl` / `getAuthCallbackUrl` unit tests — wave 3A.
 *
 * The helper is intentionally tiny but its output drives the Supabase
 * `emailRedirectTo` parameter, which MUST match an allow-listed redirect
 * URL on the project dashboard. A regression here breaks every magic
 * link in flight, so the contract is asserted explicitly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getSiteUrl', () => {
  it('returns the dev fallback when NEXT_PUBLIC_SITE_URL is unset', async () => {
    const { getSiteUrl } = await import('../config.ts')
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('returns NEXT_PUBLIC_SITE_URL verbatim when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://factivist.app')
    const { getSiteUrl } = await import('../config.ts')
    expect(getSiteUrl()).toBe('https://factivist.app')
  })

  it('strips a trailing slash so callers can append paths cleanly', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://factivist.app/')
    const { getSiteUrl } = await import('../config.ts')
    expect(getSiteUrl()).toBe('https://factivist.app')
  })

  it('falls back to localhost when NEXT_PUBLIC_SITE_URL is empty string', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const { getSiteUrl } = await import('../config.ts')
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })
})

describe('getAuthCallbackUrl', () => {
  it('composes `<site>/auth/callback` against the dev fallback', async () => {
    const { getAuthCallbackUrl } = await import('../config.ts')
    expect(getAuthCallbackUrl()).toBe('http://localhost:3000/auth/callback')
  })

  it('composes against the configured site URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://factivist.app')
    const { getAuthCallbackUrl } = await import('../config.ts')
    expect(getAuthCallbackUrl()).toBe('https://factivist.app/auth/callback')
  })

  it('does NOT produce a double slash when site URL has a trailing slash', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://factivist.app/')
    const { getAuthCallbackUrl } = await import('../config.ts')
    expect(getAuthCallbackUrl()).toBe('https://factivist.app/auth/callback')
  })
})
