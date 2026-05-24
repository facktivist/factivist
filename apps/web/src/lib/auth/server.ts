/**
 * Server-side session resolver — Phase 5 Pipeline C, wave 2.
 *
 * ## Scope
 *
 * Resolves the operator session for every Server Component under
 * `apps/web/src/app/admin/**`. Two paths:
 *
 *   1. **Production / staging** — `@supabase/ssr`'s `createServerClient`
 *      reads the user's Supabase auth cookie via `next/headers`'
 *      `cookies()`, verifies it, and exposes
 *      `app_metadata.role` / `user_metadata.role` as the role claim.
 *      The admin layout redirects on `null`, so unauthenticated and
 *      wrong-role traffic surfaces identically (no enumeration —
 *      mirrors `apps/api/src/lib/rbac.ts`).
 *
 *   2. **Test runs only** — the `x-factivist-role` /
 *      `x-factivist-actor-id` / `x-factivist-token` request headers are
 *      honoured IFF both `FACTIVIST_TRUSTED_HEADER_AUTH === '1'` AND
 *      `NODE_ENV === 'test'`. Any other combination logs a one-shot
 *      warning and ignores the headers, so a misconfigured deploy
 *      stays locked down instead of silently trusting forged headers.
 *
 * ## Role claim shape
 *
 *   - Preferred: `app_metadata.role` (server-set, immutable from
 *     client). Set via the dashboard SQL documented in `.env.example`.
 *   - Fallback: `user_metadata.role` (mutable from client; useful only
 *     in dev where the operator self-stamps a role).
 *   - Citizens have NO `role` claim — they get `null` and the admin
 *     layout redirects them out.
 *
 * ## Threat-model alignment (ADR-0010 / ADR-0014 / ADR-0016)
 *
 *   - The Supabase auth cookie is set via the official Supabase auth
 *     callback route (which `@supabase/ssr` wires automatically) — this
 *     module never sees the user's password.
 *   - The token returned in the `ServerSession` is forwarded to the
 *     Hono API as `Authorization: Bearer <jwt>` by the admin shell
 *     fetch wrapper (wave-2C, tracked in `wave-2-auth.md` open items).
 *   - The web app's anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is
 *     ship-safe; the service role key NEVER appears in this app.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

import type { Role } from './roles.ts'
import { isAdminRole } from './roles.ts'

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
   * Supabase access token (JWT) for forwarding to the Hono API as
   * `Authorization: Bearer <token>`. `null` only in the test escape-hatch
   * branch when no token header is supplied.
   */
  readonly token: string | null
}

interface SupabaseUserShape {
  readonly id?: unknown
  readonly app_metadata?: Record<string, unknown>
  readonly user_metadata?: Record<string, unknown>
}

const readRoleFromUser = (user: SupabaseUserShape | null | undefined): Role | null => {
  if (!user) return null
  const fromApp = user.app_metadata?.role
  if (typeof fromApp === 'string' && isAdminRole(fromApp)) return fromApp
  const fromUser = user.user_metadata?.role
  if (typeof fromUser === 'string' && isAdminRole(fromUser)) return fromUser
  return null
}

/**
 * One-shot warning when `FACTIVIST_TRUSTED_HEADER_AUTH=1` is set in a
 * non-test environment. Module-local so we fire exactly once per
 * process — `next dev` and prod builds both stay quiet after the first
 * warning lands.
 */
let warnedAboutMisconfiguredFlag = false

const isTrustedHeaderHatchEnabled = (): boolean => {
  if (process.env[TRUSTED_HEADER_ENV] !== '1') return false
  if (process.env.NODE_ENV === 'test') return true
  if (!warnedAboutMisconfiguredFlag) {
    warnedAboutMisconfiguredFlag = true
    console.warn(
      '[factivist/web/auth] FACTIVIST_TRUSTED_HEADER_AUTH=1 is set but NODE_ENV is not "test"; ignoring the trusted-header escape hatch.',
    )
  }
  return false
}

/** Test seam — reset between vitest cases. */
export const __resetWarnedForTests = (): void => {
  warnedAboutMisconfiguredFlag = false
}

/**
 * Resolve the current operator session for a Server Component.
 *
 * Resolution order (highest priority first):
 *   1. A real Supabase session (production / staging).
 *   2. The test escape-hatch headers (NODE_ENV=test + env flag).
 *   3. `null` — admin layout redirects to `/`.
 */
export const getServerSession = async (): Promise<ServerSession | null> => {
  // Branch A — real Supabase session. We never call `createServerClient`
  // when the public env is unset, so test runs that never provision
  // Supabase stay zero-network here.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anonKey) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          /* v8 ignore next 2 — invoked internally by @supabase/ssr; covered by integration paths, not unit mocks */
          getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
          // Server Components cannot mutate cookies — the auth callback
          // route is responsible for that. We provide a no-op so
          // @supabase/ssr does not throw when it tries to refresh.
          /* v8 ignore next 3 */
          setAll: () => {
            /* intentional no-op in Server Components */
          },
        },
      })
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user) {
        const role = readRoleFromUser(data.user as unknown as SupabaseUserShape)
        if (role) {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData?.session?.access_token ?? null
          return { userId: data.user.id, role, token }
        }
        // Authenticated but no admin role claim → fall through to the
        // null branch; the admin layout redirects this citizen out.
      }
    } catch {
      // Any unexpected failure (network blip, cookie parse) falls
      // through to the trusted-header branch / null.
    }
  }

  // Branch B — test-mode escape hatch. Hard-gated by env flag AND
  // NODE_ENV=test (see isTrustedHeaderHatchEnabled).
  if (isTrustedHeaderHatchEnabled()) {
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
