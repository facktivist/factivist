'use client'

/**
 * Web photo upload hook — mirrors the mobile usePhotoCapture +
 * useTusUpload split into a single web-shaped hook.
 *
 * Differences from mobile:
 *   - No camera capture (web composer picks files from disk via a
 *     hidden <input type="file" multiple accept="image/*">). The
 *     consumer renders the trigger; this hook only owns the file
 *     queue + the signed-URL fetch + the PUT.
 *   - No tus-js-client. Supabase Storage's signed upload URL accepts
 *     a single-shot PUT; resumption is not worth the runtime dep
 *     for a web composer that already runs in a tab-aware browser
 *     with auto-retry on the user's network layer. Mobile retains
 *     tus because cell-network drops are the dominant failure.
 *
 * Server contract (matches apps/api/src/routes/uploads.ts):
 *   POST /uploads/photo/sign { slug, photoId } →
 *     { uploadUrl, token, path, publicUrl }
 *   PUT  uploadUrl (raw image bytes, Authorization: Bearer <token>)
 *
 * EXIF stripping is server-side (apps/api/src/lib/exif-strip.ts) —
 * never trust client to strip per ATID-COMPL-002.
 */

import { useCallback, useState } from 'react'

import { API_BASE_URL } from '../../lib/api/client.ts'

export interface UploadedPhoto {
  /** Stable per-photo id (UUID). Survives across re-renders. */
  readonly id: string
  /** Public Supabase Storage URL — populated once the upload finishes. */
  readonly url: string
  readonly uploadState: 'pending' | 'uploading' | 'uploaded' | 'failed'
  readonly progress?: number
  readonly error?: string
}

interface SignResponse {
  readonly uploadUrl: string
  readonly token: string
  readonly path: string
  readonly publicUrl: string
}

const randomId = (): string => {
  // Cast through `unknown` so the second `in`-check still narrows when
  // the runtime crypto lacks `randomUUID` (TS narrows it to `never`
  // along that branch using the lib.dom typings).
  const c = (typeof crypto !== 'undefined' ? crypto : undefined) as
    | { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array }
    | undefined
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  // Fallback for older runtimes (next.js polyfills crypto.randomUUID in
  // Node 18+ so this is rare).
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export interface UseWebPhotoUploadResult {
  readonly photos: ReadonlyArray<UploadedPhoto>
  readonly publicUrls: ReadonlyArray<string>
  readonly add: (file: File, slug: string) => Promise<void>
  readonly remove: (id: string) => void
  readonly isUploading: boolean
  readonly error: string | undefined
}

export const MAX_WEB_PHOTOS = 3 as const

/**
 * `slug` is the composer-side draft slug used as the storage path
 * prefix (mirrors mobile). Real slug is server-issued on POST
 * /complaints; the upload pipeline tolerates the draft-slug prefix.
 */
export const useWebPhotoUpload = (): UseWebPhotoUploadResult => {
  const [photos, setPhotos] = useState<ReadonlyArray<UploadedPhoto>>([])
  const [error, setError] = useState<string | undefined>(undefined)

  const update = useCallback((id: string, patch: Partial<UploadedPhoto>): void => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const add = useCallback(
    async (file: File, slug: string): Promise<void> => {
      setError(undefined)
      const id = randomId()
      // Optimistic-add a local preview while the upload runs. Object
      // URL is revoked when the photo is removed or replaced.
      const localUrl = URL.createObjectURL(file)
      const next: UploadedPhoto = {
        id,
        url: localUrl,
        uploadState: 'pending',
        progress: 0,
      }
      setPhotos((prev) => {
        if (prev.length >= MAX_WEB_PHOTOS) {
          // Defence in depth — the consumer should also cap, but we
          // refuse here to keep state consistent.
          URL.revokeObjectURL(localUrl)
          return prev
        }
        return [...prev, next]
      })

      try {
        update(id, { uploadState: 'uploading', progress: 0 })
        const signRes = await fetch(`${API_BASE_URL}/uploads/photo/sign`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug, photoId: id }),
        })
        if (!signRes.ok) throw new Error(`sign failed (${signRes.status})`)
        const sign = (await signRes.json()) as SignResponse

        const putRes = await fetch(sign.uploadUrl, {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${sign.token}`,
            'content-type': file.type || 'application/octet-stream',
          },
          body: file,
        })
        if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`)

        URL.revokeObjectURL(localUrl)
        update(id, {
          url: sign.publicUrl,
          uploadState: 'uploaded',
          progress: 1,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed.'
        update(id, { uploadState: 'failed', error: message })
        setError(message)
      }
    },
    [update],
  )

  const remove = useCallback((id: string): void => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target && target.uploadState !== 'uploaded') {
        URL.revokeObjectURL(target.url)
      }
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const isUploading = photos.some((p) => p.uploadState === 'uploading')
  const publicUrls = photos.filter((p) => p.uploadState === 'uploaded').map((p) => p.url)

  return { photos, publicUrls, add, remove, isUploading, error }
}
