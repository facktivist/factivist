/**
 * Supabase Auth callback Route Handler — Phase 5 Pipeline C, wave 3A.
 *
 * ## What lands here
 *
 * Supabase magic-link emails contain a link of the shape:
 *
 *   `https://factivist.app/auth/callback?code=<pkce_code>[&next=<path>]`
 *
 * The `code` is a short-lived PKCE code; `exchangeCodeForSession` swaps
 * it for an access + refresh token pair AND persists the SSR session
 * cookie via the `@supabase/ssr` cookie bridge. Without this route, the
 * cookie reader at `apps/web/src/lib/auth/server.ts::getServerSession()`
 * has nothing to read — the login flow stops one step short of complete.
 *
 * Wave 2 (`wave-2-auth.md` § Open items, A3) explicitly carved this
 * route out as the wave-3A deliverable; wave 2C ships it now.
 *
 * ## Open-redirect defence
 *
 * The `next` query param is operator-controllable. We MUST reject any
 * value that could redirect a freshly authenticated operator to an
 * attacker-controlled origin (classic post-auth open-redirect → phishing
 * pivot). The rule is intentionally simple: `next` must be a path that
 * starts with a single `/` and is NOT a protocol-relative URL (`//...`).
 * Everything else falls back to `/` — the safe default landing page.
 *
 * ## Secrets discipline
 *
 * We NEVER log:
 *   - The PKCE `code` value (one-time token, but still a credential).
 *   - The resulting `session.access_token` (long-lived bearer for the API).
 *   - The Supabase response body (may contain refresh tokens on error).
 *
 * Error messages logged on failure are intentionally generic. The user
 * gets redirected to `/login?error=…` with a small enumerated set of
 * reason codes so the login page can surface an actionable message
 * without leaking why the exchange failed.
 *
 * ## Threat-model alignment
 *
 *   - ADR-0009 / ADR-0023 — callback must be served from the canonical
 *     custom-domain origin (see `apps/web/src/lib/config.ts::getSiteUrl`).
 *   - ADR-0010 — no role enumeration: we do not inspect the resolved
 *     role here; the admin layout makes that decision after the cookie
 *     lands. Citizens log in successfully then bounce off `/admin/**`
 *     just like in production.
 *   - ADR-0014 / ADR-0016 — the service-role key NEVER appears in this
 *     handler; we use the public anon key against `@supabase/ssr`.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/** Enumerated reason codes the login page renders as banners. */
const ERROR_INVALID_CODE = 'invalid_code' as const
const ERROR_AUTH_FAILED = 'auth_failed' as const
const ERROR_MISCONFIGURED = 'misconfigured' as const

/** Safe default landing page when `next` is missing or rejected. */
const DEFAULT_NEXT = '/' as const

/**
 * Validates the operator-controlled `next` redirect target. Returns the
 * input only when it is a same-origin relative path; otherwise the
 * caller falls back to `DEFAULT_NEXT`.
 *
 * Acceptance rule:
 *   - Must be a non-empty string.
 *   - Must start with exactly one `/`.
 *   - Must NOT start with `//` (protocol-relative — would resolve to
 *     a different origin once the browser hits the 307).
 *   - Must NOT contain a scheme (`:` before the first `/`).
 *
 * The third check is implicit in the first two but spelled out for
 * future-readers. We deliberately do not try to parse with `new URL` —
 * `new URL('//evil.com', 'https://factivist.app')` happily resolves to
 * `https://evil.com`, exactly the bypass we are blocking.
 */
const isSafeRelativePath = (raw: string | null): raw is string => {
  if (typeof raw !== 'string' || raw.length === 0) return false
  if (raw[0] !== '/') return false
  if (raw.startsWith('//')) return false
  // Belt + braces: reject `/\evil.com` (some browsers normalise `\` to `/`).
  if (raw.startsWith('/\\')) return false
  return true
}

/** Build an absolute URL for redirect against the incoming request origin. */
const redirectTo = (request: Request, pathAndQuery: string): NextResponse => {
  const url = new URL(pathAndQuery, request.url)
  return NextResponse.redirect(url, { status: 307 })
}

/**
 * `GET /auth/callback?code=<pkce>[&next=<safe-path>]`
 *
 * Always responds with a 307 redirect:
 *   - Success → `next` (validated) or `/`.
 *   - Missing/invalid code → `/login?error=invalid_code`.
 *   - Supabase env missing → `/login?error=misconfigured`.
 *   - Supabase API failure → `/login?error=auth_failed`.
 *
 * Never returns a 4xx/5xx body to the user agent — the redirect always
 * lands on a real page the operator can act on.
 */
export const GET = async (request: Request): Promise<NextResponse> => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next')
  const safeNext = isSafeRelativePath(rawNext) ? rawNext : DEFAULT_NEXT

  if (typeof code !== 'string' || code.length === 0) {
    return redirectTo(request, `/login?error=${ERROR_INVALID_CODE}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    // Production must have both; in dev this nudges the operator to
    // copy `.env.example`. We log a generic message — no secret leak.
    console.error('[factivist/web/auth/callback] Supabase env not configured')
    return redirectTo(request, `/login?error=${ERROR_MISCONFIGURED}`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      /* v8 ignore next 2 — invoked internally by @supabase/ssr during exchangeCodeForSession; covered by e2e, not unit mocks */
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      /* v8 ignore start */
      setAll: (toSet) => {
        // Route Handlers CAN mutate cookies; the SSR helper writes the
        // session here. Each cookie option is forwarded verbatim so
        // Supabase keeps control of `httpOnly`, `sameSite`, `maxAge`, etc.
        for (const { name, value, options } of toSet) {
          cookieStore.set({ name, value, ...options })
        }
      },
      /* v8 ignore stop */
    },
  })

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Log message only — never the code, never the error stack which
      // some Supabase versions include the request body in.
      console.error('[factivist/web/auth/callback] exchange failed:', error.message)
      return redirectTo(request, `/login?error=${ERROR_AUTH_FAILED}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[factivist/web/auth/callback] exchange threw:', message)
    return redirectTo(request, `/login?error=${ERROR_AUTH_FAILED}`)
  }

  return redirectTo(request, safeNext)
}
