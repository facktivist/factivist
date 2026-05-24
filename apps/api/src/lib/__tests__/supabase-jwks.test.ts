/**
 * `verifyAccessToken` unit tests — wave-3B.
 *
 * Strategy:
 *   - Generate a local ES256 key pair per test run.
 *   - Sign hand-crafted JWTs that mirror the shape Supabase issues
 *     (iss = SUPABASE_URL, aud = "authenticated", role under
 *     app_metadata / user_metadata).
 *   - Inject the matching public key into the verifier via the
 *     `__setJWKSForTests` seam so `jose.jwtVerify` resolves the key
 *     locally — no network, no real JWKS endpoint.
 *
 * The tests cover the failure matrix called out in the SKILL.md:
 *   - happy path (admin via app_metadata)
 *   - happy path (moderator)
 *   - falls back to user_metadata.role
 *   - expired token → null
 *   - wrong audience → null
 *   - wrong issuer → null
 *   - malformed token → null
 *   - missing role claim (citizen) → role: null, sub present
 *   - unknown role string → role: null
 *   - missing sub → null
 *   - missing SUPABASE_URL → null (defensive direct-call path)
 *   - empty token → null
 *   - getJWKS singleton is reused
 *   - getJWKS rebuilds when SUPABASE_URL changes
 */

import type { JWK, JWTPayload, KeyLike } from 'jose'
import { exportJWK, generateKeyPair, importJWK, SignJWT } from 'jose'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetJWKSForTests,
  __setJWKSForTests,
  getJWKS,
  verifyAccessToken,
} from '../supabase-jwks.ts'

const SUPABASE_URL = 'https://test.supabase.co'
const SUPABASE_USER_AUDIENCE = 'authenticated'

let privateKey: KeyLike | Uint8Array
let publicJWK: JWK

// Generate one key pair for the whole suite — keeps signing cheap.
beforeAll(async () => {
  const pair = await generateKeyPair('ES256', { extractable: true })
  privateKey = pair.privateKey
  publicJWK = await exportJWK(pair.publicKey)
  publicJWK.alg = 'ES256'
  publicJWK.kid = 'test-kid-1'
})

/** Build a `getKey` that always returns the test public key. */
const buildGetKey = async () => {
  const key = await importJWK(publicJWK, 'ES256')
  return async () => key as KeyLike
}

interface SignOpts {
  issuer?: string
  audience?: string
  sub?: string | null
  email?: string
  appRole?: string | null
  userRole?: string | null
  expiresIn?: string
  notBefore?: string
}

const signTestJWT = async (opts: SignOpts = {}): Promise<string> => {
  const payload: JWTPayload = {}
  if (opts.email) payload.email = opts.email
  if (opts.appRole !== undefined && opts.appRole !== null) {
    payload.app_metadata = { role: opts.appRole }
  }
  if (opts.userRole !== undefined && opts.userRole !== null) {
    payload.user_metadata = { role: opts.userRole }
  }

  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: 'test-kid-1' })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? SUPABASE_URL)
    .setAudience(opts.audience ?? SUPABASE_USER_AUDIENCE)
    .setExpirationTime(opts.expiresIn ?? '1h')

  if (opts.sub === undefined) {
    builder.setSubject('usr_test')
  } else if (opts.sub !== null) {
    builder.setSubject(opts.sub)
  }

  if (opts.notBefore) builder.setNotBefore(opts.notBefore)

  return builder.sign(privateKey)
}

beforeEach(async () => {
  vi.unstubAllEnvs()
  vi.stubEnv('SUPABASE_URL', SUPABASE_URL)
  __resetJWKSForTests()
  __setJWKSForTests(SUPABASE_URL, await buildGetKey())
})

afterEach(() => {
  vi.unstubAllEnvs()
  __resetJWKSForTests()
})

describe('verifyAccessToken — happy paths', () => {
  it('verifies an admin JWT via app_metadata.role', async () => {
    const token = await signTestJWT({ sub: 'usr_admin', appRole: 'admin' })
    const result = await verifyAccessToken(token)
    expect(result).not.toBeNull()
    expect(result?.sub).toBe('usr_admin')
    expect(result?.role).toBe('admin')
    expect(typeof result?.exp).toBe('number')
    expect(typeof result?.iat).toBe('number')
  })

  it('verifies a moderator JWT via app_metadata.role', async () => {
    const token = await signTestJWT({ sub: 'usr_mod', appRole: 'moderator' })
    const result = await verifyAccessToken(token)
    expect(result?.role).toBe('moderator')
  })

  it('extracts the email claim when present', async () => {
    const token = await signTestJWT({
      sub: 'usr_a',
      appRole: 'admin',
      email: 'admin@factivist.test',
    })
    const result = await verifyAccessToken(token)
    expect(result?.email).toBe('admin@factivist.test')
  })

  it('omits email when the claim is absent', async () => {
    const token = await signTestJWT({ sub: 'usr_a', appRole: 'admin' })
    const result = await verifyAccessToken(token)
    expect(result?.email).toBeUndefined()
  })

  it('falls back to user_metadata.role when app_metadata is absent', async () => {
    const token = await signTestJWT({ sub: 'usr_a', userRole: 'admin' })
    const result = await verifyAccessToken(token)
    expect(result?.role).toBe('admin')
  })

  it('prefers app_metadata.role over user_metadata.role when both set', async () => {
    const token = await signTestJWT({
      sub: 'usr_a',
      appRole: 'admin',
      userRole: 'moderator',
    })
    const result = await verifyAccessToken(token)
    expect(result?.role).toBe('admin')
  })
})

describe('verifyAccessToken — role rejection', () => {
  it('returns role: null when no role claim is present (citizen JWT)', async () => {
    const token = await signTestJWT({ sub: 'usr_citizen' })
    const result = await verifyAccessToken(token)
    expect(result).not.toBeNull()
    expect(result?.sub).toBe('usr_citizen')
    expect(result?.role).toBeNull()
  })

  it('returns role: null when the role claim is an unknown string', async () => {
    const token = await signTestJWT({ sub: 'usr_x', appRole: 'root' })
    const result = await verifyAccessToken(token)
    expect(result?.role).toBeNull()
  })

  it('returns role: null when user_metadata.role is an unknown string', async () => {
    const token = await signTestJWT({ sub: 'usr_y', userRole: 'root' })
    const result = await verifyAccessToken(token)
    expect(result?.role).toBeNull()
  })

  it('returns role: null when both metadata buckets are present but neither role is admin/moderator', async () => {
    const token = await signTestJWT({ sub: 'usr_z', appRole: 'guest', userRole: 'editor' })
    const result = await verifyAccessToken(token)
    expect(result?.role).toBeNull()
  })

  it('returns role: null when app_metadata.role is not a string', async () => {
    // Hand-build a payload where app_metadata.role is an array — the
    // happy-path helper coerces to string so we sign manually.
    const token = await new SignJWT({ app_metadata: { role: ['admin'] } })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-kid-1' })
      .setSubject('usr_bad')
      .setIssuedAt()
      .setIssuer(SUPABASE_URL)
      .setAudience(SUPABASE_USER_AUDIENCE)
      .setExpirationTime('1h')
      .sign(privateKey)
    const result = await verifyAccessToken(token)
    expect(result?.role).toBeNull()
  })
})

describe('verifyAccessToken — verification failures', () => {
  it('returns null for an expired token', async () => {
    // Issue a token already in the past.
    const token = await new SignJWT({ app_metadata: { role: 'admin' } })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-kid-1' })
      .setSubject('usr_a')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setIssuer(SUPABASE_URL)
      .setAudience(SUPABASE_USER_AUDIENCE)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(privateKey)
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })

  it('returns null for the wrong audience', async () => {
    const token = await signTestJWT({
      sub: 'usr_a',
      appRole: 'admin',
      audience: 'service_role',
    })
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })

  it('returns null for the wrong issuer', async () => {
    const token = await signTestJWT({
      sub: 'usr_a',
      appRole: 'admin',
      issuer: 'https://attacker.example.com',
    })
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })

  it('returns null for a malformed token (not a JWT)', async () => {
    const result = await verifyAccessToken('not.a.jwt')
    expect(result).toBeNull()
  })

  it('returns null for the empty string', async () => {
    const result = await verifyAccessToken('')
    expect(result).toBeNull()
  })

  it('returns null when the token is signed by a different key', async () => {
    const other = await generateKeyPair('ES256', { extractable: true })
    const token = await new SignJWT({ app_metadata: { role: 'admin' } })
      .setProtectedHeader({ alg: 'ES256', kid: 'attacker-kid' })
      .setSubject('usr_attacker')
      .setIssuedAt()
      .setIssuer(SUPABASE_URL)
      .setAudience(SUPABASE_USER_AUDIENCE)
      .setExpirationTime('1h')
      .sign(other.privateKey)
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })

  it('returns null when sub claim is missing', async () => {
    const token = await new SignJWT({ app_metadata: { role: 'admin' } })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-kid-1' })
      // intentionally no setSubject()
      .setIssuedAt()
      .setIssuer(SUPABASE_URL)
      .setAudience(SUPABASE_USER_AUDIENCE)
      .setExpirationTime('1h')
      .sign(privateKey)
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })
})

describe('verifyAccessToken — env gate', () => {
  it('returns null when SUPABASE_URL is unset (defensive direct-call path)', async () => {
    vi.unstubAllEnvs()
    const token = await signTestJWT({ sub: 'usr_a', appRole: 'admin' })
    // Re-stub after generating the token — generation needed the env;
    // verification needs the env *unset* to exercise the gate.
    vi.unstubAllEnvs()
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })
})

describe('getJWKS — singleton + rebuild', () => {
  it('returns the same getter across consecutive calls with the same URL', async () => {
    __resetJWKSForTests()
    __setJWKSForTests(SUPABASE_URL, await buildGetKey())
    const a = getJWKS()
    const b = getJWKS()
    expect(a).toBe(b)
  })

  it('rebuilds when SUPABASE_URL changes', async () => {
    __resetJWKSForTests()
    __setJWKSForTests(SUPABASE_URL, await buildGetKey())
    const a = getJWKS()
    vi.stubEnv('SUPABASE_URL', 'https://other.supabase.co')
    const b = getJWKS()
    expect(a).not.toBe(b)
  })

  it('throws when SUPABASE_URL is unset', () => {
    vi.unstubAllEnvs()
    __resetJWKSForTests()
    expect(() => getJWKS()).toThrow(/SUPABASE_URL/)
  })
})
