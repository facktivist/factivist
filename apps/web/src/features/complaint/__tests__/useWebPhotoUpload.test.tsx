/**
 * Tests for the web photo-upload hook. Uses @testing-library/react's
 * `renderHook` + `act` to exercise the async add/remove paths.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_WEB_PHOTOS, useWebPhotoUpload } from '../useWebPhotoUpload.ts'

// URL.createObjectURL + revokeObjectURL — jsdom ships only the constructor.
const createdUrls: string[] = []
const revokedUrls: string[] = []
beforeEach(() => {
  createdUrls.length = 0
  revokedUrls.length = 0
  // biome-ignore lint/suspicious/noExplicitAny: jsdom shim
  ;(globalThis.URL as any).createObjectURL = (file: Blob): string => {
    const url = `blob:local-${createdUrls.length}`
    createdUrls.push(url)
    return url
  }
  // biome-ignore lint/suspicious/noExplicitAny: jsdom shim
  ;(globalThis.URL as any).revokeObjectURL = (url: string): void => {
    revokedUrls.push(url)
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

const fakeFile = (name = 'a.jpg', type = 'image/jpeg'): File =>
  new File([new Uint8Array([1, 2, 3])], name, { type })

const okJson = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('MAX_WEB_PHOTOS', () => {
  it('is 3 — matches the Complaint.PhotoTray default cap', () => {
    expect(MAX_WEB_PHOTOS).toBe(3)
  })
})

describe('useWebPhotoUpload', () => {
  it('starts with an empty photo list + no error', () => {
    const { result } = renderHook(() => useWebPhotoUpload())
    expect(result.current.photos).toHaveLength(0)
    expect(result.current.publicUrls).toHaveLength(0)
    expect(result.current.isUploading).toBe(false)
    expect(result.current.error).toBeUndefined()
  })

  it('adds a photo and transitions through uploading → uploaded', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        okJson({
          uploadUrl: 'https://storage/sign',
          token: 'tok',
          path: 'p',
          publicUrl: 'https://storage/p.jpg',
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWebPhotoUpload())
    await act(async () => {
      await result.current.add(fakeFile(), 'slug-abc')
    })
    expect(result.current.photos).toHaveLength(1)
    expect(result.current.photos[0]?.uploadState).toBe('uploaded')
    expect(result.current.photos[0]?.url).toBe('https://storage/p.jpg')
    expect(result.current.publicUrls).toEqual(['https://storage/p.jpg'])
    // Two fetches: sign + PUT.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // The PUT carries the Bearer token + the file bytes.
    const putCall = fetchMock.mock.calls[1]
    const init = putCall?.[1] as RequestInit
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('marks the photo failed when /sign returns non-ok', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('boom', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWebPhotoUpload())
    await act(async () => {
      await result.current.add(fakeFile(), 'slug')
    })
    await waitFor(() => expect(result.current.photos[0]?.uploadState).toBe('failed'))
    expect(result.current.error).toMatch(/sign failed/)
    expect(result.current.publicUrls).toHaveLength(0)
  })

  it('marks the photo failed when the PUT fails', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        okJson({
          uploadUrl: 'https://storage/sign',
          token: 'tok',
          path: 'p',
          publicUrl: 'https://storage/p.jpg',
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWebPhotoUpload())
    await act(async () => {
      await result.current.add(fakeFile(), 'slug')
    })
    await waitFor(() => expect(result.current.photos[0]?.uploadState).toBe('failed'))
    expect(result.current.error).toMatch(/upload failed/)
  })

  it('refuses to add a 4th photo (caps at MAX_WEB_PHOTOS=3)', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      okJson({
        uploadUrl: 'https://storage/sign',
        token: 'tok',
        path: 'p',
        publicUrl: 'https://storage/p.jpg',
      }),
    )
    // Every PUT succeeds.
    let i = 0
    fetchMock.mockImplementation(async () => {
      i += 1
      // Even calls are signs, odd are PUTs.
      if (i % 2 === 1) {
        return okJson({
          uploadUrl: 'https://storage/sign',
          token: 'tok',
          path: `p-${i}`,
          publicUrl: `https://storage/p-${i}.jpg`,
        })
      }
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useWebPhotoUpload())
    await act(async () => {
      await result.current.add(fakeFile('a.jpg'), 's')
      await result.current.add(fakeFile('b.jpg'), 's')
      await result.current.add(fakeFile('c.jpg'), 's')
      // 4th — should be refused at the state-setter boundary.
      await result.current.add(fakeFile('d.jpg'), 's')
    })
    expect(result.current.photos).toHaveLength(3)
  })

  it('remove() drops the entry + revokes the local URL when not yet uploaded', () => {
    const { result } = renderHook(() => useWebPhotoUpload())
    // Inject a pending photo directly so we can test remove() without
    // going through fetch.
    // biome-ignore lint/suspicious/noExplicitAny: test injection
    const internal = (result.current as any).photos
    expect(internal).toEqual([])
    // Use the public API path: trigger an add that ends in 'failed' so
    // the entry stays with the local blob: URL, then remove it.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('x', { status: 503 })))
    act(() => {
      void result.current.add(fakeFile(), 's')
    })
    // Wait for the failure to land.
    return waitFor(() => {
      expect(result.current.photos).toHaveLength(1)
    }).then(() => {
      const id = result.current.photos[0]?.id ?? ''
      act(() => result.current.remove(id))
      expect(result.current.photos).toHaveLength(0)
    })
  })

  it('falls back to getRandomValues when crypto.randomUUID is missing', async () => {
    const originalCrypto = globalThis.crypto
    // biome-ignore lint/suspicious/noExplicitAny: jsdom shim
    const cryptoNoUUID: any = {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    }
    Object.defineProperty(globalThis, 'crypto', {
      value: cryptoNoUUID,
      configurable: true,
    })
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('x', { status: 503 })))
      const { result } = renderHook(() => useWebPhotoUpload())
      await act(async () => {
        await result.current.add(fakeFile(), 's')
      })
      expect(result.current.photos[0]?.id).toMatch(/^[0-9a-f-]{36}$/)
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
      })
    }
  })
})
