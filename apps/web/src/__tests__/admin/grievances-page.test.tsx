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
    const { getByTestId } = render(tree)
    expect(getByTestId('grievance-empty')).toBeInTheDocument()
    expect(getByTestId('grievance-count').textContent).toContain('0')
  })

  it('renders one row per grievance with an SLA badge', async () => {
    listMock.mockResolvedValueOnce({ items: [makeRow(), makeRow({ id: 'mq_g2' })] })
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getAllByTestId, getByTestId } = render(tree)
    expect(getByTestId('grievance-table')).toBeInTheDocument()
    expect(getAllByTestId('grievance-row')).toHaveLength(2)
    expect(getAllByTestId('sla-countdown-badge')).toHaveLength(2)
    expect(getByTestId('grievance-count').textContent).toContain('2')
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

  it('shows the not-yet-live warning when the API 404s', async () => {
    listMock.mockRejectedValueOnce(new ApiError('not found', 404))
    const { default: Page } = await import('../../app/admin/grievances/page.tsx')
    const tree = await Page()
    const { getByTestId } = render(tree)
    expect(getByTestId('grievance-warning').textContent).toMatch(/not yet live/i)
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
})
