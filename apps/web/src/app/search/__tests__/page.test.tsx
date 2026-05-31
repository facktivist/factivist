import { afterEach, describe, expect, it, vi } from 'vitest'

const { listComplaintsMock } = vi.hoisted(() => ({
  listComplaintsMock: vi.fn(),
}))

vi.mock('../../../lib/api/client.ts', async () => {
  const real = await vi.importActual<typeof import('../../../lib/api/client.ts')>(
    '../../../lib/api/client.ts',
  )
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      listComplaints: (...args: unknown[]) => listComplaintsMock(...args),
    },
  }
})

vi.mock('../../../features/search/SearchView.tsx', () => ({
  SearchView: (props: { variant: string; initialQuery: string }) => (
    <div data-testid="search-view" data-variant={props.variant} data-query={props.initialQuery} />
  ),
}))

import SearchPage from '../page.tsx'

afterEach(() => {
  vi.clearAllMocks()
})

describe('SearchPage', () => {
  it("renders the 'no-query' empty state when ?q is empty and skips the fetch", async () => {
    const element = await SearchPage({ searchParams: Promise.resolve({}) })
    // The empty-query branch must not spend a fetch.
    expect(listComplaintsMock).not.toHaveBeenCalled()
    expect(element).toBeTruthy()
  })

  it('forwards the trimmed query to apiClient.listComplaints when ?q is non-empty', async () => {
    listComplaintsMock.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasNext: false,
    })
    await SearchPage({ searchParams: Promise.resolve({ q: '  pothole  ' }) })
    expect(listComplaintsMock).toHaveBeenCalledTimes(1)
    const args = listComplaintsMock.mock.calls[0][0] as { q: string; sort: string }
    expect(args.q).toBe('pothole')
    expect(args.sort).toBe('newest')
  })

  it('coerces an array-shape ?q (Next can pass string | string[]) to its first entry', async () => {
    listComplaintsMock.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      hasNext: false,
    })
    await SearchPage({ searchParams: Promise.resolve({ q: ['first', 'second'] }) })
    const args = listComplaintsMock.mock.calls[0][0] as { q: string }
    expect(args.q).toBe('first')
  })
})
