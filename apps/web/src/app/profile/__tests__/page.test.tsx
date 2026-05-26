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

// Citizen-path client island has its own focused tests. Stub it here
// so the route test only validates the server-side operator vs citizen
// branch and stays free of TanStack Query setup.
vi.mock('../MyProfileView.tsx', () => ({
  MyProfileView: () => <div data-testid="my-profile-view" />,
}))

beforeEach(() => {
  sessionRef.current = null
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ProfilePage', () => {
  it('renders the citizen-path island when no operator session', async () => {
    sessionRef.current = null
    const { default: ProfilePage } = await import('../page.tsx')
    const tree = await ProfilePage()
    const { getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('profile-shell')).toBeInTheDocument()
    // The island handles 401-fallback to the anonymous CTA. The route
    // test only checks the island mounted in place of the operator card.
    expect(getByTestId('my-profile-view')).toBeInTheDocument()
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
