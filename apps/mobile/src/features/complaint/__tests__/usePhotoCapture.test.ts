import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
}))

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: mocks.requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync: mocks.requestCameraPermissionsAsync,
  launchImageLibraryAsync: mocks.launchImageLibraryAsync,
  launchCameraAsync: mocks.launchCameraAsync,
  MediaTypeOptions: { Images: 'Images' },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}))

import { MAX_PHOTOS, usePhotoCapture } from '../usePhotoCapture.ts'

describe('usePhotoCapture', () => {
  beforeEach(() => {
    mocks.requestMediaLibraryPermissionsAsync.mockReset()
    mocks.requestCameraPermissionsAsync.mockReset()
    mocks.launchImageLibraryAsync.mockReset()
    mocks.launchCameraAsync.mockReset()
  })

  it('starts with empty photos and undetermined permissions', () => {
    const { result } = renderHook(() => usePhotoCapture())
    expect(result.current.photos).toEqual([])
    expect(result.current.libraryPermission).toBe('undetermined')
    expect(result.current.cameraPermission).toBe('undetermined')
    expect(result.current.isCapturing).toBe(false)
  })

  it('appends photos from the library after a granted permission', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', width: 100, height: 100, mimeType: 'image/jpeg', fileSize: 1024 },
      ],
    })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.photos.length).toBe(1)
    expect(result.current.photos[0]?.uri).toBe('file:///a.jpg')
    expect(result.current.libraryPermission).toBe('granted')
  })

  it('sets a denial error when library permission is denied', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.libraryPermission).toBe('denied')
    expect(result.current.error).toMatch(/photo library permission/i)
  })

  it('skips picking when no slots remain', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: Array.from({ length: MAX_PHOTOS }, (_, i) => ({
        uri: `file:///${i}.jpg`,
        width: 1,
        height: 1,
        mimeType: 'image/jpeg',
      })),
    })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.photos.length).toBe(MAX_PHOTOS)
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.error).toMatch(/at most 3 photos/i)
  })

  it('cancellation leaves photos untouched', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockResolvedValue({ canceled: true })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.photos).toEqual([])
  })

  it('captures a single photo via camera with granted permission', async () => {
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cam.jpg', width: 10, height: 10, mimeType: 'image/jpeg' }],
    })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.takePhoto()
    })
    expect(result.current.photos.length).toBe(1)
    expect(result.current.cameraPermission).toBe('granted')
  })

  it('camera denial surfaces a denial error', async () => {
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.takePhoto()
    })
    expect(result.current.cameraPermission).toBe('denied')
    expect(result.current.error).toMatch(/camera permission/i)
  })

  it('takePhoto is a noop when no slots remain', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: Array.from({ length: MAX_PHOTOS }, (_, i) => ({
        uri: `file:///${i}.jpg`,
        width: 1,
        height: 1,
        mimeType: 'image/jpeg',
      })),
    })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    await act(async () => {
      await result.current.takePhoto()
    })
    expect(result.current.error).toMatch(/at most 3/i)
  })

  it('removePhoto drops the matching uri', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///x.jpg', width: 1, height: 1, mimeType: 'image/jpeg' }],
    })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.photos.length).toBe(1)
    act(() => {
      result.current.removePhoto('file:///x.jpg')
    })
    expect(result.current.photos).toEqual([])
  })

  it('reset() clears photos and error', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.error).toBeDefined()
    act(() => {
      result.current.reset()
    })
    expect(result.current.photos).toEqual([])
    expect(result.current.error).toBeUndefined()
  })

  it('captures a runtime error inside launchImageLibraryAsync', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockRejectedValue(new Error('IO down'))
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.error).toMatch(/io down/i)
  })

  it('captures a runtime error inside launchCameraAsync', async () => {
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchCameraAsync.mockRejectedValue(new Error('camera busy'))
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.takePhoto()
    })
    expect(result.current.error).toMatch(/camera busy/i)
  })

  it('handles camera canceled / no-asset case as a noop', async () => {
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [] })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.takePhoto()
    })
    expect(result.current.photos).toEqual([])
  })

  it('falls back to image/jpeg when an asset omits mimeType', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///x.jpg', width: 1, height: 1 }],
    })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.photos[0]?.mimeType).toBe('image/jpeg')
  })

  it('reports an unknown permission status as undetermined', async () => {
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'limited' })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.pickFromLibrary()
    })
    expect(result.current.libraryPermission).toBe('undetermined')
  })

  it('camera path canceled === true is a noop', async () => {
    mocks.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mocks.launchCameraAsync.mockResolvedValue({ canceled: true })
    const { result } = renderHook(() => usePhotoCapture())
    await act(async () => {
      await result.current.takePhoto()
    })
    expect(result.current.photos).toEqual([])
  })
})
