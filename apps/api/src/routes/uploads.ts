import { createClient } from '@factivist/db/client'
import { complaints } from '@factivist/db/schema'
import { photoSignRequestSchema } from '@factivist/shared/validators'
import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import {
  type FinalizePersistFn,
  processStorageWebhook,
  readWebhookSecret,
  SIGNATURE_HEADER,
  type StorageFetchFn,
  StorageWebhookError,
  TIMESTAMP_HEADER,
} from '../lib/storage-webhook.ts'
import {
  issueUploadToken,
  readUploadEnv,
  UploadConfigError,
  type UploadEnv,
} from '../lib/upload.ts'

/**
 * Photo upload routes — issues signed `PUT` URLs and finalises uploads via
 * the Supabase Storage object-created webhook.
 *
 * Wave 1 shipped `POST /uploads/photo/sign` (token issuance). Wave 2 adds
 * `POST /uploads/photo/finalize` — the webhook that pulls the raw upload
 * through `stripExif` before the public URL ever surfaces on
 * `complaints.photo_urls`. Without this finalize handler, the wave-1 sign
 * endpoint would leave EXIF-leaky photos visible to the citizen feed (the
 * production blocker called out in [[ADR-004]] commentary).
 *
 * Auth:
 *   - `/sign` uses the wave-1 nullifier-header convention.
 *   - `/finalize` uses HMAC-SHA256 over the raw body with a shared secret
 *     (`SUPABASE_STORAGE_WEBHOOK_SECRET`). The dashboard config is documented
 *     at the top of `lib/storage-webhook.ts`.
 *
 * Failure modes (finalize):
 *   - secret unset      → 503 `webhook_not_configured`
 *   - signature bad     → 401 `bad_signature`
 *   - replay rejected   → 401 `replay_rejected`
 *   - payload invalid   → 400 `invalid_payload`
 *   - bucket mismatch   → 400 `bucket_mismatch`
 *   - event ignored     → 200 `{ ignored: true }`
 *   - fetch failed      → 502 `fetch_failed`
 *   - exif strip failed → 422 `strip_failed` + ExifStripError code in detail
 *   - persist failed    → 500 `persist_failed`
 */

const isNullifierHeaderValid = (header: string | undefined): header is string => {
  if (!header) return false
  // Nullifier is a 64-char hex BigInt string per shared validators. Keep this
  // lightweight; the canonical schema lives in @factivist/shared.
  return /^[0-9a-fA-F]{32,80}$/u.test(header)
}

/**
 * Default object fetcher — pulls raw bytes from Supabase Storage via the
 * service-role REST endpoint. Injected into `processStorageWebhook` so
 * tests can swap it without touching the network.
 */
export const buildDefaultFetcher =
  (env: UploadEnv, fetchImpl: typeof fetch = fetch): StorageFetchFn =>
  async (objectKey: string): Promise<Uint8Array> => {
    const res = await fetchImpl(`${env.storageUrl}/storage/v1/object/${env.bucket}/${objectKey}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${env.serviceRoleKey}` },
    })
    if (!res.ok) {
      throw new Error(`Storage fetch failed: ${res.status} ${await res.text()}`)
    }
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }

/**
 * Default persistence hook — appends the canonical public URL to the
 * matching `complaints.photo_urls` array, deduplicating on insert.
 *
 * The append uses `array_append` with a `WHERE NOT (publicUrl = ANY(...))`
 * guard so Supabase's at-least-once retries never duplicate the URL.
 * When no complaint matches the slug, returns `{ persisted: false }` and
 * the route returns 200 — the re-encoded object remains in Storage and
 * the bucket's GC lifecycle cleans up orphans after 24h.
 */
export const buildDefaultPersist =
  (
    dbFactory: (url: string) => ReturnType<typeof createClient> = createClient,
    env: NodeJS.ProcessEnv = process.env,
  ): FinalizePersistFn =>
  async ({ slug, publicUrl }) => {
    const url = env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL not set')
    const db = dbFactory(url)
    const result = await db
      .update(complaints)
      .set({
        photoUrls: sql`array_append(${complaints.photoUrls}, ${publicUrl})`,
      })
      .where(
        sql`${complaints.slug} = ${slug} AND NOT (${publicUrl} = ANY(${complaints.photoUrls}))`,
      )
      .returning({ slug: complaints.slug })
    return { persisted: result.length > 0 }
  }

export const uploadsRoute = new Hono()
  .post(
    '/uploads/photo/sign',
    zValidator('json', photoSignRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'invalid_request', code: 'BAD_INPUT' as const }, 400)
      }
    }),
    async (c) => {
      const claimed = c.req.header('x-factivist-nullifier')
      if (!isNullifierHeaderValid(claimed)) {
        return c.json({ error: 'unauthenticated', code: 'UNAUTH' as const }, 401)
      }

      let env: UploadEnv
      try {
        env = readUploadEnv()
      } catch (err) {
        if (err instanceof UploadConfigError) {
          return c.json({ error: 'upload_not_configured', code: 'UPLOAD_CONFIG' as const }, 503)
        }
        throw err
      }

      const { slug, photoId } = c.req.valid('json')
      try {
        const token = await issueUploadToken(env, slug, photoId)
        return c.json(token, 200)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown'
        return c.json({ error: 'sign_failed', code: 'SIGN_FAILED' as const, detail: message }, 502)
      }
    },
  )
  .post('/uploads/photo/finalize', async (c) => {
    const secret = readWebhookSecret()
    if (!secret) {
      return c.json({ error: 'webhook_not_configured', code: 'WEBHOOK_CONFIG' as const }, 503)
    }

    let env: UploadEnv
    try {
      env = readUploadEnv()
    } catch (err) {
      if (err instanceof UploadConfigError) {
        return c.json({ error: 'upload_not_configured', code: 'UPLOAD_CONFIG' as const }, 503)
      }
      throw err
    }

    // Read the raw body BEFORE Hono parses JSON — the HMAC is computed over
    // the exact bytes Supabase sent; whitespace differences would break it.
    const rawBody = await c.req.text()
    const signatureHeader = c.req.header(SIGNATURE_HEADER)
    const timestampHeader = c.req.header(TIMESTAMP_HEADER)

    try {
      const result = await processStorageWebhook({
        rawBody,
        signatureHeader,
        timestampHeader,
        secret,
        uploadEnv: env,
        fetchObject: buildDefaultFetcher(env),
        persist: buildDefaultPersist(),
      })
      return c.json(result, 200)
    } catch (err) {
      if (err instanceof StorageWebhookError) {
        switch (err.code) {
          case 'BAD_SIGNATURE':
            return c.json({ error: 'bad_signature', code: err.code }, 401)
          case 'REPLAY_REJECTED':
            return c.json({ error: 'replay_rejected', code: err.code }, 401)
          case 'INVALID_PAYLOAD':
            return c.json({ error: 'invalid_payload', code: err.code, detail: err.message }, 400)
          case 'BUCKET_MISMATCH':
            return c.json({ error: 'bucket_mismatch', code: err.code, detail: err.message }, 400)
          case 'IGNORED_EVENT':
            return c.json({ ignored: true, code: err.code, detail: err.message }, 200)
          case 'FETCH_FAILED':
            return c.json({ error: 'fetch_failed', code: err.code, detail: err.message }, 502)
          case 'STRIP_FAILED':
            return c.json(
              {
                error: 'strip_failed',
                code: err.code,
                detail: err.message,
                exifCode: err.detail,
              },
              422,
            )
          case 'PERSIST_FAILED':
            return c.json({ error: 'persist_failed', code: err.code, detail: err.message }, 500)
        }
      }
      throw err
    }
  })

export type UploadsRoute = typeof uploadsRoute
