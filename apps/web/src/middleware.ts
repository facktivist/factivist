/**
 * Edge middleware — admin SSR session refresh.
 *
 * ## Why this exists (nice-to-have #6, [[s1-phase-5-done]])
 *
 * Server Components cannot mutate cookies. Supabase access tokens
 * expire after 1h by default. Without a rotating layer, an operator
 * on an `/admin/**` page would hit a wall the moment their cookie's
 * access token expires: `supabase.auth.getUser()` in
 * `lib/auth/server.ts` would return `null`, the admin layout would
 * redirect to `/`, and the only fix would be a fresh login flow.
 *
 * Next.js middleware runs on every matched request and CAN mutate the
 * response cookies. The `@supabase/ssr` SDK auto-refreshes a near-expiry
 * access token whenever `getUser()` is called — we just need to feed
 * the rotated cookies back to the browser via the response. That's
 * what this file does.
 *
 * ## Scope
 *
 *   matcher: '/admin/:path*' — the only routes that actually need
 *   long-lived operator sessions. Public routes (`/discover`,
 *   `/compose`, `/c/[handle]`) stay anonymous so the middleware
 *   does not run, keeping edge latency at zero for citizens.
 *
 * ## Behaviour
 *
 *   1. Build a Supabase server client whose `getAll` reads from the
 *      incoming request and whose `setAll` mirrors writes onto both
 *      the request (so downstream Server Components see the rotated
 *      cookie) AND the outgoing NextResponse.
 *   2. Call `supabase.auth.getUser()` — this is the documented refresh
 *      trigger. We discard the user payload; the only side-effect we
 *      care about is the cookie rotation.
 *   3. Return the response, which now carries any rotated cookies.
 *
 * ## Edge cases
 *
 *   - When the public env vars are unset (preview / test deploys with
 *     no Supabase wired) the middleware is a pass-through. Same model
 *     as `lib/auth/server.ts:getServerSession` Branch A.
 *   - When `getUser()` throws (network blip), we still return the
 *     pristine `NextResponse.next()` — the next request will retry.
 *     We never block the request on a refresh failure: the admin
 *     layout's `null` redirect is the correct degraded UX.
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * `cookies.getAll` / `cookies.setAll` are the only @supabase/ssr-required
 * hooks. We typed them locally instead of importing from `@supabase/ssr`
 * to dodge a deep type-name dependency that changes between minor versions.
 */
interface CookieToSet {
  readonly name: string
  readonly value: string
  readonly options?: {
    readonly path?: string
    readonly maxAge?: number
    readonly domain?: string
    readonly httpOnly?: boolean
    readonly secure?: boolean
    readonly sameSite?: 'lax' | 'strict' | 'none' | boolean
    readonly expires?: Date
  }
}

/**
 * Exposed for unit-testing without spinning a real edge runtime. Given a
 * NextRequest, runs the @supabase/ssr cookie-rotation dance and returns
 * the response with refreshed cookies attached (or a pass-through when
 * Supabase is not configured).
 */
export const refreshAdminSession = async (request: NextRequest): Promise<NextResponse> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Default response — passes through when Supabase isn't wired or the
  // refresh path throws. Always returns this exact instance so callers
  // can attach headers/cookies and observe them in tests.
  let response = NextResponse.next({ request })

  if (!url || !anonKey) {
    return response
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (toSet: ReadonlyArray<CookieToSet>) => {
          // Mirror writes back onto BOTH the request (so any downstream
          // logic inside this same middleware sees the rotated value)
          // AND the response (so the browser stores it).
          for (const { name, value, options } of toSet) {
            request.cookies.set({ name, value, ...(options ?? {}) })
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of toSet) {
            response.cookies.set({ name, value, ...(options ?? {}) })
          }
        },
      },
    })

    // Touching `getUser()` is what triggers @supabase/ssr's internal
    // refresh path. We discard the result — the only intended side-effect
    // is the cookie rotation via `setAll` above.
    await supabase.auth.getUser()
  } catch {
    // Pass-through on any refresh failure. The admin layout's null-session
    // redirect is the correct degraded UX, not a 500.
  }

  return response
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  return refreshAdminSession(request)
}

export const config = {
  // Run only on routes that need a long-lived operator session.
  // Citizens never trip the middleware, keeping edge latency zero for
  // the 99% public-route surface.
  matcher: ['/admin/:path*'],
}
