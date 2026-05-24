'use client'

import { Button, Card, Input } from '@factivist/ui-web/components'
import { useState, useTransition } from 'react'

import type { SendMagicLinkResult } from './loginActions.ts'

/**
 * Magic-link login form — wave 3A.
 *
 * Client island so the operator gets immediate UI feedback while the
 * Server Action runs. The action itself is bound by the parent Server
 * Component so this island never imports `next/headers` or a Supabase
 * SDK directly.
 *
 * A11y posture:
 *   - Visible label tied to the input via `htmlFor` / `id`.
 *   - The submit button always carries an accessible name (the text
 *     content), with a `Sending…` state that mirrors `useTransition`.
 *   - Errors render in a `role="alert"` region tied to the input via
 *     `aria-describedby` so screen-readers announce them on submit.
 *   - Success surfaces a separate `role="status"` region — the operator
 *     knows the link is on its way without losing focus.
 */
export type SendAction = (formData: FormData) => Promise<SendMagicLinkResult>

export interface LoginFormProps {
  readonly action: SendAction
}

export function LoginForm({ action }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSent(null)

    const formData = new FormData()
    formData.set('email', email)

    startTransition(async () => {
      const result = await action(formData)
      if (result.ok) {
        // Intentionally do NOT echo the email back into the banner —
        // a tampered payload would land verbatim in the success message.
        setSent('Check your inbox for a sign-in link.')
        setEmail('')
        return
      }
      setError(result.message)
    })
  }

  return (
    <Card className="p-6" data-testid="login-form-card">
      <form onSubmit={handleSubmit} noValidate aria-labelledby="login-heading">
        <h1 id="login-heading" className="text-lg font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your operator email. We will send a one-time magic link.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="login-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : 'login-help'}
            data-testid="login-email-input"
          />
          <p id="login-help" className="text-xs text-muted-foreground">
            Operators only. Citizens do not need to sign in.
          </p>
        </div>

        {error ? (
          <p
            id="login-error"
            role="alert"
            className="mt-3 text-sm text-danger"
            data-testid="login-error"
          >
            {error}
          </p>
        ) : null}

        {sent ? (
          <p
            role="status"
            className="mt-3 rounded-md bg-success/10 p-3 text-sm text-success-foreground"
            data-testid="login-sent"
          >
            {sent}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="primary" isDisabled={pending} data-testid="login-submit">
            {pending ? 'Sending…' : 'Send magic link'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
