/**
 * Audit log page tests.
 *
 * - date-range query params reach the API client unchanged;
 * - actor is rendered as a role badge, NOT a personal name;
 * - 401 + 404 from the API degrade to a warning state.
 */

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { current: unknown } = { current: null }
const listMock = vi.fn()

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

vi.mock('../../lib/auth/server.ts', () => ({
  getServerSession: async () => sessionRef.current,
}))

vi.mock('../../lib/api/client.ts', () => ({
  apiClient: { listAuditLog: listMock },
  ApiError,
}))

const makeEntry = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'al_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  actor: 'usr_admin',
  action: 'moderation.decide',
  targetKind: 'moderation_case',
  targetId: 'mq_1',
  payloadHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  rationale: null,
  ts: new Date('2026-05-23T12:00:00.000Z').toISOString(),
  ...over,
})

beforeEach(() => {
  sessionRef.current = { userId: 'usr_admin', role: 'admin', token: 'jwt-1' }
  listMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AuditPage', () => {
  it('renders the empty state when the API returns no items', async () => {
    listMock.mockResolvedValueOnce({ items: [], page: 1, pageSize: 50, hasNext: false })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId } = render(tree)
    expect(getByTestId('audit-empty')).toBeInTheDocument()
  })

  it('forwards `from`, `to`, and `page` from URL params to the API', async () => {
    listMock.mockResolvedValueOnce({ items: [], page: 3, pageSize: 50, hasNext: false })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    await Page({
      searchParams: Promise.resolve({ from: '2026-05-01', to: '2026-05-23', page: '3' }),
    })
    expect(listMock).toHaveBeenCalledWith(
      'jwt-1',
      { from: '2026-05-01', to: '2026-05-23', page: 3, pageSize: 50 },
      { cache: 'no-store' },
    )
  })

  it('defaults page to 1 when no page param', async () => {
    listMock.mockResolvedValueOnce({ items: [], page: 1, pageSize: 50, hasNext: false })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    await Page({ searchParams: Promise.resolve({}) })
    expect(listMock).toHaveBeenCalledWith('jwt-1', expect.objectContaining({ page: 1 }), {
      cache: 'no-store',
    })
  })

  it('clamps invalid page values to 1', async () => {
    listMock.mockResolvedValueOnce({ items: [], page: 1, pageSize: 50, hasNext: false })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    await Page({ searchParams: Promise.resolve({ page: 'banana' }) })
    expect(listMock).toHaveBeenCalledWith(
      'jwt-1',
      expect.objectContaining({ page: 1 }),
      expect.anything(),
    )
  })

  it('renders a row with the inferred actor role badge (NOT a personal name)', async () => {
    listMock.mockResolvedValueOnce({
      items: [makeEntry({ actor: 'usr_admin' })],
      page: 1,
      pageSize: 50,
      hasNext: false,
    })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId, container } = render(tree)
    const badge = getByTestId('audit-actor-role')
    expect(badge.textContent?.toLowerCase()).toBe('admin')
    // The personal actor id MUST NOT be rendered in the table.
    expect(container.querySelector('[data-testid="audit-table"]')?.textContent).not.toContain(
      'usr_admin',
    )
  })

  it('infers role "system" from actor IDs prefixed with "system."', async () => {
    listMock.mockResolvedValueOnce({
      items: [makeEntry({ actor: 'system.grievance.intake' })],
      page: 1,
      pageSize: 50,
      hasNext: false,
    })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId } = render(tree)
    expect(getByTestId('audit-actor-role').textContent?.toLowerCase()).toBe('system')
  })

  it('infers role "operator" for non-system non-usr actor IDs', async () => {
    listMock.mockResolvedValueOnce({
      items: [makeEntry({ actor: 'mod-tool-x' })],
      page: 1,
      pageSize: 50,
      hasNext: false,
    })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId } = render(tree)
    expect(getByTestId('audit-actor-role').textContent?.toLowerCase()).toBe('operator')
  })

  it('renders the not-yet-live warning when the API 404s', async () => {
    listMock.mockRejectedValueOnce(new ApiError('not found', 404))
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId } = render(tree)
    expect(getByTestId('audit-warning').textContent).toMatch(/not yet live/i)
  })

  it('renders the unauthorised warning when the API 401s', async () => {
    listMock.mockRejectedValueOnce(new ApiError('unauthorized', 401))
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId } = render(tree)
    expect(getByTestId('audit-warning').textContent).toMatch(/not authorised/i)
  })

  it('renders a generic warning on unknown errors', async () => {
    listMock.mockRejectedValueOnce(new Error('boom'))
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({}) })
    const { getByTestId } = render(tree)
    expect(getByTestId('audit-warning').textContent).toContain('boom')
  })

  it('renders pagination prev/next when applicable', async () => {
    listMock.mockResolvedValueOnce({
      items: [makeEntry(), makeEntry({ id: 'al_2' })],
      page: 2,
      pageSize: 50,
      hasNext: true,
    })
    const { default: Page } = await import('../../app/admin/audit/page.tsx')
    const tree = await Page({ searchParams: Promise.resolve({ page: '2' }) })
    const { container } = render(tree)
    const prev = container.querySelector('a[rel="prev"]')
    const next = container.querySelector('a[rel="next"]')
    expect(prev).not.toBeNull()
    expect(next).not.toBeNull()
  })
})
