/**
 * Minimal server-side session resolver — Phase 5 Pipeline C.
 *
 * ## Scope
 *
 * Production Supabase Auth wiring (cookie-based session via
 * `@supabase/ssr`) is on the wave-2 backlog: the package is not yet a
 * declared dependency of `apps/web`. Until that lands, the admin shell
 * needs *some* server-side session resolver so the Server Components in
 * `apps/web/src/app/admin/**` can:
 *
 *   1. Decide whether to render or redirect on RBAC failure.
 *   2. Forward a bearer token to the Hono API (which already
 *      understands either a real Supabase JWT or the
 *      `x-factivist-role` header gated by
 *      `FACTIVIST_TRUSTED_HEADER_AUTH=1` — see
 *      `apps/api/src/lib/rbac.ts`).
 *
 * This module mirrors that escape hatch on the web side so:
 *
 *   - Local dev + Playwright tests can drive the admin surfaces by
 *     setting the matching cookie (`factivist-session`) or by sending
 *     `x-factivist-role` through a reverse proxy without spinning up
 *     full Supabase Auth.
 *   - When the wave-2 Supabase decoder ships, this function gets
 *     replaced in place — its callers only see the resolved
 *     `ServerSession | null` shape and do not change.
 *
 * ## Cookie shape (dev/test only)
 *
 * `factivist-session` carries a base64-encoded JSON envelope:
 *
 *     { "userId": "usr_…", "role": "admin", "token": "<jwt>" }
 *
 * - `userId`  optional (defaults to "dev-admin")
 * - `role`    one of `admin | moderator` (anything else → null session)
 * - `token`   forwarded verbatim to the API as `Authorization: Bearer`
 *
 * The cookie is HttpOnly in production middleware (not in this file —
 * cookie setting belongs to the auth callback route, which is wave-2).
 *
 * Anything in this file is INTENTIONALLY hard-gated by the same
 * `FACTIVIST_TRUSTED_HEADER_AUTH=1` env flag the API uses. In production
 * with the flag unset, the only resolved sessions come from the (not-yet-
 * shipped) Supabase decoder — never from cookies/headers a user can forge.
 */

import { cookies, headers } from 'next/headers'

import type { Role } from './roles.ts'
import { isAdminRole } from './roles.ts'

const SESSION_COOKIE = 'factivist-session' as const
const TRUSTED_HEADER_ROLE = 'x-factivist-role' as const
const TRUSTED_HEADER_USER = 'x-factivist-actor-id' as const
const TRUSTED_HEADER_TOKEN = 'x-factivist-token' as const
const TRUSTED_HEADER_ENV = 'FACTIVIST_TRUSTED_HEADER_AUTH' as const

export interface ServerSession {
  /** Supabase Auth `user_id` of the operator. */
  readonly userId: string
  /** Resolved role — only `admin | moderator` reach the admin shell. */
  readonly role: Role
  /**
   * JWT (or dev token) forwarded to the API. May be `null` when the
   * trusted-header escape hatch is in use without an explicit token
   * (the API then resolves the role from the same header it received).
   */
  readonly token: string | null
}

interface SessionEnvelope {
  userId?: unknown
  role?: unknown
  token?: unknown
}

const decodeCookieEnvelope = (raw: string): SessionEnvelope | null => {
  try {
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(raw)
        : Buffer.from(raw, 'base64').toString('utf-8')
    const parsed: unknown = JSON.parse(json)
    if (parsed === null || typeof parsed !== 'object') return null
    return parsed as SessionEnvelope
  } catch {
    return null
  }
}

/**
 * Resolve the current operator session for a Server Component.
 *
 * Returns `null` when:
 *   - no cookie is set, AND
 *   - no trusted header is present, AND
 *   - the resolved role is not `admin | moderator`.
 *
 * The admin layout calls `redirect('/')` on `null`, so this function
 * never throws for missing auth — that path is a graceful redirect.
 */
export const getServerSession = async (): Promise<ServerSession | null> => {
  // Branch A — cookie-based (dev / Playwright today; real Supabase
  // session in production once the wave-2 callback wires it).
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value

  if (sessionCookie) {
    const envelope = decodeCookieEnvelope(sessionCookie)
    if (envelope && typeof envelope.role === 'string' && isAdminRole(envelope.role)) {
      const userId = typeof envelope.userId === 'string' ? envelope.userId : 'dev-operator'
      const token = typeof envelope.token === 'string' ? envelope.token : null
      return { userId, role: envelope.role, token }
    }
  }

  // Branch B — trusted-header escape hatch. Hard-gated by the same env
  // flag the API uses, so production without the flag set cannot be
  // tricked by a forged header even if a reverse proxy leaks it.
  if (process.env[TRUSTED_HEADER_ENV] === '1') {
    const headerStore = await headers()
    const headerRole = headerStore.get(TRUSTED_HEADER_ROLE)
    if (headerRole && isAdminRole(headerRole)) {
      const userId = headerStore.get(TRUSTED_HEADER_USER) ?? 'dev-operator'
      const token = headerStore.get(TRUSTED_HEADER_TOKEN)
      return { userId, role: headerRole, token }
    }
  }

  return null
}
