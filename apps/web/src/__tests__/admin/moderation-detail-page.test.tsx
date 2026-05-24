/**
 * Moderation case detail page tests.
 */

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: { current: unknown } = { current: null }
const listMock = vi.fn()
const getMock = vi.fn()

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
  apiClient: {
    listModerationQueue: listMock,
    getComplaint: getMock,
  },
  ApiError,
}))

const notFoundMock = vi.fn(() => {
  throw new Error('__NOT_FOUND__')
})

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

// The page mounts a Client Component island (`ModerationDecisionForm`)
// that imports a server action. Stub the action + the form so we don't
// pull `'use server'` modules into the jsdom test env.
const actionMock = vi.fn()
const formStub = vi.fn(({ caseId }: { caseId: string }) => (
  <div data-testid="decision-form" data-case-id={caseId} />
))

vi.mock('../../features/admin/ModerationDecisionForm.tsx', () => ({
  ModerationDecisionForm: formStub,
}))
vi.mock('../../features/admin/moderationActions.ts', () => ({
  submitModerationDecision: actionMock,
}))

const item = {
  id: 'mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  complaintSlug: 'pothole-on-mg-road',
  targetKind: 'complaint',
  reason: 'pii-leak',
  status: 'pending',
  reviewerId: null,
  slaDueAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  decidedAt: null,
  rationale: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const complaint = {
  id: 'c1',
  title: 'Pothole on MG Road',
  body: 'There has been a pothole here.',
  bodyExcerpt: 'There has been a pothole here.',
  categorySlug: 'roads',
  categoryLabel: 'Roads',
  stateCode: 'ka',
  districtCode: 'blr-u',
  pcCode: 'blr-s',
  acCode: 'btm',
  stateLabel: 'Karnataka',
  districtLabel: 'Bengaluru Urban',
  pcLabel: 'Bangalore South',
  acLabel: 'BTM',
  photoUrls: ['https://cdn.factivist.in/p/1.jpg'],
  authorHandle: '@anon-abc',
  disclaimer: 'User-submitted; not verified by Factivist.',
  commentCount: 0,
  flagCount: 1,
  createdAt: new Date().toISOString(),
}

beforeEach(() => {
  sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
  listMock.mockReset()
  getMock.mockReset()
  notFoundMock.mockClear()
  formStub.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ModerationCasePage', () => {
  it('renders case meta + linked complaint + decision form', async () => {
    listMock.mockResolvedValueOnce({ items: [item] })
    getMock.mockResolvedValueOnce(complaint)
    const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
    const tree = await Page({ params: Promise.resolve({ id: item.id }) })
    const { getByTestId } = render(tree)
    expect(getByTestId('case-meta').textContent).toContain('pii-leak')
    expect(getByTestId('complaint-view').textContent).toContain('Pothole on MG Road')
    expect(getByTestId('decision-form')).toBeInTheDocument()
  })

  it('renders photos as anchors (not inline <img>) to keep faces out of viewport', async () => {
    listMock.mockResolvedValueOnce({ items: [item] })
    getMock.mockResolvedValueOnce(complaint)
    const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
    const tree = await Page({ params: Promise.resolve({ id: item.id }) })
    const { getByTestId, container } = render(tree)
    const photos = getByTestId('complaint-photos')
    expect(photos.querySelectorAll('img')).toHaveLength(0)
    const anchors = photos.querySelectorAll('a')
    expect(anchors.length).toBe(1)
    expect(anchors[0]?.getAttribute('rel')).toContain('noreferrer')
    expect(anchors[0]?.getAttribute('target')).toBe('_blank')
    expect(container.innerHTML).not.toMatch(/nullifier/i)
  })

  it('renders the complaint-missing degradation when the API returns 404', async () => {
    listMock.mockResolvedValueOnce({ items: [item] })
    getMock.mockRejectedValueOnce(new ApiError('not found', 404))
    const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
    const tree = await Page({ params: Promise.resolve({ id: item.id }) })
    const { getByTestId, queryByTestId } = render(tree)
    expect(getByTestId('complaint-missing')).toBeInTheDocument()
    expect(queryByTestId('complaint-view')).toBeNull()
  })

  it('re-throws non-404 API errors', async () => {
    listMock.mockResolvedValueOnce({ items: [item] })
    getMock.mockRejectedValueOnce(new ApiError('boom', 500))
    const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
    await expect(Page({ params: Promise.resolve({ id: item.id }) })).rejects.toThrow(/boom/)
  })

  it('calls notFound() when the case id is not in the queue', async () => {
    listMock.mockResolvedValueOnce({ items: [] })
    const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
    await expect(Page({ params: Promise.resolve({ id: item.id }) })).rejects.toThrow(
      '__NOT_FOUND__',
    )
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('binds the server action with the case id (form can never spoof it)', async () => {
    listMock.mockResolvedValueOnce({ items: [item] })
    getMock.mockResolvedValueOnce(complaint)
    const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
    const tree = await Page({ params: Promise.resolve({ id: item.id }) })
    render(tree)
    const firstCall = formStub.mock.calls[0]
    expect(firstCall).toBeDefined()
    const props = firstCall?.[0] as { caseId: string; action: unknown }
    expect(props.caseId).toBe(item.id)
    expect(typeof props.action).toBe('function')
  })

  describe('token forwarding', () => {
    it('forwards session.token as the first argument to listModerationQueue', async () => {
      sessionRef.current = { userId: 'usr_admin', role: 'admin', token: 'jwt-mod-detail' }
      listMock.mockResolvedValueOnce({ items: [item] })
      getMock.mockResolvedValueOnce(complaint)
      const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
      await Page({ params: Promise.resolve({ id: item.id }) })
      expect(listMock.mock.calls[0][0]).toBe('jwt-mod-detail')
    })

    it('passes null when session.token is null and still resolves the case', async () => {
      sessionRef.current = { userId: 'usr_admin', role: 'admin', token: null }
      listMock.mockResolvedValueOnce({ items: [item] })
      getMock.mockResolvedValueOnce(complaint)
      const { default: Page } = await import('../../app/admin/moderation/[id]/page.tsx')
      const tree = await Page({ params: Promise.resolve({ id: item.id }) })
      const { getByTestId } = render(tree)
      expect(listMock.mock.calls[0][0]).toBeNull()
      expect(getByTestId('case-meta')).toBeInTheDocument()
    })
  })
})
