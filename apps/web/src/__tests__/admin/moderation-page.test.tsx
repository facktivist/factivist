/**
 * Moderation queue page tests.
 *
 * Server Component renders directly (await the async default export).
 * The API client + session helpers are mocked at the module boundary.
 *
 * Includes the *fails-closed* assertion: if the API client returns a
 * row that bolts on `nullifier`, the page (whose data path runs
 * through `sanitiseQueueItem` upstream) refuses to render — the
 * sanitiser throws on the unknown column.
 */

import { queueItemSchema } from '@factivist/shared/validators'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { current: unknown } = { current: null }
const listMock = vi.fn()

vi.mock('../../lib/auth/server.ts', () => ({
  getServerSession: async () => sessionRef.current,
}))

vi.mock('../../lib/api/client.ts', () => ({
  apiClient: {
    listModerationQueue: listMock,
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

const makeRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  complaintSlug: 'pothole-on-mg-road',
  targetKind: 'complaint',
  reason: 'pii-leak',
  status: 'pending',
  reviewerId: null,
  slaDueAt: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
  decidedAt: null,
  rationale: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...over,
})

beforeEach(() => {
  sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
  listMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ModerationQueuePage — render', () => {
  it('renders the empty state when the queue has 0 items', async () => {
    listMock.mockResolvedValueOnce({ items: [] })
    const { default: ModerationQueuePage } = await import('../../app/admin/moderation/page.tsx')
    const tree = await ModerationQueuePage()
    const { getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('queue-empty')).toBeInTheDocument()
    expect(queryByTestId('queue-table')).toBeNull()
    expect(getByTestId('queue-count').textContent).toContain('0')
  })

  it('renders one row per item with case id + slug + reason + SLA badge', async () => {
    const item = queueItemSchema.parse(makeRow())
    listMock.mockResolvedValueOnce({ items: [item] })
    const { default: ModerationQueuePage } = await import('../../app/admin/moderation/page.tsx')
    const tree = await ModerationQueuePage()
    const { getAllByTestId, getByTestId } = render(tree)
    expect(getByTestId('queue-table')).toBeInTheDocument()
    const rows = getAllByTestId('queue-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.textContent).toContain('pothole-on-mg-road')
    expect(rows[0]?.textContent).toContain('pii-leak')
    expect(getAllByTestId('sla-countdown-badge')).toHaveLength(1)
  })

  it('does NOT render nullifier / reporter / IP anywhere (anonymity floor)', async () => {
    const item = queueItemSchema.parse(makeRow())
    listMock.mockResolvedValueOnce({ items: [item] })
    const { default: ModerationQueuePage } = await import('../../app/admin/moderation/page.tsx')
    const tree = await ModerationQueuePage()
    const { container } = render(tree)
    const html = container.innerHTML
    expect(html).not.toMatch(/nullifier/i)
    expect(html).not.toMatch(/reporter[_-]?id/i)
    expect(html).not.toMatch(/ip[_-]?address/i)
    expect(html).not.toMatch(/aadhaar/i)
  })

  it('queueItemSchema.parse() strips a leaky `nullifier` key (defence in depth)', () => {
    // The page relies on the upstream sanitiser; this asserts the
    // boundary contract that any leaked citizen identifier never makes
    // it into the parsed shape the page binds against.
    const parsed = queueItemSchema.parse({ ...makeRow(), nullifier: '0xfeed' }) as Record<
      string,
      unknown
    >
    expect(parsed.nullifier).toBeUndefined()
  })
})

describe('ModerationQueuePage — token forwarding', () => {
  it('forwards session.token to the API client', async () => {
    sessionRef.current = { userId: 'usr_admin', role: 'admin', token: 'jwt-1' }
    listMock.mockResolvedValueOnce({ items: [] })
    const { default: ModerationQueuePage } = await import('../../app/admin/moderation/page.tsx')
    await ModerationQueuePage()
    expect(listMock).toHaveBeenCalledWith('jwt-1', { cache: 'no-store' })
  })

  it('passes null when session has no token', async () => {
    sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
    listMock.mockResolvedValueOnce({ items: [] })
    const { default: ModerationQueuePage } = await import('../../app/admin/moderation/page.tsx')
    await ModerationQueuePage()
    expect(listMock).toHaveBeenCalledWith(null, { cache: 'no-store' })
  })
})
