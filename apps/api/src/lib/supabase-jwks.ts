/**
 * Local JWKS-based access-token verifier for Supabase Auth bearers.
 *
 * ## Why this exists (wave-3B follow-up)
 *
 * Wave-2 wired `supabase.auth.getUser(token)` into the API's per-request
 * middleware. That call hits Supabase's `/auth/v1/user` endpoint over the
 * network on EVERY admin request — one round-trip per call. At S1 scale
 * (≤1 RPS on admin routes) that is fine, but it caps cleanly at ~10 RPS
 * before Supabase's rate limiter kicks in and the latency floor (≈80ms
 * from `ap-south-1`) becomes a UX problem on the moderator queue.
 *
 * This module replaces that round-trip with a local JWKS verification:
 *
 *   1. On first use, `jose.createRemoteJWKSet` fetches
 *      `${SUPABASE_URL}/auth/v1/keys` (RFC-7517 JWKS shape) and caches
 *      the public-key set in process memory. `jose` honours the upstream
 *      `Cache-Control` header (Supabase serves 1h TTL today) and refreshes
 *      the key set transparently on rotation — we get key-rotation
 *      handling for free.
 *
 *   2. `verifyAccessToken` calls `jose.jwtVerify` against the cached key
 *      set with `issuer` pinned to `SUPABASE_URL` and `audience` pinned
 *      to `'authenticated'` (Supabase's default audience for user JWTs).
 *      Any signature mismatch, expired token, audience mismatch, issuer
 *      mismatch, or malformed payload becomes a `null` return — the
 *      middleware decides what to do (silently fall through to public).
 *
 *   3. Role is read from `app_metadata.role` first (server-set,
 *      immutable from the client SDK), falling back to `user_metadata.role`
 *      (client-mutable; useful in dev). Anything outside the allow-list
 *      becomes `null`.
 *
 * ## Performance characteristic
 *
 *   - First request after process boot: one HTTP fetch of the JWKS
 *     (~20-40ms cold), then signature verification is local CPU
 *     (sub-millisecond for ES256/RS256 on the typical claim size).
 *   - Every subsequent request within the JWKS cache TTL: zero network.
 *   - Key rotation: `jose` transparently re-fetches when a JWT signed by
 *     an unknown `kid` arrives — no manual cache invalidation needed.
 *
 * ## What this module does NOT do
 *
 *   - It does not check Supabase's `auth.users` row for "is this user
 *     still active". A revoked admin still holds a valid signed JWT
 *     until expiry (Supabase default 1h). Defense-in-depth: short TTLs +
 *     rotate `SUPABASE_JWT_SECRET` on hostile-departure incidents.
 *   - It does not handle the legacy HS256 path. Supabase rolled JWT
 *     issuance to asymmetric (ES256 / RS256) — projects that still issue
 *     HS256 should migrate before depending on this module.
 *
 * ## Required environment
 *
 *   - `SUPABASE_URL` — project URL (or ADR-0009 custom domain). The
 *     middleware's env gate guarantees the caller checked this is set
 *     before reaching us; we still defend with an explicit error so a
 *     direct caller from a test or REPL gets an actionable message.
 *
 * ## Test seam
 *
 * `__resetJWKSForTests` clears the singleton so consecutive tests in the
 * same process can swap in a stub JWKS via `vi.mock('jose', …)`. See
 * `apps/api/src/lib/__tests__/supabase-jwks.test.ts`.
 */

import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose'

import type { Role } from './rbac.ts'

const SUPABASE_URL_ENV = 'SUPABASE_URL' as const

/** Roles the API recognises on the admin surface. Citizens carry none. */
const ADMIN_ROLES: readonly Role[] = ['admin', 'moderator']

/**
 * Supabase mints user JWTs with `aud: "authenticated"`. We pin the
 * audience check so a service-role JWT (`aud: "service_role"`) can never
 * masquerade as an admin user even if it leaks through this middleware.
 */
const SUPABASE_USER_AUDIENCE = 'authenticated' as const

/**
 * Verified token shape — only the fields the middleware needs. Everything
 * else on the JWT is intentionally discarded to keep the surface small.
 */
export interface VerifiedToken {
  readonly sub: string
  readonly email?: string
  readonly role: Role | null
  readonly exp: number
  readonly iat: number
}

/** Test-mode shim shape — see `__setJWKSForTests`. */
type JWKSGetKey = Parameters<typeof jwtVerify>[1]

/**
 * Cached JWKS singleton — keyed on issuer URL so an env flip between
 * tests rebuilds the cache cleanly.
 */
interface JWKSCache {
  readonly url: string
  readonly getKey: JWKSGetKey
}
let cachedJWKS: JWKSCache | null = null

/** Test seam — wipe the singleton between test cases. */
export const __resetJWKSForTests = (): void => {
  cachedJWKS = null
}

/**
 * Test seam — inject a deterministic JWKS-getter. Lets the unit test
 * sign a JWT with a local key pair and verify against that exact key
 * without touching the network. Production code never calls this.
 */
export const __setJWKSForTests = (url: string, getKey: JWKSGetKey): void => {
  cachedJWKS = { url, getKey }
}

/**
 * Build (or return the cached) JWKS getter for the configured Supabase
 * project. Exported so tests that drive `verifyAccessToken` directly can
 * confirm the singleton survives across calls.
 */
export const getJWKS = (): JWKSGetKey => {
  const url = process.env[SUPABASE_URL_ENV]
  if (!url) {
    throw new Error(`getJWKS: ${SUPABASE_URL_ENV} is not set; cannot build JWKS getter.`)
  }
  if (cachedJWKS && cachedJWKS.url === url) {
    return cachedJWKS.getKey
  }
  const jwksUrl = new URL('/auth/v1/keys', url)
  const getKey = createRemoteJWKSet(jwksUrl)
  cachedJWKS = { url, getKey }
  return getKey
}

/**
 * Read `app_metadata.role` (preferred) or fall back to
 * `user_metadata.role`. Returns `null` for any other shape — the
 * downstream `requireAdmin` / `requireModerator` middleware will then
 * reject the request.
 */
const extractRole = (payload: JWTPayload): Role | null => {
  const appMeta = payload.app_metadata
  if (appMeta && typeof appMeta === 'object') {
    const fromApp = (appMeta as Record<string, unknown>).role
    if (typeof fromApp === 'string' && (ADMIN_ROLES as readonly string[]).includes(fromApp)) {
      return fromApp as Role
    }
  }
  const userMeta = payload.user_metadata
  if (userMeta && typeof userMeta === 'object') {
    const fromUser = (userMeta as Record<string, unknown>).role
    if (typeof fromUser === 'string' && (ADMIN_ROLES as readonly string[]).includes(fromUser)) {
      return fromUser as Role
    }
  }
  return null
}

/**
 * Verify a Supabase user access token locally against the cached JWKS.
 *
 * Returns the narrowed claim set on success, `null` on ANY failure mode:
 *   - signature mismatch
 *   - expired (`exp` in the past)
 *   - not yet valid (`nbf` in the future)
 *   - audience mismatch (`aud !== 'authenticated'`)
 *   - issuer mismatch (`iss !== SUPABASE_URL`)
 *   - malformed token (not three base64url segments)
 *   - missing `sub`
 *   - JWKS fetch failure (no network, 5xx from Supabase, etc.)
 *
 * The middleware translates `null` into a soft fall-through so a probe
 * cannot distinguish "invalid token" from "no token" (ADR-0010, no role
 * enumeration). The middleware is the ONLY caller that should ignore the
 * `null`; direct callers (tests, scripts) get the same `null` and should
 * treat it as unauthenticated.
 */
export const verifyAccessToken = async (token: string): Promise<VerifiedToken | null> => {
  const url = process.env[SUPABASE_URL_ENV]
  if (!url) return null
  if (!token || typeof token !== 'string') return null

  try {
    const getKey = getJWKS()
    const { payload } = await jwtVerify(token, getKey, {
      issuer: url,
      audience: SUPABASE_USER_AUDIENCE,
    })

    const sub = payload.sub
    const exp = payload.exp
    const iat = payload.iat
    if (typeof sub !== 'string' || sub.length === 0) return null
    if (typeof exp !== 'number') return null
    if (typeof iat !== 'number') return null

    const email = typeof payload.email === 'string' ? (payload.email as string) : undefined

    return Object.freeze({
      sub,
      ...(email !== undefined ? { email } : {}),
      role: extractRole(payload),
      exp,
      iat,
    })
  } catch {
    // Any verify failure becomes `null`. The middleware logs nothing
    // (probe defence) and falls through to public.
    return null
  }
}
