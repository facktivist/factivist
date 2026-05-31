/**
 * Supabase Storage signed-URL flow for complaint photos.
 *
 * Per [[ADR-004]] photos live in Supabase Storage (not IPFS). The flow:
 *
 *   1. Client requests a one-shot signed upload token from
 *      `POST /complaints/:slug/photos/sign` (issued by `issueUploadToken`).
 *   2. Client `PUT`s the raw photo bytes to Supabase Storage using that
 *      token. Storage stores them at `complaint-photos/<slug>/<photoId>`.
 *   3. Server is notified via a Storage webhook → calls `acceptUpload`,
 *      which downloads the object, runs `stripExif`, and re-uploads the
 *      re-encoded buffer to the SAME path, then issues a long-lived
 *      public URL that ends up on `complaints.photo_urls`.
 *
 * For Phase 5 wave 1 we ship the *boundary* (token issuance + the verify
 * hook that gates persistence on a successful strip). The webhook wiring
 * + the public-bucket policy live with Pipeline E.
 *
 * Why no `@supabase/supabase-js` here:
 *   - The signed-URL endpoints are stable REST endpoints. Reaching for
 *     the SDK pulls a chunk of bundle + Auth machinery we don't need on
 *     this surface.
 *   - Bun's native `fetch` covers the two HTTP calls we make.
 */

import { stripExif } from './exif-strip.ts'

/**
 * Env-var shape required by the upload path. Documented in
 * `apps/api/.env.example`. The route returns 503 when any of these are
 * missing — never edits `.env` directly (project rule).
 */
export interface UploadEnv {
  readonly storageUrl: string
  readonly serviceRoleKey: string
  readonly bucket: string
  /** Public URL base used to build the final permalink (CDN custom domain per [[ADR-009]]). */
  readonly publicBase: string
}

export class UploadConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadConfigError'
  }
}

/**
 * Read the upload-config env. Throws `UploadConfigError` when any
 * required variable is unset — the route handler converts that into a
 * `503 upload_not_configured`.
 */
export const readUploadEnv = (env: NodeJS.ProcessEnv = process.env): UploadEnv => {
  const storageUrl = env.SUPABASE_STORAGE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = env.SUPABASE_PHOTO_BUCKET ?? 'complaint-photos'
  const publicBase = env.SUPABASE_PHOTO_PUBLIC_BASE
  if (!storageUrl || !serviceRoleKey || !publicBase) {
    throw new UploadConfigError(
      'Upload config incomplete — set SUPABASE_STORAGE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_PHOTO_PUBLIC_BASE',
    )
  }
  return { storageUrl, serviceRoleKey, bucket, publicBase }
}

export interface UploadToken {
  /** Pre-signed `PUT` URL — single-use, short TTL. */
  readonly uploadUrl: string
  /** Token the client returns to `acceptUpload` for the strip step. */
  readonly token: string
  /** Resulting object path inside the bucket (`<slug>/<photoId>`). */
  readonly path: string
  /** Expected public URL (only valid after the strip step). */
  readonly publicUrl: string
}

/**
 * Issue a one-shot signed upload URL. Calls Supabase Storage's
 * `createSignedUploadUrl` endpoint via the REST API. The returned
 * `token` is what the client passes through to `acceptUpload`.
 *
 * Path layout: `<slug>/<photoId>` so all photos for a complaint sit
 * under one prefix — convenient for `RetireComplaint` deletes later.
 */
export const issueUploadToken = async (
  env: UploadEnv,
  slug: string,
  photoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UploadToken> => {
  const path = `${slug}/${photoId}`
  const res = await fetchImpl(
    `${env.storageUrl}/storage/v1/object/upload/sign/${env.bucket}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.serviceRoleKey}`,
        'content-type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    throw new Error(`Supabase Storage sign failed: ${res.status} ${await res.text()}`)
  }
  const body = (await res.json()) as { url?: string; token?: string }
  if (!body.url || !body.token) {
    throw new Error('Supabase Storage sign response missing url/token')
  }
  return {
    uploadUrl: body.url,
    token: body.token,
    path,
    publicUrl: `${env.publicBase}/${env.bucket}/${path}`,
  }
}

export interface AcceptUploadInput {
  readonly env: UploadEnv
  readonly slug: string
  readonly photoId: string
  /** Raw uploaded bytes pulled from Storage immediately after the client PUT. */
  readonly raw: Buffer
  /** Reported MIME from the client `PUT` Content-Type header. */
  readonly inputMime: string
  readonly fetchImpl?: typeof fetch
}

export interface AcceptUploadResult {
  readonly publicUrl: string
  readonly bytes: number
  readonly outputMime: 'image/jpeg' | 'image/png'
}

/**
 * Verify hook. Pulls the just-uploaded bytes through `stripExif`, then
 * re-uploads the re-encoded buffer to the SAME storage path (overwriting
 * the original) so the public URL surfaces the stripped image. Returns
 * the public URL that the route persists on `complaints.photo_urls`.
 *
 * Failure modes:
 *   - `stripExif` throws → bubble up; the route returns 422 and the
 *     client retries with a different file. The raw upload remains in
 *     Storage and is GC'd by the bucket's lifecycle policy after 24h.
 *   - Re-upload fails → bubble up as a regular `Error`; same retry path.
 */
export const acceptUpload = async (input: AcceptUploadInput): Promise<AcceptUploadResult> => {
  const { env, slug, photoId, raw, inputMime } = input
  const fetchImpl = input.fetchImpl ?? fetch

  const stripped = await stripExif(raw, inputMime)
  const path = `${slug}/${photoId}`

  const res = await fetchImpl(`${env.storageUrl}/storage/v1/object/${env.bucket}/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.serviceRoleKey}`,
      'content-type': stripped.outputMime,
      'x-upsert': 'true',
    },
    body: stripped.buffer,
  })
  if (!res.ok) {
    throw new Error(`Supabase Storage re-upload failed: ${res.status} ${await res.text()}`)
  }

  return {
    publicUrl: `${env.publicBase}/${env.bucket}/${path}`,
    bytes: stripped.bytes,
    outputMime: stripped.outputMime,
  }
}
