/**
 * App-level configuration helper — Phase 5 Pipeline C, wave 3A.
 *
 * Centralises the resolution of the canonical site origin used to build
 * absolute URLs that must round-trip through Supabase Auth (notably the
 * `emailRedirectTo` option on `signInWithOtp`).
 *
 * ## Why a helper at all
 *
 *   - `NEXT_PUBLIC_SITE_URL` must match a redirect URL configured in the
 *     Supabase Dashboard (Authentication → URL Configuration → Redirect
 *     URLs). Hard-coding the origin in three call-sites means three places
 *     to misconfigure. This module is the single source of truth.
 *   - ADR-0009 / ADR-0023 mandate the custom-domain origin for the canonical
 *     web surface (India ISP mitigation). The dev fallback intentionally
 *     drops to `http://localhost:3000` so `bun run dev` works without env
 *     plumbing; staging and prod MUST set the env var.
 *   - The returned origin is trimmed of any trailing `/` so callers can
 *     concatenate `/auth/callback` etc. without producing `//auth/...`.
 *
 * ## Defensive posture
 *
 *   - We never reach into `window.location` here — Server Components and
 *     Route Handlers run server-side and the dev fallback is fine for both.
 *   - Returning a non-empty string keeps the magic-link form usable in
 *     local dev even when the operator forgot to copy `.env.example`.
 */

const DEV_FALLBACK_ORIGIN = 'http://localhost:3000' as const

/** Strip a trailing slash so callers can append paths starting with `/`. */
const stripTrailingSlash = (url: string): string => (url.endsWith('/') ? url.slice(0, -1) : url)

/**
 * Returns the canonical site origin (no trailing slash). Falls back to
 * `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset — useful for
 * `bun run dev`, never appropriate for staging/prod where Supabase must
 * match the registered redirect URL.
 */
export const getSiteUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL
  if (typeof raw === 'string' && raw.length > 0) {
    return stripTrailingSlash(raw)
  }
  return DEV_FALLBACK_ORIGIN
}

/**
 * Returns the absolute Supabase auth callback URL — handed to
 * `signInWithOtp({ options: { emailRedirectTo } })`. Supabase appends a
 * `?code=<pkce>` query param on redirect; the route handler at
 * `apps/web/src/app/auth/callback/route.ts` consumes it.
 */
export const getAuthCallbackUrl = (): string => `${getSiteUrl()}/auth/callback`
