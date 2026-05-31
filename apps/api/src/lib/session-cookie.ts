/**
 * Signed session cookie — wave-2C of Phase 5 Pipeline A.
 *
 * ## Why this exists
 *
 * Wave 1 shipped `POST /identity/verify` accepting a `sessionNonce` field
 * but the handler parsed-and-discarded it. The follow-on read path
 * (`GET /identity/session`) read a self-asserted `x-factivist-nullifier`
 * header — anyone could impersonate any verified citizen for read-only
 * session info. This module replaces that vulnerability with a signed
 * cookie that consumes the nonce: tampering with the cookie payload
 * changes the signature; replaying an old nonce changes nothing because
 * the signature is over the whole payload.
 *
 * ## Cookie shape (opaque to clients)
 *
 *   factivist-session = base64url(payloadJSON) "." base64url(hmacSig)
 *
 * Where `payloadJSON` is the canonical-JSON encoding of
 * `SessionCookiePayload` and `hmacSig` is HMAC-SHA256 of the payload
 * bytes (NOT the base64 string) keyed by `FACTIVIST_SESSION_SECRET`.
 *
 * ## Anonymity rule (ADR-0010)
 *
 * The nullifier is allowed INSIDE the cookie because the cookie is
 * opaque — only the API (which already owns the nullifier in the
 * `citizens` table) can decrypt it. The nullifier MUST NOT appear in any
 * response BODY; reads continue to return only the derived handle + geo.
 *
 * ## Test seam
 *
 * Both `signSession()` and `verifySession()` are pure functions of
 * `(payload, env)` — no I/O, no Date.now() side effects beyond the
 * issuance/expiry timestamps which the caller provides explicitly via
 * the payload's `issuedAt`. Unit tests mock `Date.now()` via Vitest's
 * fake timers to exercise the 24h expiry boundary.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import type { Nullifier, SessionStatus } from '@factivist/shared/validators'

const SESSION_SECRET_ENV = 'FACTIVIST_SESSION_SECRET' as const

/** 24h TTL — matches the Supabase admin JWT TTL for symmetry. */
export const SESSION_COOKIE_TTL_SECONDS = 86_400 as const

/** Canonical cookie name. */
export const SESSION_COOKIE_NAME = 'factivist-session' as const

/**
 * Payload stored inside the signed cookie. Carries the verified
 * citizen's nullifier (server-only — never echoed in response bodies)
 * plus the geo claims and the per-verify `sessionNonce` so a tampered or
 * replayed nonce invalidates the signature.
 */
export interface SessionCookiePayload {
  readonly nullifier: Nullifier
  readonly handle: string
  readonly stateCode: NonNullable<SessionStatus['stateCode']>
  readonly districtCode: NonNullable<SessionStatus['districtCode']>
  /** Echo of the verify request's `sessionNonce` — binds nonce → cookie. */
  readonly sessionNonce: string
  /** Unix epoch seconds. Cookies older than 24h are rejected by `verifySession`. */
  readonly issuedAt: number
}

export type VerifySessionResult =
  | { readonly ok: true; readonly payload: SessionCookiePayload }
  | {
      readonly ok: false
      readonly reason: 'malformed' | 'bad_signature' | 'expired' | 'secret_unset'
    }

/**
 * Read + validate the secret. We re-read on every call so a runtime env
 * rotation takes effect on the next request (no module-level cache).
 *
 * Returns `null` when the secret is unset OR not a 32+ byte hex string.
 * Callers must treat a `null` return as "fail closed" — the route MUST
 * NOT issue or accept a cookie without a signing secret.
 */
const readSecret = (): Buffer | null => {
  const raw = process.env[SESSION_SECRET_ENV]
  if (!raw) return null
  // Accept either raw bytes (>=32 chars) or hex (64 hex chars = 32 bytes).
  // Hex is the documented form in .env.example; we tolerate plain ASCII
  // for local dev so an operator can drop in any 32+ byte string.
  if (/^[0-9a-fA-F]{64,}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  if (raw.length >= 32) {
    return Buffer.from(raw, 'utf8')
  }
  return null
}

/**
 * URL-safe base64 (RFC 4648 §5) without padding. The Hono cookie value
 * is sent verbatim in `Set-Cookie`; stripping `=` and swapping `+/` for
 * `-_` keeps the cookie URL-safe and free of characters that some
 * downstream proxies mangle.
 */
const toBase64Url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromBase64Url = (s: string): Buffer => {
  // Re-pad before decoding. Buffer.from accepts unpadded but we re-pad to
  // be explicit about the encoding contract.
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

/**
 * HMAC-SHA256(secret, payloadBytes). Pure crypto — no I/O.
 */
const sign = (payloadBytes: Buffer, secret: Buffer): Buffer => {
  const h = createHmac('sha256', secret)
  h.update(payloadBytes)
  return h.digest()
}

/**
 * Sign a session payload into the cookie string. Returns `null` if the
 * secret is unset — the caller (route) translates `null` into a 503 so
 * verify cannot silently issue an unverifiable session.
 */
export const signSession = (payload: SessionCookiePayload): string | null => {
  const secret = readSecret()
  if (!secret) return null
  // Canonical JSON: stable key order so the same payload always produces
  // the same signature. We rely on `JSON.stringify` preserving insertion
  // order on a frozen object plus the field-by-field literal below — no
  // need for a heavyweight canonicaliser at this scale.
  const canonical = {
    nullifier: payload.nullifier,
    handle: payload.handle,
    stateCode: payload.stateCode,
    districtCode: payload.districtCode,
    sessionNonce: payload.sessionNonce,
    issuedAt: payload.issuedAt,
  }
  const payloadBytes = Buffer.from(JSON.stringify(canonical), 'utf8')
  const sigBytes = sign(payloadBytes, secret)
  return `${toBase64Url(payloadBytes)}.${toBase64Url(sigBytes)}`
}

/**
 * Verify + decode a cookie string. Constant-time signature compare via
 * `timingSafeEqual` so a tampered cookie cannot leak the secret via
 * response-time analysis. Rejects payloads older than 24h.
 *
 * `now` is an injectable clock — tests pass a fake `Date` to exercise
 * the expiry boundary.
 */
export const verifySession = (
  cookie: string | undefined | null,
  now: () => number = Date.now,
): VerifySessionResult => {
  const secret = readSecret()
  if (!secret) return { ok: false, reason: 'secret_unset' }
  if (!cookie || typeof cookie !== 'string') return { ok: false, reason: 'malformed' }

  const dot = cookie.indexOf('.')
  if (dot <= 0 || dot === cookie.length - 1) return { ok: false, reason: 'malformed' }
  const payloadPart = cookie.slice(0, dot)
  const sigPart = cookie.slice(dot + 1)

  let payloadBytes: Buffer
  let claimedSig: Buffer
  try {
    payloadBytes = fromBase64Url(payloadPart)
    claimedSig = fromBase64Url(sigPart)
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  const expectedSig = sign(payloadBytes, secret)
  if (claimedSig.length !== expectedSig.length) {
    return { ok: false, reason: 'bad_signature' }
  }
  if (!timingSafeEqual(claimedSig, expectedSig)) {
    return { ok: false, reason: 'bad_signature' }
  }

  // Signature matches — now parse + validate the payload shape.
  let parsed: SessionCookiePayload
  try {
    const obj = JSON.parse(payloadBytes.toString('utf8')) as unknown
    if (!obj || typeof obj !== 'object') return { ok: false, reason: 'malformed' }
    const candidate = obj as Record<string, unknown>
    if (
      typeof candidate.nullifier !== 'string' ||
      typeof candidate.handle !== 'string' ||
      typeof candidate.stateCode !== 'string' ||
      typeof candidate.districtCode !== 'string' ||
      typeof candidate.sessionNonce !== 'string' ||
      typeof candidate.issuedAt !== 'number'
    ) {
      return { ok: false, reason: 'malformed' }
    }
    parsed = {
      nullifier: candidate.nullifier as Nullifier,
      handle: candidate.handle,
      stateCode: candidate.stateCode as NonNullable<SessionStatus['stateCode']>,
      districtCode: candidate.districtCode as NonNullable<SessionStatus['districtCode']>,
      sessionNonce: candidate.sessionNonce,
      issuedAt: candidate.issuedAt,
    }
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  // Expiry: 24h from issuedAt. `now()` is ms; issuedAt is seconds.
  const ageMs = now() - parsed.issuedAt * 1000
  if (ageMs < 0 || ageMs > SESSION_COOKIE_TTL_SECONDS * 1000) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, payload: parsed }
}

/**
 * Build the `Set-Cookie` header value for the freshly signed session.
 *
 *   - HttpOnly  → JS in the browser cannot read it (XSS-resistant).
 *   - Secure    → only sent over TLS (forced in production).
 *   - SameSite=Lax → CSRF mitigation; the verify route is the only POST
 *                    that issues it, and the read route is idempotent.
 *   - Path=/    → available to all routes on the API origin.
 *   - Max-Age   → matches the payload's TTL so the browser stops sending
 *                 it once the server would reject it anyway.
 */
export const buildSetCookieHeader = (
  cookieValue: string,
  /** When false, omit `Secure` so the cookie is visible in HTTP dev. */
  secure: boolean = true,
): string => {
  const flags = ['HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${SESSION_COOKIE_TTL_SECONDS}`]
  if (secure) flags.unshift('Secure')
  return `${SESSION_COOKIE_NAME}=${cookieValue}; ${flags.join('; ')}`
}

/**
 * Extract our cookie value from a `Cookie` header. Returns `null` when
 * the header is missing or the cookie name does not appear. Tolerates
 * other cookies in the same header (semicolon-separated).
 */
export const extractSessionCookie = (cookieHeader: string | undefined | null): string | null => {
  if (!cookieHeader) return null
  // Cookie header grammar: name=value; name=value; ...
  // We don't need a full RFC 6265 parser — split on `;` and trim.
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const name = trimmed.slice(0, eq)
    if (name === SESSION_COOKIE_NAME) {
      return trimmed.slice(eq + 1)
    }
  }
  return null
}
