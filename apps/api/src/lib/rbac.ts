/**
 * Role-based access control for admin surfaces.
 *
 * Citizens are **anonymous by design** (ADR-0010) — nullifier-bound,
 * never identified. Admins are identified — Supabase Auth JWT with a
 * `role` claim. The two trust roots are disjoint (aggregates §8 I-ADM-4).
 *
 * ## Auth model
 *
 *   - In production, the Hono app sits behind Supabase Auth. The JWT is
 *     forwarded via `Authorization: Bearer <jwt>` and decoded ONCE per
 *     request by `apps/api/src/lib/supabase-auth.ts`, which publishes
 *     the resolved actor on `c.set('factivist.actor', …)`. This module
 *     reads that value.
 *
 *   - There is ALSO a test-only escape hatch on the
 *     `x-factivist-role` / `x-factivist-actor-id` headers. It is
 *     hard-gated by BOTH `process.env.FACTIVIST_TRUSTED_HEADER_AUTH === '1'`
 *     AND `process.env.NODE_ENV === 'test'`. In any other environment
 *     the headers are ignored — even with the env flag set — and a
 *     warning is logged at first use so a misconfigured deploy fails
 *     loud, not silent.
 *
 * ## Why no inline JWT decode here
 *
 * Pulling `@supabase/supabase-js` into this middleware would re-verify
 * the JWT on every guarded route. The per-request decode lives in
 * `supabase-auth.ts`; this module's only job is to read the resolved
 * actor and gate the request.
 *
 * ## Threat-model alignment
 *
 *   - Citizen JWTs (nullifier-bound, no `role=admin`) MUST NOT satisfy
 *     `requireAdmin` — verified by ATID-ADMIN-001 in
 *     `packages/shared/src/data/atid-registry.ts` and the contract
 *     suite in `apps/api/src/lib/__tests__/rbac.test.ts`.
 *   - A leaked admin JWT without the `role=admin` claim hits the same
 *     401 path (no enumeration of which roles exist).
 */

import type { Context, MiddlewareHandler, Next } from 'hono'

/** Roles known to the S1 RBAC layer. */
export const ROLES = ['admin', 'moderator', 'public'] as const
export type Role = (typeof ROLES)[number]

/** Resolved actor — what the RBAC middleware reads off the Hono context. */
export interface Actor {
  /**
   * Supabase Auth user_id for admins / moderators. `null` for `public`
   * (anonymous / citizen) callers.
   */
  readonly id: string | null
  readonly role: Role
}

/**
 * The Hono context key under which the upstream Supabase decoder
 * publishes the resolved actor. Single string constant so handlers and
 * tests don't drift on the spelling.
 */
export const ACTOR_KEY = 'factivist.actor' as const

const TRUSTED_HEADER_NAME = 'x-factivist-role' as const
const TRUSTED_HEADER_ENV = 'FACTIVIST_TRUSTED_HEADER_AUTH' as const

const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value)

/**
 * Has the misconfigured-flag warning already fired? Kept module-local so
 * we don't spam logs on every request — exactly one stderr line per
 * process when an operator accidentally enables the test escape hatch
 * outside `NODE_ENV=test`.
 */
let warnedAboutMisconfiguredFlag = false

/**
 * True iff the test header escape hatch is permitted right now. Two
 * gates must BOTH be on — the env opt-in AND `NODE_ENV === 'test'`.
 * Misconfiguration (flag on, NODE_ENV !== 'test') logs once and returns
 * false: a production deploy that accidentally ships the flag stays
 * locked down, instead of silently honouring forged headers.
 */
const isTrustedHeaderHatchEnabled = (): boolean => {
  if (process.env[TRUSTED_HEADER_ENV] !== '1') return false
  if (process.env.NODE_ENV === 'test') return true
  if (!warnedAboutMisconfiguredFlag) {
    warnedAboutMisconfiguredFlag = true
    console.warn(
      '[factivist/rbac] FACTIVIST_TRUSTED_HEADER_AUTH=1 is set but NODE_ENV is not "test"; ignoring the trusted-header escape hatch.',
    )
  }
  return false
}

/** Test seam — reset the one-shot warning between integration cases. */
export const __resetWarnedForTests = (): void => {
  warnedAboutMisconfiguredFlag = false
}

/**
 * Resolve the calling actor from (1) the upstream Supabase middleware,
 * falling back to (2) the trusted-header escape hatch when the env opt-in
 * is set, falling back to (3) a `public` anonymous actor.
 *
 * Returns a frozen object so handlers cannot mutate it.
 */
export const resolveActor = (c: Context): Actor => {
  // 1. Upstream Supabase decoder (preferred — wave-2 PR wires this).
  const upstream = c.get(ACTOR_KEY) as Actor | undefined
  if (upstream && isRole(upstream.role)) {
    return Object.freeze({ id: upstream.id ?? null, role: upstream.role })
  }

  // 2. Test escape hatch — only honoured when explicitly opted in AND
  //    NODE_ENV is "test". Any other combination logs once and ignores
  //    the headers — see `isTrustedHeaderHatchEnabled`.
  if (isTrustedHeaderHatchEnabled()) {
    const headerRole = c.req.header(TRUSTED_HEADER_NAME)
    if (headerRole && isRole(headerRole)) {
      const headerId = c.req.header('x-factivist-actor-id') ?? null
      return Object.freeze({ id: headerId, role: headerRole })
    }
  }

  // 3. Anonymous public caller.
  return Object.freeze({ id: null, role: 'public' })
}

/**
 * Middleware factory: require the caller to have *any* role in `allowed`.
 *
 * Returns 401 with a stable JSON shape `{ error: 'unauthorized' }`. We
 * deliberately avoid enumerating which roles exist (no 403 vs 401 split)
 * — both unauthenticated and wrong-role attempts surface identically so
 * a probe cannot map the role space.
 */
export const requireRole =
  (allowed: readonly Role[]): MiddlewareHandler =>
  async (c: Context, next: Next) => {
    const actor = resolveActor(c)
    if (!allowed.includes(actor.role)) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    c.set(ACTOR_KEY, actor)
    await next()
  }

/** Shorthand for the most common gate. */
export const requireAdmin = requireRole(['admin'])

/** Admin OR moderator — used by the moderation queue browse endpoint. */
export const requireModerator = requireRole(['admin', 'moderator'])
