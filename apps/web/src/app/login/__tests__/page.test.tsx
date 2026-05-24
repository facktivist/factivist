/**
 * `/login` page + form tests — wave 3A.
 *
 * Two surfaces exercised here:
 *
 *   1. The Server Component (`page.tsx`) — assert that each known error
 *      query param renders the matching banner, unknown codes render
 *      nothing, and the form mounts in every case.
 *   2. The client island (`LoginForm.tsx`) — assert that submission calls
 *      the bound action with the entered email and surfaces both success
 *      and failure paths.
 *
 * The Server Action is mocked at the module boundary so we don't pull
 * `@supabase/ssr` into jsdom; the form gets a plain `vi.fn` action.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginForm } from '../../../features/auth/LoginForm.tsx'

const sendMagicLinkMock =
  vi.fn<
    (formData: FormData) => Promise<
      | { ok: true }
      | {
          ok: false
          code: 'invalid_email' | 'misconfigured' | 'rate_limited' | 'network'
          message: string
        }
    >
  >()

vi.mock('../../../features/auth/loginActions.ts', () => ({
  sendMagicLink: (fd: FormData) => sendMagicLinkMock(fd),
}))

beforeEach(() => {
  sendMagicLinkMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage — error banners from /auth/callback', () => {
  it('renders nothing when no error query param is present', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({ searchParams: Promise.resolve({}) })
    const { queryByTestId, getByTestId } = render(tree)
    expect(queryByTestId('login-banner-error')).toBeNull()
    expect(getByTestId('login-form-card')).toBeInTheDocument()
  })

  it('renders the invalid_code banner', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({
      searchParams: Promise.resolve({ error: 'invalid_code' }),
    })
    const { getByTestId } = render(tree)
    const banner = getByTestId('login-banner-error')
    expect(banner.getAttribute('data-error-code')).toBe('invalid_code')
    expect(banner.textContent).toContain('incomplete')
  })

  it('renders the auth_failed banner', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({
      searchParams: Promise.resolve({ error: 'auth_failed' }),
    })
    const { getByTestId } = render(tree)
    expect(getByTestId('login-banner-error').textContent).toContain('could not finish')
  })

  it('renders the expired banner', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({
      searchParams: Promise.resolve({ error: 'expired' }),
    })
    const { getByTestId } = render(tree)
    expect(getByTestId('login-banner-error').textContent).toContain('expired')
  })

  it('renders the misconfigured banner', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({
      searchParams: Promise.resolve({ error: 'misconfigured' }),
    })
    const { getByTestId } = render(tree)
    expect(getByTestId('login-banner-error').textContent).toContain('unavailable')
  })

  it('ignores unknown error codes (no banner injection)', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({
      searchParams: Promise.resolve({ error: 'pwn3d' }),
    })
    const { queryByTestId } = render(tree)
    expect(queryByTestId('login-banner-error')).toBeNull()
  })

  it('handles array-valued error param (Next.js can deliver string[])', async () => {
    const { default: LoginPage } = await import('../page.tsx')
    const tree = await LoginPage({
      searchParams: Promise.resolve({ error: ['auth_failed', 'noise'] }),
    })
    const { getByTestId } = render(tree)
    expect(getByTestId('login-banner-error').getAttribute('data-error-code')).toBe('auth_failed')
  })

  it('robots: noindex,nofollow is declared on the page metadata', async () => {
    const { metadata } = await import('../page.tsx')
    expect(metadata).toMatchObject({
      robots: { index: false, follow: false },
    })
  })
})

describe('LoginForm — submission', () => {
  it('has a labelled email input and a named submit button (a11y)', () => {
    render(<LoginForm action={sendMagicLinkMock} />)
    const input = screen.getByLabelText(/email/i)
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('type')).toBe('email')
    const button = screen.getByRole('button', { name: /send magic link/i })
    expect(button).toBeInTheDocument()
  })

  it('calls the bound action with the entered email on submit', async () => {
    sendMagicLinkMock.mockResolvedValueOnce({ ok: true })
    const user = userEvent.setup()
    render(<LoginForm action={sendMagicLinkMock} />)
    await user.type(screen.getByLabelText(/email/i), 'operator@factivist.app')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => expect(sendMagicLinkMock).toHaveBeenCalledTimes(1))
    const formData = sendMagicLinkMock.mock.calls[0]?.[0]
    expect(formData?.get('email')).toBe('operator@factivist.app')
  })

  it('renders the success status on ok:true', async () => {
    sendMagicLinkMock.mockResolvedValueOnce({ ok: true })
    const user = userEvent.setup()
    render(<LoginForm action={sendMagicLinkMock} />)
    await user.type(screen.getByLabelText(/email/i), 'operator@factivist.app')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() =>
      expect(screen.getByTestId('login-sent').textContent).toContain('Check your inbox'),
    )
    // Form is cleared so a follow-on send is unambiguous.
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('')
  })

  it('renders the error text on ok:false (does NOT echo the email)', async () => {
    sendMagicLinkMock.mockResolvedValueOnce({
      ok: false,
      code: 'rate_limited',
      message: 'Too many magic-link requests. Wait a minute and try again.',
    })
    const user = userEvent.setup()
    render(<LoginForm action={sendMagicLinkMock} />)
    await user.type(screen.getByLabelText(/email/i), 'evil"<script>@x.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => expect(screen.getByTestId('login-error').textContent).toContain('Too many'))
    // The error banner must not contain the operator-supplied email.
    expect(screen.getByTestId('login-error').textContent).not.toContain('evil')
  })

  it('clears prior error when re-submitting', async () => {
    sendMagicLinkMock
      .mockResolvedValueOnce({
        ok: false,
        code: 'network',
        message: 'Could not send the magic link. Try again in a moment.',
      })
      .mockResolvedValueOnce({ ok: true })
    const user = userEvent.setup()
    render(<LoginForm action={sendMagicLinkMock} />)
    await user.type(screen.getByLabelText(/email/i), 'op@factivist.app')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => expect(screen.getByTestId('login-error')).toBeInTheDocument())
    await user.type(screen.getByLabelText(/email/i), 'op@factivist.app')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => expect(screen.queryByTestId('login-error')).toBeNull())
    expect(screen.getByTestId('login-sent')).toBeInTheDocument()
  })
})
