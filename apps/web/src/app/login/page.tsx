/**
 * Login page — wave 3A.
 *
 * Server Component. Renders the magic-link form and surfaces any error
 * codes carried over from the `/auth/callback` route as banners. The
 * Server Action is bound here so the client island has no access to
 * `next/headers` or the Supabase SDK.
 *
 * Error code contract (mirrors `route.ts`):
 *   - `invalid_code`   — Supabase appended no code, or it was empty.
 *   - `auth_failed`    — `exchangeCodeForSession` returned an error.
 *   - `misconfigured`  — `NEXT_PUBLIC_SUPABASE_*` env unset.
 *   - `expired`        — reserved for the magic-link expiry copy.
 *
 * Anything else is rendered as a generic banner; unknown codes never
 * inject raw markup (we render `code` through a switch table, not via
 * concatenation).
 */

import { LoginForm } from '../../features/auth/LoginForm.tsx'
import { sendMagicLink } from '../../features/auth/loginActions.ts'

export const metadata = {
  title: 'Sign in — Factivist',
  // Keep operators out of search engines' login surface.
  robots: { index: false, follow: false },
}

const ERROR_BANNERS = {
  invalid_code: 'Your sign-in link was incomplete. Please request a new one.',
  auth_failed: 'We could not finish signing you in. Please request a new link.',
  misconfigured: 'Sign-in is unavailable on this environment.',
  expired: 'Your sign-in link expired. Please request a new one.',
} as const

type ErrorCode = keyof typeof ERROR_BANNERS

const isKnownErrorCode = (value: string | undefined): value is ErrorCode =>
  typeof value === 'string' && value in ERROR_BANNERS

export default async function LoginPage({
  searchParams,
}: {
  // Next.js 16 ships `searchParams` as a Promise — match Phase 5 callers.
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawError = params.error
  const errorParam = Array.isArray(rawError) ? rawError[0] : rawError
  const errorMessage = isKnownErrorCode(errorParam) ? ERROR_BANNERS[errorParam] : null

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6"
      data-testid="login-page"
    >
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md bg-danger/10 p-3 text-sm text-danger-foreground"
          data-testid="login-banner-error"
          data-error-code={errorParam}
        >
          {errorMessage}
        </div>
      ) : null}
      <LoginForm action={sendMagicLink} />
    </main>
  )
}
