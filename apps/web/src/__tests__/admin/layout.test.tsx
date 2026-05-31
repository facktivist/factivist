/**
 * Admin shell layout — RBAC gate test.
 *
 * - null session → calls `redirect('/')` (next/navigation throws a
 *   sentinel error which we capture).
 * - admin/moderator session → renders the shell + children.
 */

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { current: unknown } = { current: null }

vi.mock('../../lib/auth/server.ts', () => ({
  getServerSession: vi.fn(async () => sessionRef.current),
}))

const redirectMock = vi.fn((_path: string) => {
  throw new Error(`__REDIRECT__:${_path}`)
})

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: vi.fn(),
}))

beforeEach(() => {
  redirectMock.mockClear()
  sessionRef.current = null
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AdminLayout RBAC gate', () => {
  it('redirects to "/" when getServerSession resolves null', async () => {
    sessionRef.current = null
    const { default: AdminLayout } = await import('../../app/admin/layout.tsx')
    await expect(AdminLayout({ children: <span>hi</span> })).rejects.toThrow(/__REDIRECT__:\//)
    expect(redirectMock).toHaveBeenCalledWith('/')
  })

  it('renders the shell + children for an admin session', async () => {
    sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
    const { default: AdminLayout } = await import('../../app/admin/layout.tsx')
    const tree = await AdminLayout({ children: <span data-testid="child">hi</span> })
    const { getByTestId } = render(tree)
    expect(getByTestId('admin-shell')).toBeInTheDocument()
    expect(getByTestId('admin-role-badge').textContent?.toLowerCase()).toContain('admin')
    expect(getByTestId('admin-actor-id').textContent).toBe('usr_admin')
    expect(getByTestId('child')).toBeInTheDocument()
  })

  it('renders the shell for a moderator session', async () => {
    sessionRef.current = { userId: 'usr_mod', role: 'moderator', token: null }
    const { default: AdminLayout } = await import('../../app/admin/layout.tsx')
    const tree = await AdminLayout({ children: <span data-testid="child">hi</span> })
    const { getByTestId } = render(tree)
    expect(getByTestId('admin-role-badge').textContent?.toLowerCase()).toContain('moderator')
  })

  it('renders all three navigation links', async () => {
    sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
    const { default: AdminLayout } = await import('../../app/admin/layout.tsx')
    const tree = await AdminLayout({ children: null })
    const { container } = render(tree)
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/admin/moderation')
    expect(hrefs).toContain('/admin/audit')
    expect(hrefs).toContain('/admin/grievances')
  })
})
