/**
 * Photo capture hook — Expo image picker + camera.
 *
 * ATID interpretation: ATID-COMPL-002 says the SERVER persists photos via
 * Sharp and the stored object MUST be re-encoded JPEG with only the
 * orientation tag preserved. The contract is server-side: the canonical
 * EXIF strip lives in `apps/api/src/lib/exif-strip.ts` (called from
 * `acceptUpload`). We do NOT strip EXIF on device — that would mean
 * shipping a JPEG re-encoder into the Expo bundle (≈800 KB), running it
 * on low-end Android, and giving callers a false sense of "stripped"
 * when the canonical guarantee is the server's hook.
 *
 * So: this hook hands raw URIs straight to the tus uploader and the
 * server re-encodes. Server is the only line of defence.
 *
 * Permissions:
 *   - iOS / Android — `expo-image-picker` requests photo-library access on
 *     first use; `expo-camera` requests camera access. We surface the
 *     denial state so the composer can render a manual "Open settings"
 *     affordance.
 */

import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'

export interface CapturedPhoto {
  /** Local `file://` URI usable as a tus upload source. */
  readonly uri: string
  readonly width: number
  readonly height: number
  readonly mimeType: string
  /** File size in bytes — set when the asset reports it; undefined otherwise. */
  readonly bytes?: number
}

export interface PhotoCaptureState {
  readonly photos: ReadonlyArray<CapturedPhoto>
  readonly isCapturing: boolean
  readonly error?: string
  readonly libraryPermission: 'granted' | 'denied' | 'undetermined'
  readonly cameraPermission: 'granted' | 'denied' | 'undetermined'
}

export interface UsePhotoCaptureResult extends PhotoCaptureState {
  /** Open the library picker (multi-select up to `3 - photos.length`). */
  pickFromLibrary: () => Promise<void>
  /** Open the camera and append a single photo. */
  takePhoto: () => Promise<void>
  /** Drop a photo by URI. */
  removePhoto: (uri: string) => void
  /** Reset the whole tray. */
  reset: () => void
}

/** S1 cap per ATID-COMPL-001 — `photos: [≤3 multipart files]`. */
export const MAX_PHOTOS = 3

const toCapturedPhoto = (asset: ImagePicker.ImagePickerAsset): CapturedPhoto => ({
  uri: asset.uri,
  width: asset.width,
  height: asset.height,
  mimeType: asset.mimeType ?? 'image/jpeg',
  bytes: asset.fileSize,
})

const mapPermission = (
  status: ImagePicker.PermissionStatus | undefined,
): 'granted' | 'denied' | 'undetermined' => {
  if (status === ImagePicker.PermissionStatus.GRANTED) return 'granted'
  if (status === ImagePicker.PermissionStatus.DENIED) return 'denied'
  return 'undetermined'
}

export function usePhotoCapture(): UsePhotoCaptureResult {
  const [photos, setPhotos] = useState<ReadonlyArray<CapturedPhoto>>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [libraryPermission, setLibraryPermission] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  )
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  )

  const remainingSlots = MAX_PHOTOS - photos.length

  const pickFromLibrary = useCallback(async () => {
    if (remainingSlots <= 0) {
      setError(`At most ${MAX_PHOTOS} photos.`)
      return
    }
    setError(undefined)
    setIsCapturing(true)
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      setLibraryPermission(mapPermission(perm.status))
      if (perm.status !== ImagePicker.PermissionStatus.GRANTED) {
        setError('Photo library permission denied.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.9,
        exif: false,
      })
      if (result.canceled) return
      const next = result.assets.slice(0, remainingSlots).map(toCapturedPhoto)
      setPhotos((prev) => [...prev, ...next])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo pick failed.')
    } finally {
      setIsCapturing(false)
    }
  }, [remainingSlots])

  const takePhoto = useCallback(async () => {
    if (remainingSlots <= 0) {
      setError(`At most ${MAX_PHOTOS} photos.`)
      return
    }
    setError(undefined)
    setIsCapturing(true)
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      setCameraPermission(mapPermission(perm.status))
      if (perm.status !== ImagePicker.PermissionStatus.GRANTED) {
        setError('Camera permission denied.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        exif: false,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset) return
      setPhotos((prev) => [...prev, toCapturedPhoto(asset)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera capture failed.')
    } finally {
      setIsCapturing(false)
    }
  }, [remainingSlots])

  const removePhoto = useCallback((uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri))
  }, [])

  const reset = useCallback(() => {
    setPhotos([])
    setError(undefined)
  }, [])

  return {
    photos,
    isCapturing,
    error,
    libraryPermission,
    cameraPermission,
    pickFromLibrary,
    takePhoto,
    removePhoto,
    reset,
  }
}
