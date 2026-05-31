/**
 * `/complaints/[slug]` route test.
 *
 * Server-component path — the test mocks the API client + `notFound`,
 * confirms the happy-path resolves, and exercises the 404 branch.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { notFoundMock, getComplaintMock, listCommentsMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  getComplaintMock: vi.fn(),
  listCommentsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

vi.mock('../../../../lib/api/client.ts', async () => {
  const real = await vi.importActual<typeof import('../../../../lib/api/client.ts')>(
    '../../../../lib/api/client.ts',
  )
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      getComplaint: (...args: unknown[]) => getComplaintMock(...args),
      listComments: (...args: unknown[]) => listCommentsMock(...args),
    },
  }
})

vi.mock('../ComplaintDetailView.tsx', () => ({
  ComplaintDetailView: (_props: unknown) => <div data-testid="complaint-detail-view" />,
}))

import ComplaintDetailPage from '../page.tsx'

const sampleComplaint = {
  id: 'cmp_test',
  title: 'Pothole on MG Road',
  body: 'Body',
  bodyExcerpt: 'Body',
  categorySlug: 'roads',
  categoryLabel: 'Roads',
  stateCode: 'KA',
  districtCode: 'KA-09',
  pcCode: 'PC-26',
  acCode: 'AC-150',
  stateLabel: 'Karnataka',
  districtLabel: 'Bangalore Urban',
  pcLabel: 'Bangalore South',
  acLabel: 'BTM Layout',
  photoUrls: [],
  authorHandle: 'anon_handle',
  disclaimer: 'opinion',
  commentCount: 0,
  flagCount: 0,
  createdAt: '2026-05-26T00:00:00.000Z',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ComplaintDetailPage', () => {
  it('renders the detail view when the API returns the complaint + comments', async () => {
    getComplaintMock.mockResolvedValue(sampleComplaint)
    listCommentsMock.mockResolvedValue({ items: [] })
    const element = await ComplaintDetailPage({ params: Promise.resolve({ slug: 'cmp_test' }) })
    expect(element).toBeTruthy()
    expect(getComplaintMock).toHaveBeenCalledWith('cmp_test')
    expect(listCommentsMock).toHaveBeenCalledWith('cmp_test')
  })

  it('calls notFound when the slug param is empty', async () => {
    await expect(ComplaintDetailPage({ params: Promise.resolve({ slug: '' }) })).rejects.toThrow(
      /NEXT_NOT_FOUND/,
    )
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('calls notFound when the API returns 404', async () => {
    const { ApiError } = await import('../../../../lib/api/client.ts')
    getComplaintMock.mockRejectedValue(new ApiError('not_found', 404, null))
    listCommentsMock.mockResolvedValue({ items: [] })
    await expect(
      ComplaintDetailPage({ params: Promise.resolve({ slug: 'missing' }) }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/)
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('re-throws any non-404 API error so the App Router error boundary handles it', async () => {
    const { ApiError } = await import('../../../../lib/api/client.ts')
    getComplaintMock.mockRejectedValue(new ApiError('service_unavailable', 503, null))
    listCommentsMock.mockResolvedValue({ items: [] })
    await expect(
      ComplaintDetailPage({ params: Promise.resolve({ slug: 'cmp' }) }),
    ).rejects.toMatchObject({ status: 503 })
    expect(notFoundMock).not.toHaveBeenCalled()
  })
})
