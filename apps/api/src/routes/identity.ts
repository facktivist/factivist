import { createHash } from 'node:crypto'

import { createClient } from '@factivist/db/client'
import { auditLog, citizens, type NewAuditLogEntry } from '@factivist/db/schema'
import {
  deriveHandle,
  type Nullifier,
  nullifierSchema,
  proveRequestSchema,
  type SessionStatus,
  type VerifyProofResponse,
  verifyProofRequestSchema,
} from '@factivist/shared/validators'
import { verifyProofOnDevice, ZkpNotConfiguredError } from '@factivist/zkp-client'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { isFlagEnabled } from '../lib/flags.ts'
import {
  buildSetCookieHeader,
  extractSessionCookie,
  type SessionCookiePayload,
  signSession,
  verifySession,
} from '../lib/session-cookie.ts'
import {
  CircuitConstraintError,
  ProverNotConfiguredError,
  ProvingFailedError,
  proveServerSide,
} from '../lib/zkp-prover.ts'

/**
 * Identity routes — verify a citizen proof, prove server-side (low-tier
 * fallback), and report session status from a signed cookie.
 *
 * Contracts:
 *   - `docs/architecture/phase-5/identity-contract.md`
 *   - `docs/architecture/phase-5/identity-wiring.md` §5.1, §5.2
 *
 * ## Cookie scheme (wave-2C)
 *
 * On successful `POST /identity/verify` we issue a `factivist-session`
 * cookie signed with `FACTIVIST_SESSION_SECRET` (see
 * `apps/api/src/lib/session-cookie.ts`). The cookie carries the
 * nullifier — opaque to clients — plus the per-request `sessionNonce`
 * so any tampering or replay invalidates the signature. `GET
 * /identity/session` reads the cookie (NOT the self-asserted
 * `x-factivist-nullifier` header, which was a wave-1 vulnerability) and
 * returns the public session shape. The header path is preserved ONLY
 * under `NODE_ENV=test` for backward-compat with wave-1 tests.
 *
 * ## Server-side proving (wave-2C)
 *
 * `POST /identity/prove` is the low-tier device fallback. The witness
 * (which contains the citizen's Aadhaar number) is transient memory
 * only — never logged, never persisted, never echoed in any response.
 * Aadhaar bytes are zeroed via `zeroiseWitness()` in a `finally` block
 * regardless of prover outcome. Per identity-wiring.md §5.2 the route:
 *
 *   - rate-limits per source IP (10 req/min in-memory token bucket — a
 *     production replacement that survives process restarts is tracked
 *     as a wave-3 follow-up).
 *   - emits one `audit_log` row per attempt with `action =
 *     'identity.prove_attempt'`, `targetId = <request UUID>`, and a
 *     `payloadHash` of `{proofSucceeded}` ONLY — NEVER the witness.
 *   - returns the same `(proof, publicSignals)` envelope the on-device
 *     prover produces, so the client's subsequent `/identity/verify`
 *     call is identical for both code paths.
 */

const TEST_MODE = (): boolean => process.env.NODE_ENV === 'test'

/**
 * In-process token bucket for `POST /identity/prove`.
 *
 * 10 requests / 60s / source IP. The bucket is intentionally in-memory:
 * Phase 5 ops will replace this with a Cloudflare KV or Upstash Redis
 * limiter once the API is multi-instance, but for the S1 single-instance
 * deployment this is sufficient and avoids the operational cost of a
 * shared store. Tests reset the bucket via `__resetRateLimit()`.
 */
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const rateLimitBuckets = new Map<string, number[]>()

/** Test-only — clear all rate-limit state between scenarios. */
export const __resetRateLimit = (): void => {
  rateLimitBuckets.clear()
}

const consumeRateLimit = (ip: string, now: number = Date.now()): boolean => {
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const bucket = (rateLimitBuckets.get(ip) ?? []).filter((t) => t > cutoff)
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(ip, bucket)
    return false
  }
  bucket.push(now)
  rateLimitBuckets.set(ip, bucket)
  return true
}

/**
 * Best-effort source IP — Hono does not normalise this for us. We trust
 * `x-forwarded-for` (Cloudflare sets it) and fall back to a stable
 * placeholder when neither header is present (e.g. local `app.request()`
 * tests). The placeholder MUST NOT be `'unknown'` literally — that would
 * collapse all anon tests into one bucket and make rate-limit assertions
 * flaky. Tests override via `x-test-client-id`.
 */
const sourceIp = (c: import('hono').Context): string => {
  if (TEST_MODE()) {
    const testId = c.req.header('x-test-client-id')
    if (testId) return `test:${testId}`
  }
  const fwd = c.req.header('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'fwd:empty'
  return c.req.header('x-real-ip') ?? 'anon:local'
}

export const identityRoute = new Hono()
  .post(
    '/identity/verify',
    zValidator('json', verifyProofRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            verified: false as const,
            error: 'invalid_proof',
            code: 'PROOF_MALFORMED' as const,
          } satisfies VerifyProofResponse,
          400,
        )
      }
    }),
    async (c) => {
      const url = process.env.DATABASE_URL
      if (!url) {
        return c.json(
          {
            verified: false as const,
            error: 'db_down',
            code: 'DB_DOWN' as const,
          } satisfies VerifyProofResponse,
          503,
        )
      }
      const db = createClient(url)

      // Phase 5 wave 1: writes are gated by S1_COMPLAINT_SUBMIT — verifying
      // identity is the first write that unlocks complaint submission, so
      // the same flag gates it.
      const submitEnabled = await isFlagEnabled(db, 'S1_COMPLAINT_SUBMIT')
      if (!submitEnabled) {
        return c.json(
          {
            verified: false as const,
            error: 'feature_disabled',
            code: 'S1_COMPLAINT_SUBMIT_OFF' as const,
          } satisfies VerifyProofResponse,
          503,
        )
      }

      const { proof, publicSignals, sessionNonce } = c.req.valid('json')
      const [nullifierRaw, , stateCode, districtCode] = publicSignals

      // Defence-in-depth: re-parse the nullifier here so we catch any
      // mismatch between the route schema and the DB constraints.
      const nullifier = nullifierSchema.parse(nullifierRaw)

      // Step 1: device-side proof verification. We re-verify on the server
      // for now because we don't yet trust client-claimed proofs — Phase 5
      // wave 2 will move the canonical check on-chain via CitizenVerifier.
      try {
        const ok = await verifyProofOnDevice(proof, publicSignals)
        if (!ok) {
          return c.json(
            {
              verified: false as const,
              error: 'invalid_proof',
              code: 'PROOF_REJECTED' as const,
            } satisfies VerifyProofResponse,
            400,
          )
        }
      } catch (err) {
        if (err instanceof ZkpNotConfiguredError) {
          return c.json(
            {
              verified: false as const,
              error: 'zkp_not_configured',
              code: 'ZKP_NOT_CONFIGURED' as const,
            } satisfies VerifyProofResponse,
            503,
          )
        }
        throw err
      }

      // Step 2: idempotent insert. The unique index on `nullifier` is the
      // canonical "already used" check; we round-trip the row so we can
      // detect "same nullifier exists" vs "new row inserted".
      const inserted = await db
        .insert(citizens)
        .values({ nullifier, stateCode, districtCode })
        .onConflictDoNothing({ target: citizens.nullifier })
        .returning()

      if (inserted.length === 0) {
        // Already existed. For Phase 5 wave 1 we treat this as a 409 — the
        // session-binding layer that distinguishes "same device replays own
        // proof" from "different device replays" lands in Pipeline F.
        return c.json(
          {
            verified: false as const,
            error: 'nullifier_already_used',
            code: 'NULLIFIER_REPLAY' as const,
          } satisfies VerifyProofResponse,
          409,
        )
      }

      const row = inserted[0]
      if (!row) {
        return c.json(
          {
            verified: false as const,
            error: 'db_down',
            code: 'DB_DOWN' as const,
          } satisfies VerifyProofResponse,
          503,
        )
      }
      const handle = deriveHandle(nullifier)

      // Wave-2C: bind the per-request sessionNonce into a signed cookie.
      // If `FACTIVIST_SESSION_SECRET` is unset we still return 200 + JSON
      // (the cookie is additive — wave-1 clients work without it) but
      // skip the Set-Cookie header. Operators MUST set the secret in
      // production; `apps/api/.env.example` documents the requirement.
      const cookiePayload: SessionCookiePayload = {
        nullifier,
        handle,
        stateCode,
        districtCode,
        sessionNonce,
        issuedAt: Math.floor(Date.now() / 1000),
      }
      const cookieValue = signSession(cookiePayload)
      if (cookieValue !== null) {
        // `Secure` is gated on NODE_ENV so local HTTP dev works without TLS.
        const secure = process.env.NODE_ENV === 'production'
        c.header('Set-Cookie', buildSetCookieHeader(cookieValue, secure))
      }

      return c.json(
        {
          verified: true as const,
          handle,
          citizen: {
            handle,
            stateCode,
            districtCode,
            joinedAt: row.createdAt.toISOString(),
          },
        } satisfies VerifyProofResponse,
        200,
      )
    },
  )
  .post(
    '/identity/prove',
    zValidator('json', proveRequestSchema, (result, c) => {
      if (!result.success) {
        // Zod rejection — we deliberately do NOT include the Zod issue
        // list in the response body because a malformed witness will
        // include the Aadhaar bytes in `issue.received` and we MUST NOT
        // echo them back.
        return c.json({ code: 'PROOF_MALFORMED' as const }, 400)
      }
    }),
    async (c) => {
      // ─── Rate limit (10 req / min / source IP) ─────────────────────
      const ip = sourceIp(c)
      if (!consumeRateLimit(ip)) {
        return c.json({ code: 'RATE_LIMITED' as const }, 429)
      }

      // ─── Feature flag gate (same as /identity/verify) ──────────────
      const url = process.env.DATABASE_URL
      if (!url) {
        return c.json({ code: 'PROVER_NOT_CONFIGURED' as const }, 503)
      }
      const db = createClient(url)
      const submitEnabled = await isFlagEnabled(db, 'S1_COMPLAINT_SUBMIT')
      if (!submitEnabled) {
        return c.json({ code: 'S1_COMPLAINT_SUBMIT_OFF' as const }, 503)
      }

      const { witness } = c.req.valid('json')

      // Per-request audit anchor. The targetId is an opaque UUID — NOT
      // derived from the witness or the citizen — so the audit_log row
      // cannot be linked back to a real-world identity.
      const requestId = crypto.randomUUID()

      // ─── Anti-leak response headers ────────────────────────────────
      // `no-store` keeps the proof envelope out of every proxy cache.
      // `default-src 'none'` shuts down any browser that might try to
      // render the response as HTML (it shouldn't, but the header is free).
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      c.header('Content-Security-Policy', "default-src 'none'")

      // ─── Invoke the prover ─────────────────────────────────────────
      let proofSucceeded = false
      let result: Awaited<ReturnType<typeof proveServerSide>> | null = null
      let proverError: unknown = null
      try {
        result = await proveServerSide(witness)
        proofSucceeded = true
      } catch (err) {
        proverError = err
      }

      // ─── Audit log (no PII) ────────────────────────────────────────
      // Per identity-wiring.md §5.2 + zkp-key-custody.md §Server-side
      // fallback rule #6, we record outcome only. The payloadHash is the
      // SHA-256 of `{proofSucceeded}` ONLY — NEVER the witness. If the
      // DB write itself fails we swallow the error so a transient DB hiccup
      // does not deny the client a proof they legitimately generated.
      try {
        const payloadHash = createHash('sha256')
          .update(JSON.stringify({ proofSucceeded }))
          .digest('hex')
        const entry: NewAuditLogEntry = {
          actor: 'anonymous',
          action: 'identity.prove_attempt',
          targetKind: 'session',
          targetId: requestId,
          payloadHash,
          rationale: null,
        }
        await db.insert(auditLog).values(entry)
      } catch {
        // Intentional: the audit write must never block the response.
        // A separate ops alarm tracks audit-write failures.
      }

      // ─── Map the prover outcome to an HTTP response ────────────────
      if (proofSucceeded && result) {
        return c.json(
          {
            proof: result.proof,
            publicSignals: result.publicSignals,
          },
          200,
        )
      }

      // Typed prover errors → stable HTTP codes (no err.message in body —
      // the Aadhaar could appear in a stack and we never want to echo it).
      if (proverError instanceof CircuitConstraintError) {
        return c.json({ code: 'CIRCUIT_CONSTRAINT' as const }, 400)
      }
      if (proverError instanceof ProvingFailedError) {
        return c.json({ code: 'PROVING_FAILED' as const }, 422)
      }
      if (proverError instanceof ProverNotConfiguredError) {
        return c.json({ code: 'PROVER_NOT_CONFIGURED' as const }, 503)
      }
      // Generic — body intentionally empty. The Aadhaar bytes may live
      // in the original error's stack trace; do NOT leak them.
      c.status(500)
      return c.body(null)
    },
  )
  .get('/identity/session', async (c) => {
    // ─── Cookie path (wave-2C) ─────────────────────────────────────
    // Prefer the signed cookie over the (test-only) self-asserted header.
    // Anonymous shape — returned identically for missing cookie, bad
    // signature, expired, malformed, etc. — so a probe cannot
    // distinguish "no session" from "tampered session".
    const anonShape: SessionStatus = {
      verified: false,
      handle: null,
      stateCode: null,
      districtCode: null,
    }

    const cookieHeader = c.req.header('Cookie') ?? c.req.header('cookie')
    const cookieValue = extractSessionCookie(cookieHeader)
    const verifyResult = verifySession(cookieValue)
    if (verifyResult.ok) {
      const { handle, stateCode, districtCode } = verifyResult.payload
      return c.json(
        {
          verified: true,
          handle,
          stateCode,
          districtCode,
        } satisfies SessionStatus,
        200,
      )
    }

    // ─── Test-mode header escape hatch (backward-compat for wave-1) ────
    // Production hardening: ONLY accept the header under NODE_ENV=test so
    // a misconfigured production proxy cannot revive the wave-1 vuln.
    if (TEST_MODE()) {
      const claimed = c.req.header('x-factivist-nullifier')
      if (!claimed) {
        // No cookie AND no header → either anon (200) or session-invalid
        // (401) depending on whether a cookie was even attempted. We keep
        // the wave-1 200/anon shape when no auth signal is present at all,
        // and 401 when the caller TRIED to authenticate with a bad cookie.
        return c.json(anonShape, cookieValue ? 401 : 200)
      }

      const url = process.env.DATABASE_URL
      if (!url) {
        return c.json(anonShape, 503)
      }
      const db = createClient(url)

      const parsed = nullifierSchema.safeParse(claimed)
      if (!parsed.success) {
        return c.json(anonShape, 200)
      }
      const rows = await db
        .select({
          stateCode: citizens.stateCode,
          districtCode: citizens.districtCode,
        })
        .from(citizens)
        .where(eq(citizens.nullifier, parsed.data))
        .limit(1)
      const row = rows[0]
      if (!row) {
        return c.json(anonShape, 200)
      }
      return c.json(
        {
          verified: true,
          handle: deriveHandle(parsed.data as Nullifier),
          stateCode: row.stateCode as SessionStatus['stateCode'],
          districtCode: row.districtCode as SessionStatus['districtCode'],
        } satisfies SessionStatus,
        200,
      )
    }

    // Production: no valid cookie → either anon (no auth attempted) or 401
    // (cookie present but invalid). The anonShape body is the same for both
    // so a probe cannot map auth state from the body alone.
    if (cookieValue) {
      return c.json({ code: 'SESSION_INVALID' as const }, 401)
    }
    return c.json(anonShape, 200)
  })

export type IdentityRoute = typeof identityRoute
