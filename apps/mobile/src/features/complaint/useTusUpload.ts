/**
 * Tus-resumable photo upload — pulls a signed Supabase Storage URL from
 * `POST /uploads/photo/sign` (issued via `issueUploadToken`) and then
 * `PUT`s the raw bytes through `tus-js-client` so the upload survives a
 * mobile network drop.
 *
 * Flow (per `apps/api/src/lib/upload.ts` doc-comment):
 *   1. Generate a client-side `photoId` (UUID) + use the composer's `slug`.
 *   2. `POST /uploads/photo/sign` → `{ uploadUrl, token, path, publicUrl }`.
 *   3. Tus `PUT` to `uploadUrl` (single-shot, but we use tus for resume).
 *   4. Server's storage webhook (Pipeline E) re-encodes via Sharp; the
 *      `publicUrl` becomes valid after that step. We trust the server to
 *      surface the same URL it gave us.
 *
 * No client-side EXIF stripping — see `usePhotoCapture.ts` doc-comment for
 * the ATID-COMPL-002 interpretation. Server is canonical.
 */

import { useCallback, useRef, useState } from 'react'
// tus-js-client ships a UMD that works in React Native via its `lib.esm/`
// entry. Metro picks the right field via `"react-native"` resolution.
import * as tus from 'tus-js-client'

import { API_BASE_URL } from '../../lib/api/client.ts'

import type { CapturedPhoto } from './usePhotoCapture.ts'

export type UploadStatus = 'idle' | 'signing' | 'uploading' | 'done' | 'error'

export interface UploadProgress {
  readonly uri: string
  readonly status: UploadStatus
  readonly bytesUploaded: number
  readonly bytesTotal: number
  readonly publicUrl?: string
  readonly error?: string
}

interface SignResponse {
  readonly uploadUrl: string
  readonly token: string
  readonly path: string
  readonly publicUrl: string
}

const randomPhotoId = (): string => {
  // RFC 4122 v4 — good enough for an object-storage path; not a security
  // token (the signed upload URL is the credential).
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  // biome-ignore lint/style/noNonNullAssertion: bytes is fixed-length 16
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  // biome-ignore lint/style/noNonNullAssertion: bytes is fixed-length 16
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const signPhotoUpload = async (
  slug: string,
  photoId: string,
  nullifier: string | undefined,
): Promise<SignResponse> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (nullifier) headers['x-factivist-nullifier'] = nullifier
  const res = await fetch(`${API_BASE_URL}/uploads/photo/sign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ slug, photoId }),
  })
  if (!res.ok) {
    throw new Error(`Sign endpoint returned ${res.status}`)
  }
  return (await res.json()) as SignResponse
}

const readPhotoBlob = async (uri: string): Promise<Blob> => {
  const res = await fetch(uri)
  return await res.blob()
}

export interface UseTusUploadResult {
  readonly progress: ReadonlyArray<UploadProgress>
  readonly isUploading: boolean
  /**
   * Upload all photos sequentially. Returns the list of `publicUrl`s in the
   * same order. Throws if any single upload fails (the composer surfaces
   * the error and lets the user retry).
   */
  uploadAll: (slug: string, photos: ReadonlyArray<CapturedPhoto>) => Promise<string[]>
  /** Cancel any in-flight upload. */
  cancel: () => void
  /** Reset progress state. */
  reset: () => void
}

export interface UseTusUploadOptions {
  /** Citizen nullifier — forwarded as `x-factivist-nullifier` to the sign endpoint. */
  readonly nullifier?: string
  /** Chunk size in bytes — defaults to 5 MB, override for tests. */
  readonly chunkSize?: number
}

export function useTusUpload(options: UseTusUploadOptions = {}): UseTusUploadResult {
  const { nullifier, chunkSize = 5 * 1024 * 1024 } = options
  const [progress, setProgress] = useState<ReadonlyArray<UploadProgress>>([])
  const [isUploading, setIsUploading] = useState(false)
  const activeUploadRef = useRef<tus.Upload | null>(null)

  const updateOne = (uri: string, patch: Partial<UploadProgress>) => {
    setProgress((prev) => prev.map((p) => (p.uri === uri ? { ...p, ...patch } : p)))
  }

  const uploadOne = (photo: CapturedPhoto, sign: SignResponse, blob: Blob): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const upload = new tus.Upload(blob, {
        endpoint: sign.uploadUrl,
        uploadUrl: sign.uploadUrl,
        retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
        chunkSize,
        metadata: {
          filename: sign.path,
          filetype: photo.mimeType,
          token: sign.token,
        },
        headers: { Authorization: `Bearer ${sign.token}` },
        onError: (err: Error) => {
          updateOne(photo.uri, { status: 'error', error: err.message })
          reject(err)
        },
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          updateOne(photo.uri, { status: 'uploading', bytesUploaded, bytesTotal })
        },
        onSuccess: () => {
          updateOne(photo.uri, { status: 'done', publicUrl: sign.publicUrl })
          resolve(sign.publicUrl)
        },
      })
      activeUploadRef.current = upload
      upload.start()
    })

  // Not wrapped in useCallback — `uploadOne` closes over `chunkSize` and the
  // composer calls `uploadAll` directly from an event handler, not from an
  // effect dependency list. A fresh function per render is the simpler model.
  const uploadAll = async (
    slug: string,
    photos: ReadonlyArray<CapturedPhoto>,
  ): Promise<string[]> => {
    if (photos.length === 0) return []
    setIsUploading(true)
    setProgress(
      photos.map((p) => ({
        uri: p.uri,
        status: 'idle' as const,
        bytesUploaded: 0,
        bytesTotal: p.bytes ?? 0,
      })),
    )

    const publicUrls: string[] = []
    try {
      for (const photo of photos) {
        updateOne(photo.uri, { status: 'signing' })
        const photoId = randomPhotoId()
        const sign = await signPhotoUpload(slug, photoId, nullifier)
        updateOne(photo.uri, { status: 'uploading' })
        const blob = await readPhotoBlob(photo.uri)
        const publicUrl = await uploadOne(photo, sign, blob)
        publicUrls.push(publicUrl)
      }
      return publicUrls
    } finally {
      activeUploadRef.current = null
      setIsUploading(false)
    }
  }

  const cancel = useCallback(() => {
    const active = activeUploadRef.current
    if (active) {
      void active.abort()
      activeUploadRef.current = null
    }
    setIsUploading(false)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setProgress([])
  }, [cancel])

  return { progress, isUploading, uploadAll, cancel, reset }
}
