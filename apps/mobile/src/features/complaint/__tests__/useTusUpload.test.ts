import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeTusOpts {
  endpoint: string
  uploadUrl: string
  retryDelays: number[]
  chunkSize: number
  metadata: Record<string, string>
  headers: Record<string, string>
  onError: (err: Error) => void
  onProgress: (bytesUploaded: number, bytesTotal: number) => void
  onSuccess: () => void
}

const tusInstances: { opts: FakeTusOpts; start: () => void; abort: () => void }[] = []

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  uploadCtorBehavior: { mode: 'happy' as 'happy' | 'fail' },
}))

vi.mock('tus-js-client', () => {
  class Upload {
    opts: FakeTusOpts
    constructor(_blob: unknown, opts: FakeTusOpts) {
      this.opts = opts
      tusInstances.push({ opts, start: () => this.start(), abort: () => this.abort() })
    }
    start() {
      if (mocks.uploadCtorBehavior.mode === 'fail') {
        queueMicrotask(() => this.opts.onError(new Error('tus boom')))
      } else {
        queueMicrotask(() => {
          this.opts.onProgress(100, 100)
          this.opts.onSuccess()
        })
      }
    }
    abort() {
      return Promise.resolve()
    }
  }
  return { Upload }
})

import { useTusUpload } from '../useTusUpload.ts'

// Photo fixtures
const makePhoto = (i: number) => ({
  uri: `file:///p${i}.jpg`,
  width: 100,
  height: 100,
  mimeType: 'image/jpeg',
  bytes: 100,
})

const signSuccessResponse = (slug: string, photoId: string) =>
  new Response(
    JSON.stringify({
      uploadUrl: `https://upload.test/${slug}/${photoId}`,
      token: 'tok-123',
      path: `${slug}/${photoId}`,
      publicUrl: `https://cdn.test/${slug}/${photoId}`,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

describe('useTusUpload', () => {
  beforeEach(() => {
    tusInstances.length = 0
    mocks.uploadCtorBehavior.mode = 'happy'
    mocks.fetch.mockReset()
    // biome-ignore lint/suspicious/noExplicitAny: globalThis.fetch
    ;(globalThis as any).fetch = mocks.fetch
  })

  it('uploadAll() returns [] when no photos given', async () => {
    const { result } = renderHook(() => useTusUpload())
    let returned: string[] = []
    await act(async () => {
      returned = await result.current.uploadAll('slug', [])
    })
    expect(returned).toEqual([])
    expect(result.current.isUploading).toBe(false)
  })

  it('happy path returns publicUrls and finishes with isUploading=false', async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      // fetch is used for both sign POST and readPhotoBlob (URI fetch).
      if (url.endsWith('/uploads/photo/sign')) {
        return signSuccessResponse('slug', 'pid')
      }
      // readPhotoBlob path — return a blob
      return new Response(new Blob(['xx'], { type: 'image/jpeg' }), { status: 200 })
    })
    const { result } = renderHook(() => useTusUpload({ nullifier: 'abc' }))
    let urls: string[] = []
    await act(async () => {
      urls = await result.current.uploadAll('slug', [makePhoto(0)])
    })
    expect(urls.length).toBe(1)
    expect(urls[0]).toMatch(/^https:\/\/cdn\.test\//)
    expect(result.current.isUploading).toBe(false)
    expect(tusInstances.length).toBe(1)
    expect(tusInstances[0]?.opts.endpoint).toMatch(/^https:\/\/upload\.test\//)
  })

  it('throws when the sign endpoint returns non-OK', async () => {
    mocks.fetch.mockResolvedValue(new Response('forbidden', { status: 403 }))
    const { result } = renderHook(() => useTusUpload())
    await act(async () => {
      await expect(result.current.uploadAll('slug', [makePhoto(0)])).rejects.toThrow(
        /Sign endpoint returned 403/,
      )
    })
    expect(result.current.isUploading).toBe(false)
  })

  it('throws when tus emits onError', async () => {
    mocks.uploadCtorBehavior.mode = 'fail'
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/uploads/photo/sign')) {
        return signSuccessResponse('slug', 'pid')
      }
      return new Response(new Blob(['xx'], { type: 'image/jpeg' }), { status: 200 })
    })
    const { result } = renderHook(() => useTusUpload())
    await act(async () => {
      await expect(result.current.uploadAll('slug', [makePhoto(0)])).rejects.toThrow(/tus boom/)
    })
  })

  it('forwards x-factivist-nullifier header when configured', async () => {
    mocks.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/uploads/photo/sign')) {
        // Echo headers back so we can assert.
        const headers = init?.headers as Record<string, string>
        expect(headers['x-factivist-nullifier']).toBe('the-nullifier')
        return signSuccessResponse('slug', 'pid')
      }
      return new Response(new Blob(['xx']), { status: 200 })
    })
    const { result } = renderHook(() => useTusUpload({ nullifier: 'the-nullifier' }))
    await act(async () => {
      await result.current.uploadAll('slug', [makePhoto(0)])
    })
  })

  it('cancel() aborts the active tus upload and clears the ref', async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/uploads/photo/sign')) {
        return signSuccessResponse('slug', 'pid')
      }
      return new Response(new Blob(['xx']), { status: 200 })
    })
    const { result } = renderHook(() => useTusUpload())
    const uploadPromise = result.current.uploadAll('slug', [makePhoto(0)])
    act(() => {
      result.current.cancel()
    })
    await waitFor(() => {
      expect(result.current.isUploading).toBe(false)
    })
    await uploadPromise.catch(() => undefined)
  })

  it('cancel() is a noop when nothing is in-flight', () => {
    const { result } = renderHook(() => useTusUpload())
    act(() => {
      result.current.cancel()
    })
    expect(result.current.isUploading).toBe(false)
  })

  it('reset() cancels + clears progress', () => {
    const { result } = renderHook(() => useTusUpload())
    act(() => {
      result.current.reset()
    })
    expect(result.current.progress).toEqual([])
  })

  it('uploads multiple photos sequentially', async () => {
    let signCount = 0
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/uploads/photo/sign')) {
        signCount++
        return signSuccessResponse('slug', `pid-${signCount}`)
      }
      return new Response(new Blob(['xx']), { status: 200 })
    })
    const { result } = renderHook(() => useTusUpload())
    let urls: string[] = []
    await act(async () => {
      urls = await result.current.uploadAll('slug', [makePhoto(0), makePhoto(1)])
    })
    expect(urls.length).toBe(2)
    expect(signCount).toBe(2)
    expect(tusInstances.length).toBe(2)
  })
})
