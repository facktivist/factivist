import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
}))

const mocks = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listConstituency: vi.fn(),
  searchConstituency: vi.fn(),
  createComplaint: vi.fn(),
  flagComplaint: vi.fn(),
  signPhotoUpload: vi.fn(),
  pickFromLibrary: vi.fn(),
  takePhoto: vi.fn(),
  removePhoto: vi.fn(),
  reset: vi.fn(),
  uploadAll: vi.fn(),
  photos: [] as { uri: string; mimeType: string }[],
}))

// Mock the photo + tus hooks so we don't pull expo-image-picker / tus-js-client
// through Vitest. The hook contracts (photos array, isCapturing flag, error
// surface, uploadAll fn) are what the composer consumes.
vi.mock('../usePhotoCapture.ts', () => ({
  MAX_PHOTOS: 3,
  usePhotoCapture: () => ({
    photos: mocks.photos,
    isCapturing: false,
    error: undefined,
    libraryPermission: 'undetermined',
    cameraPermission: 'undetermined',
    pickFromLibrary: mocks.pickFromLibrary,
    takePhoto: mocks.takePhoto,
    removePhoto: mocks.removePhoto,
    reset: mocks.reset,
  }),
}))

vi.mock('../useTusUpload.ts', () => ({
  useTusUpload: () => ({
    progress: [],
    isUploading: false,
    uploadAll: mocks.uploadAll,
    cancel: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('../../../lib/api/client.ts', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api/client.ts')>(
    '../../../lib/api/client.ts',
  )
  return {
    ...actual,
    apiClient: {
      listCategories: mocks.listCategories,
      listConstituency: mocks.listConstituency,
      searchConstituency: mocks.searchConstituency,
      createComplaint: mocks.createComplaint,
      flagComplaint: mocks.flagComplaint,
    },
  }
})

import { ApiError } from '../../../lib/api/client.ts'
import { ComplaintComposer } from '../ComplaintComposer.tsx'

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('ComplaintComposer', () => {
  beforeEach(() => {
    mocks.listCategories.mockReset()
    mocks.listConstituency.mockReset()
    mocks.searchConstituency.mockReset()
    mocks.createComplaint.mockReset()
    mocks.uploadAll.mockReset()
    mocks.photos = []
    mocks.listCategories.mockResolvedValue([{ slug: 'roads', label: 'Roads' }])
    mocks.listConstituency.mockResolvedValue([])
    mocks.searchConstituency.mockResolvedValue([])
  })

  it('renders the composer with title + body + category + constituency + submit', async () => {
    renderWithClient(<ComplaintComposer nullifier="abc" />)
    expect(screen.getByTestId('complaint-composer')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-title')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-body')).toBeInTheDocument()
    expect(screen.getByTestId('complaint-submit')).toBeInTheDocument()
    expect(await screen.findByTestId('category-roads')).toBeInTheDocument()
  })

  it('disables the submit button when required fields are empty', () => {
    renderWithClient(<ComplaintComposer />)
    const submit = screen.getByTestId('complaint-submit')
    expect(submit).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables submit once title + body + category are filled', async () => {
    const user = userEvent.setup()
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), 'Pothole MG Road')
    await user.type(screen.getByTestId('complaint-body'), 'Body text here')
    await user.click(await screen.findByTestId('category-roads'))
    await waitFor(() => {
      expect(screen.getByTestId('complaint-submit')).not.toHaveAttribute('aria-disabled', 'true')
    })
  })

  it('surfaces the constituency error when submit fires without picker complete', async () => {
    const user = userEvent.setup()
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), 'Title')
    await user.type(screen.getByTestId('complaint-body'), 'Body')
    await user.click(await screen.findByTestId('category-roads'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/pick state, district, pc, and ac/i)).toBeInTheDocument()
  })

  it('shows the photo tray with 0/3 cap label', () => {
    renderWithClient(<ComplaintComposer />)
    expect(screen.getByText(/photos \(0\/3\)/i)).toBeInTheDocument()
    expect(screen.getByTestId('photo-tray')).toBeInTheDocument()
    expect(screen.getByTestId('photo-pick')).toBeInTheDocument()
    expect(screen.getByTestId('photo-camera')).toBeInTheDocument()
  })

  it('renders the paused notice when API returns 503/S1_COMPLAINT_SUBMIT_OFF', async () => {
    // Fast-render the paused state directly by simulating the mutation error.
    // We exercise the branch by spying on the schema's safeParse output and
    // letting createComplaint throw an ApiError with the canonical code.
    const user = userEvent.setup()
    mocks.createComplaint.mockRejectedValue(
      new ApiError('feature off', 503, { code: 'S1_COMPLAINT_SUBMIT_OFF' }),
    )
    mocks.listConstituency.mockImplementation((level: string) => {
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
    renderWithClient(<ComplaintComposer nullifier="abc" />)
    await user.type(screen.getByTestId('complaint-title'), 'Title text')
    await user.type(screen.getByTestId('complaint-body'), 'Body text')
    await user.click(await screen.findByTestId('category-roads'))
    // Walk picker
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByTestId('composer-paused')).toBeInTheDocument()
  })

  it('surfaces a generic submit error for non-paused failures', async () => {
    const user = userEvent.setup()
    mocks.createComplaint.mockRejectedValue(new Error('server boom'))
    mocks.listConstituency.mockImplementation((level: string) => {
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
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), 'Title')
    await user.type(screen.getByTestId('complaint-body'), 'Body')
    await user.click(await screen.findByTestId('category-roads'))
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/server boom/i)).toBeInTheDocument()
  })

  it('submits successfully on the happy path', async () => {
    const user = userEvent.setup()
    mocks.createComplaint.mockResolvedValue({ id: 'new-slug', createdAt: '2026-05-23' })
    mocks.listConstituency.mockImplementation((level: string) => {
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
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), 'Title text')
    await user.type(screen.getByTestId('complaint-body'), 'Body text')
    await user.click(await screen.findByTestId('category-roads'))
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    await waitFor(() => {
      expect(mocks.createComplaint).toHaveBeenCalled()
    })
    const args = mocks.createComplaint.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.title).toBe('Title text')
    expect(args.stateCode).toBe('ka')
    expect(args.acCode).toBe('ka-ac-150')
    expect(args.photoUrls).toEqual([])
  })

  it('renders photo thumbnails when photos are present', () => {
    mocks.photos = [
      { uri: 'file:///tmp/p1.jpg', mimeType: 'image/jpeg' },
      { uri: 'file:///tmp/p2.jpg', mimeType: 'image/jpeg' },
    ]
    renderWithClient(<ComplaintComposer />)
    expect(screen.getByText(/photos \(2\/3\)/i)).toBeInTheDocument()
    expect(screen.getByTestId('photo-thumb-file:///tmp/p1.jpg')).toBeInTheDocument()
    expect(screen.getByTestId('photo-thumb-file:///tmp/p2.jpg')).toBeInTheDocument()
    expect(screen.getByTestId('photo-remove-file:///tmp/p1.jpg')).toBeInTheDocument()
  })

  it('surfaces photo-upload failure with the Error.message', async () => {
    const user = userEvent.setup()
    mocks.photos = [{ uri: 'file:///tmp/p.jpg', mimeType: 'image/jpeg' }]
    mocks.uploadAll.mockRejectedValue(new Error('storage 503'))
    mocks.listConstituency.mockImplementation((level: string) => {
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
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), 'Title text')
    await user.type(screen.getByTestId('complaint-body'), 'Body text')
    await user.click(await screen.findByTestId('category-roads'))
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/photo upload failed: storage 503/i)).toBeInTheDocument()
    expect(mocks.createComplaint).not.toHaveBeenCalled()
  })

  it('clicking a photo remove button drops the matching uri via the hook', async () => {
    const user = userEvent.setup()
    mocks.photos = [
      { uri: 'file:///tmp/p1.jpg', mimeType: 'image/jpeg' },
      { uri: 'file:///tmp/p2.jpg', mimeType: 'image/jpeg' },
    ]
    renderWithClient(<ComplaintComposer />)
    await user.click(screen.getByTestId('photo-remove-file:///tmp/p1.jpg'))
    expect(mocks.removePhoto).toHaveBeenCalledWith('file:///tmp/p1.jpg')
  })

  it('surfaces the Zod safeParse error when the title is whitespace-only', async () => {
    // The shared schema uses `z.string().trim().min(1, ...)`, so a title
    // composed of only spaces survives RHF (the UI guard accepts any
    // character) but trips Zod inside `createComplaintInputSchema.safeParse`.
    // This drives composer line 163-164 — the safeParse-fail branch.
    const user = userEvent.setup()
    mocks.listConstituency.mockImplementation((level: string) => {
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
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), '   ')
    await user.type(screen.getByTestId('complaint-body'), 'Body text adequate')
    await user.click(await screen.findByTestId('category-roads'))
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    // The safeParse error surfaces via setSubmitError; createComplaint must NOT fire.
    await waitFor(() => {
      expect(mocks.createComplaint).not.toHaveBeenCalled()
    })
    expect(await screen.findByText(/add a one-line title|validation failed/i)).toBeInTheDocument()
  })

  it('falls back to "Photo upload failed." when upload throws a non-Error', async () => {
    const user = userEvent.setup()
    mocks.photos = [{ uri: 'file:///tmp/p.jpg', mimeType: 'image/jpeg' }]
    mocks.uploadAll.mockRejectedValue('a string, not an Error')
    mocks.listConstituency.mockImplementation((level: string) => {
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
    renderWithClient(<ComplaintComposer />)
    await user.type(screen.getByTestId('complaint-title'), 'Title text')
    await user.type(screen.getByTestId('complaint-body'), 'Body text')
    await user.click(await screen.findByTestId('category-roads'))
    await user.click(await screen.findByTestId('option-state-ka'))
    await user.click(await screen.findByTestId('option-district-ka-560'))
    await user.click(await screen.findByTestId('option-pc-ka-pc-26'))
    await user.click(await screen.findByTestId('option-ac-ka-ac-150'))
    await user.click(screen.getByTestId('complaint-submit'))
    expect(await screen.findByText(/photo upload failed\./i)).toBeInTheDocument()
  })
})
