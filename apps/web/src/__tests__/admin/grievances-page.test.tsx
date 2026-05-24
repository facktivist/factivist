/**
 * Grievance inbox page tests.
 *
 * Confirms the SLA badge mounts per row and complainant name/email
 * NEVER reach the rendered DOM (those live in audit_log rationale).
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
  apiClient: { listGrievances: listMock },
  ApiError,
}))

const makeRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'mq_grievance-1',
  complaintSlug: 'pothole-on-mg-road',
  reason: 'ncii',
  status: 'pending',
  slaDueAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date('2026-05-23T12:00:00.000Z').toISOString(),
  ...over,
})

beforeEach(() => {
  sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
  listMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GrievancesPage', () => {
  it('renders the empty state when there are no open grievances', async () => {
    listMock.mockResolvedValueOnce({ items: [] })
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('grievance-empty')).toBeInTheDocument()
    expect(getByTestId('grievance-count').textContent).toContain('0')
    // Wave 3: the "endpoint not yet live" degradation banner is GONE.
    expect(queryByTestId('grievance-warning')).toBeNull()
  })

  it('renders one row per grievance with an SLA badge', async () => {
    listMock.mockResolvedValueOnce({ items: [makeRow(), makeRow({ id: 'mq_g2' })] })
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getAllByTestId, getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('grievance-table')).toBeInTheDocument()
    expect(getAllByTestId('grievance-row')).toHaveLength(2)
    expect(getAllByTestId('sla-countdown-badge')).toHaveLength(2)
    expect(getByTestId('grievance-count').textContent).toContain('2')
    // No degradation banner when real data flows.
    expect(queryByTestId('grievance-warning')).toBeNull()
  })

  it('does NOT surface complainant name / email anywhere on the page', async () => {
    // The Grievance Inbox API surface intentionally omits complainant
    // fields; this test guards against a future regression that bolts
    // them on by checking the rendered DOM never contains them.
    listMock.mockResolvedValueOnce({
      items: [
        {
          ...makeRow(),
          // Even if the API leaked these, the inbox shouldn't render them.
          complainantName: 'A. Journalist',
          complainantEmail: 'journo@example.com',
        },
      ],
    })
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { container } = render(tree)
    expect(container.innerHTML).not.toContain('A. Journalist')
    expect(container.innerHTML).not.toContain('journo@example.com')
  })

  it('treats a 404 as a generic error (the wave-2 not-yet-live banner is gone)', async () => {
    // Wave 3 shipped `GET /admin/grievances` so a 404 now indicates a
    // routing regression, not a missing endpoint. The page surfaces it
    // through the generic error path; the "not yet live" banner is gone.
    listMock.mockRejectedValueOnce(new ApiError('API 404 on /admin/grievances', 404))
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getByTestId } = render(tree)
    const warning = getByTestId('grievance-warning').textContent ?? ''
    expect(warning).not.toMatch(/not yet live/i)
    expect(warning).toMatch(/404/)
  })

  it('shows the unauthorised warning when the API 401s', async () => {
    listMock.mockRejectedValueOnce(new ApiError('unauthorized', 401))
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getByTestId } = render(tree)
    expect(getByTestId('grievance-warning').textContent).toMatch(/not authorised/i)
  })

  it('shows a generic warning on an unknown error', async () => {
    listMock.mockRejectedValueOnce(new Error('boom'))
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getByTestId } = render(tree)
    expect(getByTestId('grievance-warning').textContent).toContain('boom')
  })

  describe('token forwarding', () => {
    it('forwards session.token as the first argument to listGrievances', async () => {
      sessionRef.current = { userId: 'usr_admin', role: 'admin', token: 'jwt-grv' }
      listMock.mockResolvedValueOnce({ items: [] })
      const { default: Page } = await import('../../app/admin/grievances/page.tsx')
      await Page()
      expect(listMock).toHaveBeenCalledWith('jwt-grv', { cache: 'no-store' })
    })

    it('passes null when session.token is null and still renders the empty state', async () => {
      sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
      listMock.mockResolvedValueOnce({ items: [] })
      const { default: Page } = await import('../../app/admin/grievances/page.tsx')
      const tree = await Page()
      const { getByTestId } = render(tree)
      expect(listMock).toHaveBeenCalledWith(null, { cache: 'no-store' })
      expect(getByTestId('grievance-empty')).toBeInTheDocument()
    })
  })
})
