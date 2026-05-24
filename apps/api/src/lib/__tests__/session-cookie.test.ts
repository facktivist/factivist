/**
 * Unit tests for the signed session-cookie helpers.
 *
 * Strategy: drive `signSession` / `verifySession` as pure functions of
 * env state + (for verify) a virtual clock. No HTTP, no Hono, no DB.
 *
 * Coverage:
 *   - happy round trip
 *   - tampered signature → bad_signature
 *   - tampered payload   → bad_signature
 *   - malformed shape    → malformed
 *   - expired payload    → expired
 *   - secret unset       → secret_unset
 *   - secret rotation invalidates pre-rotation cookies
 *   - extractSessionCookie isolates our cookie from co-tenants
 *   - buildSetCookieHeader carries the expected flags
 */

import type { Nullifier } from '@factivist/shared/validators'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildSetCookieHeader,
  extractSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_TTL_SECONDS,
  type SessionCookiePayload,
  signSession,
  verifySession,
} from '../session-cookie.ts'

const NULLIFIER = `0x${'a'.repeat(64)}` as Nullifier
const SECRET_HEX = 'a'.repeat(64) // 64 hex chars → 32 bytes

const basePayload = (overrides?: Partial<SessionCookiePayload>): SessionCookiePayload => ({
  nullifier: NULLIFIER,
  handle: 'c_aaaaaaaaaa',
  stateCode: 'KA' as SessionCookiePayload['stateCode'],
  districtCode: 'KA-09' as SessionCookiePayload['districtCode'],
  sessionNonce: 'a'.repeat(32),
  issuedAt: Math.floor(new Date('2026-05-24T00:00:00.000Z').getTime() / 1000),
  ...overrides,
})

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('signSession + verifySession (round trip)', () => {
  it('round-trips a payload byte-for-byte under the hex secret', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    const payload = basePayload()
    const cookie = signSession(payload)
    expect(cookie).not.toBeNull()
    if (!cookie) throw new Error('precondition failed')

    // Verify within the TTL window.
    const now = () => (payload.issuedAt + 60) * 1000
    const result = verifySession(cookie, now)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.payload).toEqual(payload)
  })

  it('accepts a 32+ byte ASCII secret (operator dev convenience)', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', 'x'.repeat(32))
    const cookie = signSession(basePayload())
    expect(cookie).not.toBeNull()
    if (!cookie) throw new Error('precondition failed')
    const result = verifySession(cookie, () => basePayload().issuedAt * 1000 + 1000)
    expect(result.ok).toBe(true)
  })

  it('returns null from sign when the secret is unset (fail-closed)', () => {
    const cookie = signSession(basePayload())
    expect(cookie).toBeNull()
  })

  it('returns null from sign when the secret is too short to be usable', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', 'short')
    expect(signSession(basePayload())).toBeNull()
  })
})

describe('verifySession failure modes', () => {
  it('reports secret_unset when env is missing (no secret oracle)', () => {
    const result = verifySession('anything')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('secret_unset')
  })

  it('reports malformed for nullish / non-string input', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    expect(verifySession(null)).toEqual({ ok: false, reason: 'malformed' })
    expect(verifySession(undefined)).toEqual({ ok: false, reason: 'malformed' })
    expect(verifySession('')).toEqual({ ok: false, reason: 'malformed' })
  })

  it('reports malformed when the cookie has no `.` separator', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    expect(verifySession('no-dot-here')).toEqual({ ok: false, reason: 'malformed' })
  })

  it('reports malformed when the separator is at the boundary', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    expect(verifySession('.sig')).toEqual({ ok: false, reason: 'malformed' })
    expect(verifySession('payload.')).toEqual({ ok: false, reason: 'malformed' })
  })

  it('reports bad_signature when the signature is tampered with', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    const cookie = signSession(basePayload())
    if (!cookie) throw new Error('precondition failed')
    const [payloadPart] = cookie.split('.')
    const tampered = `${payloadPart}.AAAAAAAA`
    const result = verifySession(tampered)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('bad_signature')
  })

  it('reports bad_signature when the payload is tampered with', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    const cookie = signSession(basePayload())
    if (!cookie) throw new Error('precondition failed')
    const [, sigPart] = cookie.split('.')
    // Use a base64url-clean replacement payload of similar length so the
    // decoder runs but the signature mismatches.
    const tamperedPayload = 'AAAAAAAA'
    const tampered = `${tamperedPayload}.${sigPart}`
    const result = verifySession(tampered)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('bad_signature')
  })

  it('reports expired when the cookie is older than 24h', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    const payload = basePayload()
    const cookie = signSession(payload)
    if (!cookie) throw new Error('precondition failed')
    // 25h after issuance.
    const farFuture = () => (payload.issuedAt + SESSION_COOKIE_TTL_SECONDS + 3600) * 1000
    const result = verifySession(cookie, farFuture)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('expired')
  })

  it('reports expired when the cookie issuedAt is in the future (clock skew shield)', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    const payload = basePayload()
    const cookie = signSession(payload)
    if (!cookie) throw new Error('precondition failed')
    // Server clock is in the past relative to the issuer.
    const past = () => (payload.issuedAt - 10) * 1000
    const result = verifySession(cookie, past)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('expired')
  })

  it('rotating the secret invalidates pre-rotation cookies', () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    const cookie = signSession(basePayload())
    if (!cookie) throw new Error('precondition failed')

    vi.unstubAllEnvs()
    vi.stubEnv('FACTIVIST_SESSION_SECRET', 'b'.repeat(64))
    const result = verifySession(cookie, () => basePayload().issuedAt * 1000 + 1000)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('bad_signature')
  })

  it('reports malformed when the signed payload is not the expected shape', async () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SECRET_HEX)
    // Manually craft a signed cookie whose payload is `{"foo":1}` so the
    // signature is valid but the shape check fails.
    const { createHmac } = await import('node:crypto')
    const secret = Buffer.from(SECRET_HEX, 'hex')
    const payloadBytes = Buffer.from(JSON.stringify({ foo: 1 }), 'utf8')
    const sig = createHmac('sha256', secret).update(payloadBytes).digest()
    const toUrl = (b: Buffer) =>
      b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const cookie = `${toUrl(payloadBytes)}.${toUrl(sig)}`
    const result = verifySession(cookie)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toBe('malformed')
  })
})

describe('extractSessionCookie', () => {
  it('returns null when the header is missing or empty', () => {
    expect(extractSessionCookie(undefined)).toBeNull()
    expect(extractSessionCookie(null)).toBeNull()
    expect(extractSessionCookie('')).toBeNull()
  })

  it('extracts our cookie when it is the sole value', () => {
    expect(extractSessionCookie(`${SESSION_COOKIE_NAME}=abc.def`)).toBe('abc.def')
  })

  it('extracts our cookie from a multi-cookie header', () => {
    const header = `other=foo; ${SESSION_COOKIE_NAME}=abc.def; another=bar`
    expect(extractSessionCookie(header)).toBe('abc.def')
  })

  it('returns null when the cookie is absent', () => {
    expect(extractSessionCookie('other=foo; another=bar')).toBeNull()
  })

  it('ignores malformed pairs without `=`', () => {
    expect(extractSessionCookie('justaword; another=bar')).toBeNull()
  })
})

describe('buildSetCookieHeader', () => {
  it('includes HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age', () => {
    const out = buildSetCookieHeader('VALUE')
    expect(out).toContain(`${SESSION_COOKIE_NAME}=VALUE`)
    expect(out).toContain('HttpOnly')
    expect(out).toContain('Secure')
    expect(out).toContain('SameSite=Lax')
    expect(out).toContain('Path=/')
    expect(out).toContain(`Max-Age=${SESSION_COOKIE_TTL_SECONDS}`)
  })

  it('omits Secure when explicitly disabled (HTTP dev)', () => {
    const out = buildSetCookieHeader('VALUE', false)
    expect(out).not.toContain('Secure')
    // Other flags survive.
    expect(out).toContain('HttpOnly')
    expect(out).toContain('SameSite=Lax')
  })
})
