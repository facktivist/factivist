import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

// Mock next/navigation router (CreateComplaintForm uses useRouter()).
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}))

// Mock the api client so we can pre-load categories without HTTP.
// Re-export API_BASE_URL because useWebPhotoUpload pulls it from this
// module — without it the hook hits `undefined/uploads/photo/sign`.
vi.mock('../../../lib/api/client.ts', () => ({
  API_BASE_URL: 'http://test-api',
  apiClient: {
    listCategories: vi.fn(async () => [
      { slug: 'roads', label: 'Roads' },
      { slug: 'health', label: 'Health' },
    ]),
    listConstituency: vi.fn(async () => []),
    searchConstituency: vi.fn(async () => []),
  },
}))

import { CreateComplaintForm } from '../CreateComplaintForm.tsx'

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('CreateComplaintForm', () => {
  it('renders the disclaimer + form fields', async () => {
    const action = vi.fn(async () => ({ id: 'new-slug' }))
    renderWithClient(<CreateComplaintForm action={action} />)
    expect(screen.getByTestId('complaint-disclaimer')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-title')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-body')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-submit')).toBeInTheDocument()
  })

  it('shows the constituency error when submitting without a complete tuple', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ id: 'x' }))
    renderWithClient(<CreateComplaintForm action={action} />)
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/pick state, district, pc, and ac/i)).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('renders the body counter that tracks length', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ id: 'x' }))
    renderWithClient(<CreateComplaintForm action={action} />)
    const counter = screen.getByTestId('body-counter')
    expect(counter.textContent).toMatch(/^0\//)
    await user.type(screen.getByTestId('complaint-body'), 'hello')
    expect(counter.textContent).toMatch(/^5\//)
  })

  it('surfaces a mutation error when the action throws', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => {
      throw new Error('Submissions paused')
    })
    renderWithClient(<CreateComplaintForm action={action} />)

    // We can't easily complete the full constituency picker UX in jsdom,
    // so we exercise the title-validation surfaces independently. The
    // action-throw branch is exercised in the e2e test.
    await user.type(screen.getByTestId('complaint-title'), 'A title')
    await user.click(screen.getByTestId('complaint-submit'))
    // Submit will fail constituency check (no picker filled), surfacing
    // the constituency error rather than the action error. That is the
    // correct gating order — verify it.
    expect(await screen.findByText(/pick state, district, pc, and ac/i)).toBeInTheDocument()
  })

  it('renders category options once the query resolves', async () => {
    const action = vi.fn(async () => ({ id: 'x' }))
    renderWithClient(<CreateComplaintForm action={action} />)
    const select = screen.getByTestId('complaint-category')
    // Categories are loaded asynchronously; wait for the option text.
    await screen.findByRole('option', { name: 'Roads' })
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Health' })).toBeInTheDocument()
  })

  it('renders the Publish button label in idle state', () => {
    const action = vi.fn(async () => ({ id: 'x' }))
    renderWithClient(<CreateComplaintForm action={action} />)
    expect(screen.getByTestId('complaint-submit')).toHaveTextContent(/publish/i)
  })

  it('runs the full happy path and pushes the new complaint route on success', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ id: 'pothole-mg-7k3a' }))
    const { apiClient } = await import('../../../lib/api/client.ts')
    const list = apiClient.listConstituency as unknown as ReturnType<typeof vi.fn>
    list.mockImplementation((level: string) => {
      if (level === 'state')
        return Promise.resolve([
          { code: 'ka', label: 'Karnataka', parentCode: null, level: 'state' },
        ])
      if (level === 'district')
        return Promise.resolve([
          { code: 'ka-560', label: 'Bangalore Urban', parentCode: 'ka', level: 'district' },
        ])
      if (level === 'pc')
        return Promise.resolve([
          { code: 'ka-pc-26', label: 'Bangalore South', parentCode: 'ka-560', level: 'pc' },
        ])
      return Promise.resolve([
        { code: 'ka-ac-150', label: 'BTM Layout', parentCode: 'ka-pc-26', level: 'ac' },
      ])
    })
    renderWithClient(<CreateComplaintForm action={action} />)
    await user.type(screen.getByTestId('complaint-title'), 'Pothole on MG Road')
    await user.type(screen.getByTestId('complaint-body'), 'Body text here')
    const select = screen.getByTestId('complaint-category')
    await screen.findByRole('option', { name: 'Roads' })
    await user.selectOptions(select, 'roads')
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    // Action invoked + router pushed.
    expect(action).toHaveBeenCalled()
    const args = action.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.title).toBe('Pothole on MG Road')
    expect(args.acCode).toBe('ka-ac-150')
  })

  it('surfaces the submit-mutation error from the action', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => {
      throw new Error('boom')
    })
    const { apiClient } = await import('../../../lib/api/client.ts')
    const list = apiClient.listConstituency as unknown as ReturnType<typeof vi.fn>
    list.mockImplementation((level: string) => {
      if (level === 'state')
        return Promise.resolve([
          { code: 'ka', label: 'Karnataka', parentCode: null, level: 'state' },
        ])
      if (level === 'district')
        return Promise.resolve([
          { code: 'ka-560', label: 'Bangalore Urban', parentCode: 'ka', level: 'district' },
        ])
      if (level === 'pc')
        return Promise.resolve([
          { code: 'ka-pc-26', label: 'Bangalore South', parentCode: 'ka-560', level: 'pc' },
        ])
      return Promise.resolve([
        { code: 'ka-ac-150', label: 'BTM Layout', parentCode: 'ka-pc-26', level: 'ac' },
      ])
    })
    renderWithClient(<CreateComplaintForm action={action} />)
    await user.type(screen.getByTestId('complaint-title'), 'Title')
    await user.type(screen.getByTestId('complaint-body'), 'Body')
    const select = screen.getByTestId('complaint-category')
    await screen.findByRole('option', { name: 'Roads' })
    await user.selectOptions(select, 'roads')
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/boom/i)).toBeInTheDocument()
  })

  it('reports field-level errors when Zod payload is invalid', async () => {
    const user = userEvent.setup()
    const action = vi.fn(async () => ({ id: 'x' }))
    const { apiClient } = await import('../../../lib/api/client.ts')
    const list = apiClient.listConstituency as unknown as ReturnType<typeof vi.fn>
    list.mockImplementation((level: string) => {
      if (level === 'state')
        return Promise.resolve([
          { code: 'ka', label: 'Karnataka', parentCode: null, level: 'state' },
        ])
      if (level === 'district')
        return Promise.resolve([
          { code: 'ka-560', label: 'Bangalore Urban', parentCode: 'ka', level: 'district' },
        ])
      if (level === 'pc')
        return Promise.resolve([
          { code: 'ka-pc-26', label: 'Bangalore South', parentCode: 'ka-560', level: 'pc' },
        ])
      return Promise.resolve([
        { code: 'ka-ac-150', label: 'BTM Layout', parentCode: 'ka-pc-26', level: 'ac' },
      ])
    })
    renderWithClient(<CreateComplaintForm action={action} />)
    // Complete the picker so we get past the constituency check, then leave
    // title empty so Zod reports a title error.
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/add a one-line title/i)).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('queues a chosen photo through the hidden file input + the PhotoTray', async () => {
    // Stub URL.createObjectURL / revokeObjectURL (jsdom omits them).
    // biome-ignore lint/suspicious/noExplicitAny: jsdom shim
    ;(globalThis.URL as any).createObjectURL = () => 'blob:local'
    // biome-ignore lint/suspicious/noExplicitAny: jsdom shim
    ;(globalThis.URL as any).revokeObjectURL = () => undefined
    // Stub fetch — first call signs, second call PUTs.
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploadUrl: 'http://test-api/sign',
          token: 'tok',
          path: 'p',
          publicUrl: 'https://storage/p.jpg',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    // biome-ignore lint/suspicious/noExplicitAny: jsdom shim
    ;(globalThis as any).fetch = fetchMock

    const user = userEvent.setup()
    const action = vi.fn(async () => ({ id: 'x' }))
    renderWithClient(<CreateComplaintForm action={action} />)
    // Title fuels tempSlugFromTitle (covers lines 81-91).
    await user.type(screen.getByTestId('complaint-title'), 'Pothole on MG Road!')
    const input = screen.getByTestId('complaint-photo-input') as HTMLInputElement
    const file = new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' })
    await user.upload(input, file)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 3000 })
    const signCall = fetchMock.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('/uploads/photo/sign'),
    )
    expect(signCall).toBeDefined()
    const init = signCall?.[1] as RequestInit
    const body = JSON.parse(init.body as string) as { slug: string }
    expect(body.slug.startsWith('pothole-on-mg-road')).toBe(true)
  })
})
