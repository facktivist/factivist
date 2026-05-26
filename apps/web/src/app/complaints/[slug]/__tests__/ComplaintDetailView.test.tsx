/**
 * `<ComplaintDetailView />` client-island test.
 *
 * Renders the view with a seeded complaint + initial comment, confirms
 * the compound slots show up + their props are forwarded correctly.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { flagComplaintMock, createCommentMock, listCommentsMock } = vi.hoisted(() => ({
  flagComplaintMock: vi.fn(async () => undefined),
  createCommentMock: vi.fn(async () => ({})),
  listCommentsMock: vi.fn(async () => ({ items: [] })),
}))

vi.mock('../../../../lib/api/client.ts', async () => {
  const real = await vi.importActual<typeof import('../../../../lib/api/client.ts')>(
    '../../../../lib/api/client.ts',
  )
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      flagComplaint: (...args: unknown[]) => flagComplaintMock(...args),
      createComment: (...args: unknown[]) => createCommentMock(...args),
      listComments: (...args: unknown[]) => listCommentsMock(...args),
    },
  }
})

import { ComplaintDetailView } from '../ComplaintDetailView.tsx'

const complaint = {
  id: 'cmp_test',
  title: 'Pothole on MG Road',
  body: 'A long body paragraph that should appear in the page.',
  bodyExcerpt: 'A long body',
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
  photoUrls: ['https://storage/p1.jpg', 'https://storage/p2.jpg'],
  authorHandle: 'anon_alpha',
  disclaimer: 'opinion',
  commentCount: 1,
  flagCount: 0,
  createdAt: '2026-05-26T00:00:00.000Z',
}

const sampleComment = {
  id: 'cmt_1',
  parentId: null,
  complaintId: 'cmp_test',
  authorHandle: 'anon_beta',
  body: 'thanks for filing this',
  createdAt: '2026-05-26T01:00:00.000Z',
  flagged: false,
}

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('ComplaintDetailView', () => {
  it('renders the complaint title, body and the author handle', () => {
    renderWithClient(
      <ComplaintDetailView complaint={complaint} initialComments={[sampleComment]} />,
    )
    expect(screen.getByText('Pothole on MG Road')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-body').textContent).toMatch(/A long body paragraph/)
    expect(screen.getByTestId('complaint-author-handle').textContent).toMatch(/anon_alpha/)
  })

  it('renders the geo + category breadcrumb', () => {
    renderWithClient(<ComplaintDetailView complaint={complaint} initialComments={[]} />)
    expect(screen.getByText(/Roads/)).toBeInTheDocument()
    expect(screen.getByText(/Karnataka \/ Bangalore Urban \/ BTM Layout/)).toBeInTheDocument()
  })

  it('shows the comment count in the thread header', () => {
    renderWithClient(
      <ComplaintDetailView complaint={complaint} initialComments={[sampleComment]} />,
    )
    expect(screen.getByText('Comments (1)')).toBeInTheDocument()
  })

  it('omits PhotoGallery when there are no photos', () => {
    const noPhotos = { ...complaint, photoUrls: [] }
    renderWithClient(<ComplaintDetailView complaint={noPhotos} initialComments={[]} />)
    // PhotoGallery renders `<ul role="list">` with the photos; with zero
    // photos we don't render the slot at all.
    expect(screen.queryByRole('list', { name: /photo/i })).toBeNull()
  })

  it('renders the FlagAction trigger', () => {
    renderWithClient(<ComplaintDetailView complaint={complaint} initialComments={[]} />)
    const flagBtn = screen.getByRole('button', { name: /flag/i })
    expect(flagBtn).toBeInTheDocument()
  })

  it('calls apiClient.flagComplaint when the user picks a reason', async () => {
    const user = userEvent.setup()
    renderWithClient(<ComplaintDetailView complaint={complaint} initialComments={[]} />)
    await user.click(screen.getByRole('button', { name: /flag this complaint/i }))
    // FLAG_REASONS first label = "Spam"
    await user.click(await screen.findByRole('button', { name: /^spam$/i }))
    await waitFor(() => expect(flagComplaintMock).toHaveBeenCalled())
    const args = flagComplaintMock.mock.calls[0] as [string, { reason: string }]
    expect(args[0]).toBe('cmp_test')
    expect(args[1].reason).toBe('spam')
  })

  it('calls apiClient.createComment when the user submits a top-level reply', async () => {
    const user = userEvent.setup()
    renderWithClient(<ComplaintDetailView complaint={complaint} initialComments={[]} />)
    const textarea = screen.getByLabelText('Comment body')
    await user.type(textarea, 'thoughtful reply')
    await user.click(screen.getByRole('button', { name: /^post$/i }))
    await waitFor(() => expect(createCommentMock).toHaveBeenCalled())
    const [args] = createCommentMock.mock.calls[0] as [
      { complaintSlug: string; body: string; parentId?: string },
    ]
    expect(args.complaintSlug).toBe('cmp_test')
    expect(args.body).toBe('thoughtful reply')
    expect(args.parentId).toBeUndefined()
  })
})

afterEach(() => {
  vi.clearAllMocks()
})
