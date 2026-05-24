'use server'

/**
 * Server actions for the magic-link login flow — wave 3A.
 *
 * One responsibility: take an operator-supplied email, ask Supabase to
 * send a magic-link email pointing at our `/auth/callback` route, and
 * return a typed result the form can render. The actual session cookie
 * is written by the callback route after the operator clicks the link.
 *
 * ## Why a Server Action (not a Route Handler) for the send
 *
 *   - Server Actions land typed in the React tree and avoid a manual
 *     fetch wrapper. The form just calls `await sendMagicLink(formData)`.
 *   - The anon key is reachable from a server-side context only — even
 *     though it is browser-safe, keeping the call server-side means
 *     CORS, retry, and logging stay in one place.
 *
 * ## What we DO NOT do
 *
 *   - No OAuth providers. S1 admin is operator-only and we explicitly
 *     scope this wave to magic-link (PRD: "10–20 admins / moderators").
 *   - No `signUp`. Operators are provisioned by ops via the Supabase
 *     dashboard (see `wave-2-auth.md` § Path B). `signInWithOtp` will
 *     create-or-sign-in by default — we leave that default ON because
 *     the role-claim gate at `/admin/**` denies anyone the ops team did
 *     not stamp.
 *   - No password fields. Magic-link is the only S1 path.
 *
 * ## Secrets / PII discipline
 *
 *   - The supplied email IS logged (no `console.error` on the email
 *     itself), but the typed result message NEVER echoes it back —
 *     phishing-flavoured payloads cannot bounce through the banner.
 *   - We do not log the Supabase response.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getAuthCallbackUrl } from '../../lib/config.ts'

export type SendMagicLinkResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: 'invalid_email' | 'misconfigured' | 'rate_limited' | 'network'
      readonly message: string
    }

/**
 * RFC-5322 is overkill for our admin operator population (~10–20 users
 * provisioned by ops). A pragmatic check: non-empty, exactly one `@`,
 * something on each side, no whitespace. Supabase will reject anything
 * fancier downstream.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isLikelyEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length < 320 && EMAIL_RE.test(value)

export const sendMagicLink = async (formData: FormData): Promise<SendMagicLinkResult> => {
  const raw = formData.get('email')
  const email = typeof raw === 'string' ? raw.trim() : ''

  if (!isLikelyEmail(email)) {
    return {
      ok: false,
      code: 'invalid_email',
      message: 'Enter a valid email address.',
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[factivist/web/auth/login] Supabase env not configured')
    return {
      ok: false,
      code: 'misconfigured',
      message: 'Auth is not configured on this environment.',
    }
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      /* v8 ignore next 2 — invoked internally by @supabase/ssr; signInWithOtp does not set cookies, but the SSR client requires both bridge halves to exist */
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      /* v8 ignore start */
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          cookieStore.set({ name, value, ...options })
        }
      },
      /* v8 ignore stop */
    },
  })

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        // Default `shouldCreateUser: true` — leaving it on is fine since
        // the `/admin/**` gate is the actual authorisation boundary, not
        // the auth provider's user table.
      },
    })
    if (error) {
      console.error('[factivist/web/auth/login] otp send failed:', error.message)
      // Supabase returns 429 for rate-limit; surface that distinctly so
      // the operator knows to wait, not retry-immediately.
      const message = error.message.toLowerCase()
      if (message.includes('rate') || message.includes('429')) {
        return {
          ok: false,
          code: 'rate_limited',
          message: 'Too many magic-link requests. Wait a minute and try again.',
        }
      }
      return {
        ok: false,
        code: 'network',
        message: 'Could not send the magic link. Try again in a moment.',
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[factivist/web/auth/login] otp threw:', message)
    return {
      ok: false,
      code: 'network',
      message: 'Could not send the magic link. Try again in a moment.',
    }
  }

  return { ok: true }
}
