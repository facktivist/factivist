/**
 * `sendMagicLink` Server Action tests — wave 3A.
 *
 * Validates the small set of observable behaviours:
 *   - Email validation rejects empties, spaces, no-@, no-TLD before any
 *     Supabase call is made.
 *   - Missing env returns `misconfigured` — no Supabase call.
 *   - Successful Supabase response returns `ok:true` with no message.
 *   - Supabase rate-limit message is classified separately.
 *   - Supabase errors / throws fall to `network`.
 *   - The Supabase client is built with `emailRedirectTo` matching the
 *     callback URL (the contract the route handler enforces).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const otpMock =
  vi.fn<
    (args: {
      email: string
      options?: { emailRedirectTo?: string }
    }) => Promise<{ error: { message: string } | null }>
  >()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => undefined,
  }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      signInWithOtp: (args: { email: string; options?: { emailRedirectTo?: string } }) =>
        otpMock(args),
    },
  }),
}))

const stubEnv = (siteUrl?: string) => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  if (siteUrl !== undefined) vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl)
}

const buildForm = (email: string): FormData => {
  const fd = new FormData()
  fd.set('email', email)
  return fd
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  otpMock.mockReset()
  otpMock.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendMagicLink — email validation', () => {
  it.each([
    ['', 'empty string'],
    [' ', 'whitespace'],
    ['no-at-sign', 'no @'],
    ['two@@signs.com', 'double @'],
    ['no-tld@example', 'no TLD'],
    ['has spaces@example.com', 'spaces inside'],
  ])('rejects %s (%s) before calling Supabase', async (email) => {
    stubEnv()
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm(email))
    expect(result).toEqual({
      ok: false,
      code: 'invalid_email',
      message: 'Enter a valid email address.',
    })
    expect(otpMock).not.toHaveBeenCalled()
  })

  it('handles a non-string FormData value', async () => {
    stubEnv()
    const fd = new FormData()
    // FormData accepts Blob/File for non-string values.
    fd.set('email', new Blob(['operator@factivist.app']))
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(fd)
    expect(result.ok).toBe(false)
  })

  it('trims surrounding whitespace before validating', async () => {
    stubEnv()
    otpMock.mockResolvedValueOnce({ error: null })
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm('  operator@factivist.app  '))
    expect(result).toEqual({ ok: true })
    expect(otpMock).toHaveBeenCalledTimes(1)
    expect(otpMock.mock.calls[0]?.[0].email).toBe('operator@factivist.app')
  })
})

describe('sendMagicLink — Supabase happy path', () => {
  it('passes `emailRedirectTo` matching the configured site URL', async () => {
    stubEnv('https://factivist.app')
    const { sendMagicLink } = await import('../loginActions.ts')
    await sendMagicLink(buildForm('operator@factivist.app'))
    expect(otpMock).toHaveBeenCalledTimes(1)
    const arg = otpMock.mock.calls[0]?.[0]
    expect(arg?.options?.emailRedirectTo).toBe('https://factivist.app/auth/callback')
  })

  it('falls back to localhost when NEXT_PUBLIC_SITE_URL is unset', async () => {
    stubEnv()
    const { sendMagicLink } = await import('../loginActions.ts')
    await sendMagicLink(buildForm('operator@factivist.app'))
    const arg = otpMock.mock.calls[0]?.[0]
    expect(arg?.options?.emailRedirectTo).toBe('http://localhost:3000/auth/callback')
  })

  it('returns { ok: true } when Supabase reports no error', async () => {
    stubEnv()
    const { sendMagicLink } = await import('../loginActions.ts')
    expect(await sendMagicLink(buildForm('operator@factivist.app'))).toEqual({ ok: true })
  })
})

describe('sendMagicLink — failure modes', () => {
  it('returns `misconfigured` when Supabase env is unset', async () => {
    // No stubEnv()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm('operator@factivist.app'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('misconfigured')
    expect(otpMock).not.toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalledTimes(1)
  })

  it('classifies rate-limit responses distinctly', async () => {
    stubEnv()
    otpMock.mockResolvedValueOnce({
      error: { message: 'Rate limit exceeded (status 429)' },
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm('operator@factivist.app'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('rate_limited')
    expect(errSpy).toHaveBeenCalled()
  })

  it('falls back to `network` on a generic Supabase error', async () => {
    stubEnv()
    otpMock.mockResolvedValueOnce({ error: { message: 'unexpected server error' } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm('operator@factivist.app'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('network')
  })

  it('falls back to `network` when the SDK throws', async () => {
    stubEnv()
    otpMock.mockRejectedValueOnce(new Error('fetch blew up'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm('operator@factivist.app'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('network')
    expect(errSpy).toHaveBeenCalled()
  })

  it('handles a non-Error throwable without crashing', async () => {
    stubEnv()
    otpMock.mockImplementationOnce(() => {
      throw 'string-thrown'
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { sendMagicLink } = await import('../loginActions.ts')
    const result = await sendMagicLink(buildForm('operator@factivist.app'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('network')
  })
})
