/**
 * `/profile` route — anonymous vs operator branches.
 *
 * Profile reads the operator session via `getServerSession()`. Two
 * branches:
 *
 *   - null session → "you are browsing anonymously" card.
 *   - signed-in operator → role + actor id + link to /admin/moderation.
 *
 * No PII (nullifier, email) is rendered in either branch.
 */

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { current: unknown } = { current: null }

vi.mock('../../../lib/auth/server.ts', () => ({
  getServerSession: vi.fn(async () => sessionRef.current),
}))

beforeEach(() => {
  sessionRef.current = null
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ProfilePage', () => {
  it('renders the anonymous notice when no session', async () => {
    sessionRef.current = null
    const { default: ProfilePage } = await import('../page.tsx')
    const tree = await ProfilePage()
    const { getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('profile-shell')).toBeInTheDocument()
    expect(getByTestId('profile-anonymous')).toBeInTheDocument()
    expect(queryByTestId('profile-operator')).toBeNull()
  })

  it('renders the operator panel when signed in', async () => {
    sessionRef.current = { userId: 'usr_op', role: 'moderator', token: null }
    const { default: ProfilePage } = await import('../page.tsx')
    const tree = await ProfilePage()
    const { getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('profile-operator')).toBeInTheDocument()
    expect(getByTestId('profile-role').textContent).toBe('moderator')
    expect(getByTestId('profile-actor').textContent).toBe('usr_op')
    expect(queryByTestId('profile-anonymous')).toBeNull()
  })

  it('shows the admin link for an admin session', async () => {
    sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
    const { default: ProfilePage } = await import('../page.tsx')
    const tree = await ProfilePage()
    const { getByText } = render(tree)
    expect(getByText(/open the moderation console/i)).toBeInTheDocument()
  })
})
