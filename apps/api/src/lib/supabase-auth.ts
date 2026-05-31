/**
 * Supabase Auth bearer-token middleware — wave-3B of Phase 5 Pipeline C.
 *
 * ## What this does
 *
 * Every request that reaches the Hono app passes through this
 * middleware FIRST. It:
 *
 *   1. Reads `Authorization: Bearer <jwt>` from the incoming request.
 *   2. Verifies the JWT LOCALLY against Supabase's published JWKS via
 *      `verifyAccessToken` from `./supabase-jwks.ts`. Wave-2 used
 *      `supabase.auth.getUser(token)` (one Supabase HTTP round-trip per
 *      request). Wave-3B replaces that with cached JWKS + WebCrypto
 *      verification — zero network on the hot path.
 *   3. Reads the role claim from `app_metadata.role` (preferred — the
 *      client cannot mutate it) falling back to `user_metadata.role`.
 *      (Both branches live inside `verifyAccessToken`.)
 *   4. Publishes the resolved actor on `c.set('factivist.actor', …)`
 *      where `apps/api/src/lib/rbac.ts` reads it.
 *
 * ## Why NOT 401 here
 *
 * Plenty of routes in this app are intentionally public — the citizen
 * complaint feed, the constituency directory, the public grievance
 * intake. So a missing or invalid bearer is NOT itself a failure: this
 * middleware silently falls through and leaves `factivist.actor`
 * unset. The downstream `requireAdmin` / `requireModerator` guards
 * decide whether absence is fatal.
 *
 * ## Why not a hard dep on Supabase running in tests
 *
 * Tests run with `NODE_ENV=test` and never set `SUPABASE_URL`. The
 * middleware is a no-op in that mode — it never builds the JWKS getter,
 * never reaches the network, and never fights the test-mode header
 * escape hatch in `rbac.ts`. Production with `SUPABASE_URL` set is the
 * only path that performs JWKS verification.
 *
 * ## Threat-model alignment (ADR-0010, ADR-0014, ADR-0016)
 *
 *   - Citizen JWTs (anoncitizen) NEVER carry a `role` claim, so they
 *     resolve to `{ sub, role: null }` and fall through to `public`.
 *   - Service-role JWTs (`aud: "service_role"`) cannot masquerade as
 *     admin users — `verifyAccessToken` pins `aud: "authenticated"`.
 *   - Bearer leak surface = the admin's Supabase session. Mitigation is
 *     short JWT TTLs (Supabase default 1h) + service-role rotation —
 *     both Supabase-side concerns, not this module's.
 *   - A malformed/expired token surfaces identically to "no token at
 *     all" so a probe cannot map operator vs. anonymous traffic.
 */

import type { Context, MiddlewareHandler, Next } from 'hono'

import { ACTOR_KEY, type Actor } from './rbac.ts'
import { verifyAccessToken } from './supabase-jwks.ts'

const SUPABASE_URL_ENV = 'SUPABASE_URL' as const

/**
 * Pull the bearer token off `Authorization: Bearer <jwt>`. Returns the
 * raw token (no `Bearer ` prefix) or `null` if the header is missing,
 * mis-cased, or malformed.
 */
const extractBearer = (c: Context): string | null => {
  const header = c.req.header('Authorization') ?? c.req.header('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? (match[1] ?? null) : null
}

/**
 * Factory: build the per-request bearer verification middleware.
 *
 * The factory shape lets `app.ts` mount it once and lets integration
 * tests build app instances that skip the middleware (or stub the
 * verifier via `vi.mock('./supabase-jwks.ts', …)`).
 */
export const supabaseAuthMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    // No-op when env is not configured. This is the test-mode path AND
    // the legitimate "Supabase not provisioned yet" production path —
    // both fall through to the public branch in rbac.ts.
    const url = process.env[SUPABASE_URL_ENV]
    if (!url) {
      await next()
      return
    }

    const token = extractBearer(c)
    if (!token) {
      await next()
      return
    }

    const verified = await verifyAccessToken(token)
    if (!verified) {
      // Invalid / expired / wrong-audience / unreachable JWKS — all
      // indistinguishable from "no bearer at all" at the rbac layer.
      await next()
      return
    }

    if (!verified.role) {
      // Authenticated but not an admin/moderator — i.e. a citizen
      // logged into the admin origin. Fall through as `public`.
      await next()
      return
    }

    const actor: Actor = Object.freeze({ id: verified.sub, role: verified.role })
    c.set(ACTOR_KEY, actor)
    // Also stash the verified token so downstream routes that proxy
    // to other services (Storage, etc.) can forward it without
    // re-reading the header.
    c.set('factivist.token', token)

    await next()
  }
}
