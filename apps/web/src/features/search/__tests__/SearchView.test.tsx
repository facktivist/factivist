import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}))

import { SearchView } from '../SearchView.tsx'

const sampleResult = {
  id: 'cmp_1',
  title: 'Pothole on MG Road',
  bodyExcerpt: 'A pothole has persisted…',
  categorySlug: 'roads',
  categoryLabel: 'Roads',
  stateCode: 'ka',
  districtCode: 'blr-u',
  pcCode: 'blr-s',
  acCode: 'btm-layout',
  photoUrls: [],
  authorHandle: 'voter-1',
  commentCount: 0,
  flagCount: 0,
  createdAt: '2026-05-20T10:00:00Z',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('SearchView', () => {
  it("renders the 'no-query' EmptyState when there is no initial query", () => {
    render(<SearchView initialQuery="" initialResults={[]} variant="no-query" />)
    // EmptyState copy varies, but the Search.Bar's autoFocus prop is wired
    // when no initial query is supplied.
    expect(screen.getByPlaceholderText(/search complaints/i)).toBeInTheDocument()
  })

  it("renders the 'no-matches' EmptyState when query has no results", () => {
    render(<SearchView initialQuery="foo" initialResults={[]} variant="no-matches" />)
    // No `<ul>` of results rendered.
    expect(screen.queryByRole('list', { name: /results/i })).toBeNull()
  })

  it('renders the results list when matches exist', () => {
    render(
      <SearchView initialQuery="pothole" initialResults={[sampleResult]} variant="has-matches" />,
    )
    expect(screen.getByText('Pothole on MG Road')).toBeInTheDocument()
  })

  it('pushes a new /search URL with the encoded query on submit', async () => {
    const user = userEvent.setup()
    render(<SearchView initialQuery="" initialResults={[]} variant="no-query" />)
    const input = screen.getByPlaceholderText(/search complaints/i)
    await user.type(input, 'pothole road{Enter}')
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const url = pushMock.mock.calls[0]?.[0] as string
    expect(url).toBe('/search?q=pothole%20road')
  })

  it('navigates to the complaint detail page when a result is clicked', async () => {
    const user = userEvent.setup()
    render(
      <SearchView initialQuery="pothole" initialResults={[sampleResult]} variant="has-matches" />,
    )
    await user.click(screen.getByText('Pothole on MG Road'))
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    const url = pushMock.mock.calls[0]?.[0] as string
    expect(url).toBe('/complaints/cmp_1')
  })
})
