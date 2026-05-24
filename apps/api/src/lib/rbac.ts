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
 *     forwarded via `Authorization: Bearer <jwt>` and decoded by the
 *     `supabase-js` server SDK in a wave-2 PR. For Phase 5 Pipeline C
 *     we accept the *resolved* identity via either:
 *       1. An `x-factivist-role` test header (only honoured when
 *          `process.env.FACTIVIST_TRUSTED_HEADER_AUTH === '1'`), OR
 *       2. A `factivist.actor` context value pre-populated by an upstream
 *          middleware (the Supabase decoder ships in a follow-up).
 *
 *   - This decouples route handlers + tests from the not-yet-shipped
 *     Supabase wiring while keeping the security boundary explicit and
 *     a single line away from production-grade auth.
 *
 * ## Why no inline JWT decode here
 *
 * Pulling `@supabase/supabase-js` into this middleware would couple every
 * admin route to a network probe even on test runs. The wave-2 PR
 * introduces a `supabaseAuthMiddleware` that runs ONCE per request and
 * populates `c.set('factivist.actor', …)`; this module reads that value.
 *
 * ## Threat-model alignment
 *
 *   - Citizen JWTs (nullifier-bound, no `role=admin`) MUST NOT satisfy
 *     `requireAdmin` — verified by ATID-ADMIN-001 (forthcoming) and the
 *     contract test in `apps/api/src/__tests__/admin-guard.test.ts`.
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

  // 2. Test escape hatch — only honoured when explicitly opted in.
  if (process.env[TRUSTED_HEADER_ENV] === '1') {
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
