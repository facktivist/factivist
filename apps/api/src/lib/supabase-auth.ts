/**
 * Supabase Auth bearer-token middleware — wave-2 of Phase 5 Pipeline C.
 *
 * ## What this does
 *
 * Every request that reaches the Hono app passes through this
 * middleware FIRST. It:
 *
 *   1. Reads `Authorization: Bearer <jwt>` from the incoming request.
 *   2. Verifies the JWT against Supabase by calling
 *      `supabase.auth.getUser(token)`. This is the cheapest reliable
 *      path at S1 scale (≤1 RPS admin traffic) — switching to a local
 *      JWKS verifier is a wave-3 follow-up and tracked in the wave-2
 *      doc.
 *   3. Reads the role claim from `app_metadata.role` (preferred — the
 *      client cannot mutate it) falling back to `user_metadata.role`.
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
 * middleware is a no-op in that mode — it never instantiates a client,
 * never reaches the network, and never fights the test-mode header
 * escape hatch in `rbac.ts`. Production with `SUPABASE_URL` set is the
 * only path that performs a network probe.
 *
 * ## Threat-model alignment (ADR-0010, ADR-0014, ADR-0016)
 *
 *   - Citizen JWTs (anoncitizen) NEVER carry a `role` claim, so they
 *     resolve to `{ id, role: 'public' }` and cannot reach admin routes.
 *   - Bearer leak surface = the admin's Supabase session. Mitigation is
 *     short JWT TTLs (Supabase default 1h) + service-role rotation —
 *     both Supabase-side concerns, not this module's.
 *   - A malformed/expired token surfaces identically to "no token at
 *     all" so a probe cannot map operator vs. anonymous traffic.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Context, MiddlewareHandler, Next } from 'hono'

import { ACTOR_KEY, type Actor, type Role } from './rbac.ts'

const SUPABASE_URL_ENV = 'SUPABASE_URL' as const
const SUPABASE_SERVICE_ROLE_KEY_ENV = 'SUPABASE_SERVICE_ROLE_KEY' as const

const ADMIN_ROLES: readonly Role[] = ['admin', 'moderator']

/**
 * Lazy singleton — created on first request (so test runs that never
 * exercise the admin surface stay zero-network). We key the cache on
 * (url, key) so an env flip between requests rebuilds the client.
 */
interface ClientCache {
  url: string
  key: string
  client: SupabaseClient
}
let cachedClient: ClientCache | null = null

const getSupabaseClient = (url: string, key: string): SupabaseClient => {
  if (cachedClient && cachedClient.url === url && cachedClient.key === key) {
    return cachedClient.client
  }
  const client = createClient(url, key, {
    auth: {
      // We are a server — never persist sessions, never refresh tokens
      // automatically. We verify exactly one user token per request.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  cachedClient = { url, key, client }
  return client
}

/** Test seam — `apps/api/src/lib/__tests__/supabase-auth.test.ts`. */
export const __resetSupabaseClientForTests = (): void => {
  cachedClient = null
}

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

interface RawUser {
  readonly id: string
  readonly app_metadata?: Record<string, unknown>
  readonly user_metadata?: Record<string, unknown>
}

/**
 * Read `app_metadata.role` (preferred) or fall back to
 * `user_metadata.role`. Returns `null` for any other shape — the
 * downstream `requireAdmin` / `requireModerator` middleware will then
 * reject the request.
 */
const extractRole = (user: RawUser): Role | null => {
  const fromApp = user.app_metadata?.role
  if (typeof fromApp === 'string' && (ADMIN_ROLES as readonly string[]).includes(fromApp)) {
    return fromApp as Role
  }
  const fromUser = user.user_metadata?.role
  if (typeof fromUser === 'string' && (ADMIN_ROLES as readonly string[]).includes(fromUser)) {
    return fromUser as Role
  }
  return null
}

/**
 * Factory: build the per-request bearer verification middleware.
 *
 * The factory shape lets `app.ts` mount it once and lets the integration
 * tests build app instances that skip the middleware (or stub the client
 * via `__resetSupabaseClientForTests`).
 */
export const supabaseAuthMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    // No-op when env is not configured. This is the test-mode path AND
    // the legitimate "Supabase not provisioned yet" production path —
    // both fall through to the public branch in rbac.ts.
    const url = process.env[SUPABASE_URL_ENV]
    const key = process.env[SUPABASE_SERVICE_ROLE_KEY_ENV]
    if (!url || !key) {
      await next()
      return
    }

    const token = extractBearer(c)
    if (!token) {
      await next()
      return
    }

    try {
      const client = getSupabaseClient(url, key)
      const { data, error } = await client.auth.getUser(token)
      if (error || !data?.user) {
        await next()
        return
      }
      const role = extractRole(data.user as unknown as RawUser)
      if (!role) {
        // Authenticated but not an admin/moderator — i.e. a citizen
        // logged into the admin origin. Fall through as `public`.
        await next()
        return
      }
      const actor: Actor = Object.freeze({ id: data.user.id, role })
      c.set(ACTOR_KEY, actor)
      // Also stash the verified token so downstream routes that proxy
      // to other services (Storage, etc.) can forward it without
      // re-reading the header.
      c.set('factivist.token', token)
    } catch {
      // Any unexpected error (network, JSON parse) becomes a soft
      // fall-through. The route's `requireAdmin` will 401 if needed.
    }

    await next()
  }
}
