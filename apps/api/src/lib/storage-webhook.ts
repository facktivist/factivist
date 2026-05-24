/**
 * Supabase Storage object-created webhook orchestration.
 *
 * ## What this module owns
 *
 * The wave-1 lib (`apps/api/src/lib/upload.ts`) shipped the *boundary*:
 * `issueUploadToken` (REST sign) + `acceptUpload` (strip + re-upload).
 * Until this module landed, no production trigger wired Supabase Storage's
 * object-created event into `acceptUpload`, so `complaints.photo_urls`
 * could still reference RAW uploads with embedded EXIF GPS — the wave-2
 * production blocker called out in [[ADR-004]] commentary.
 *
 * This module closes that loop. It:
 *   1. Validates the HMAC signature against `SUPABASE_STORAGE_WEBHOOK_SECRET`.
 *   2. Parses the payload through `photoFinalizeWebhookSchema`.
 *   3. Enforces a ±5 minute timestamp window (anti-replay).
 *   4. Fetches the raw object bytes from Supabase Storage.
 *   5. Calls `acceptUpload`, which runs `stripExif` and overwrites the
 *      stored object with the re-encoded buffer.
 *   6. Appends the canonical public URL to the matching
 *      `complaints.photo_urls` array — idempotent (no duplicate appends).
 *
 * ## Supabase dashboard configuration (USER-SIDE — DO NOT auto-configure)
 *
 * The user must configure ONE webhook in the Supabase dashboard:
 *
 *   1. Go to: Storage → (bucket "complaint-photos") → Settings → Webhooks.
 *      Direct URL pattern:
 *      https://supabase.com/dashboard/project/<project-ref>/storage/buckets/complaint-photos
 *
 *   2. Create a webhook with these properties:
 *      - Name:           factivist-photo-finalize
 *      - Method:         POST
 *      - URL:            https://api.factivist.app/uploads/photo/finalize
 *                        (use the custom-domain origin per [[ADR-009]])
 *      - Events:         ObjectCreated:Put, ObjectCreated:Post
 *      - HTTP Headers:   none (signature header is auto-attached)
 *      - HMAC Secret:    value of SUPABASE_STORAGE_WEBHOOK_SECRET in this app.
 *                        Use `openssl rand -hex 32` to generate.
 *
 *   3. After saving, paste the secret value into `apps/api/.env`
 *      as `SUPABASE_STORAGE_WEBHOOK_SECRET=<value>`. The route returns
 *      503 `webhook_not_configured` when the secret is unset.
 *
 * Supabase Storage signs requests by computing HMAC-SHA256 over the raw
 * request body using the configured secret, and sends the hex digest in
 * the `x-supabase-signature` header. We additionally require the
 * `x-supabase-timestamp` header (ISO-8601) to enforce a replay window.
 *
 * @see {@link https://supabase.com/docs/guides/storage/schema/storage-webhooks}
 *      (link future-proofs — exact path may shift between Supabase versions)
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import { type PhotoFinalizeWebhook, photoFinalizeWebhookSchema } from '@factivist/shared/validators'
import { ExifStripError } from './exif-strip.ts'
import { acceptUpload, type UploadEnv } from './upload.ts'

/**
 * Replay-window for the `x-supabase-timestamp` header. Five minutes is the
 * tightest band that still tolerates a webhook retry burst from Supabase's
 * side (their default retry policy is 30s/60s/300s with full jitter).
 */
export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000

/**
 * Header carrying the HMAC-SHA256 hex digest of the raw request body.
 *
 * Lowercase per HTTP/2 spec — Hono normalises header names to lowercase
 * on access, so all comparisons in this module work in lowercase.
 */
export const SIGNATURE_HEADER = 'x-supabase-signature'

/**
 * Header carrying the event's ISO-8601 timestamp. Used for the replay
 * window check. NOT covered by the signature — Supabase signs the body,
 * not the headers, so a signature replay is what the timestamp prevents.
 */
export const TIMESTAMP_HEADER = 'x-supabase-timestamp'

/**
 * Typed error codes surfaced from `processStorageWebhook`. Route handlers
 * map these onto HTTP status codes:
 *
 *   - BAD_SIGNATURE       → 401
 *   - REPLAY_REJECTED     → 401
 *   - INVALID_PAYLOAD     → 400
 *   - BUCKET_MISMATCH     → 400 (defensive — should never happen if dashboard
 *                                 webhook is scoped to a single bucket)
 *   - IGNORED_EVENT       → 200 (intentional — not all events finalize)
 *   - FETCH_FAILED        → 502
 *   - STRIP_FAILED        → 422
 *   - PERSIST_FAILED      → 500
 */
export type WebhookErrorCode =
  | 'BAD_SIGNATURE'
  | 'REPLAY_REJECTED'
  | 'INVALID_PAYLOAD'
  | 'BUCKET_MISMATCH'
  | 'IGNORED_EVENT'
  | 'FETCH_FAILED'
  | 'STRIP_FAILED'
  | 'PERSIST_FAILED'

export class StorageWebhookError extends Error {
  constructor(
    message: string,
    readonly code: WebhookErrorCode,
    /** Carry the underlying ExifStripError code when STRIP_FAILED. */
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'StorageWebhookError'
  }
}

/**
 * Persistence hook injected by the route handler. The webhook lib does NOT
 * import `@factivist/db` directly — keeping it Drizzle-free means tests
 * exercise the orchestration without a Postgres dependency, and a future
 * migration to a job-queue model (where the webhook just enqueues a job)
 * can swap the implementation without touching this module.
 *
 * Contract:
 *   - Called AFTER stripExif + re-upload succeed.
 *   - MUST be idempotent — Supabase's at-least-once delivery means the same
 *     `objectKey` will arrive again on retry.
 *   - MUST resolve the complaint via the slug portion of the objectKey.
 *   - Returns `false` when no matching complaint exists (orphan upload);
 *     the route treats this as a 200 — the re-encoded object is still in
 *     Storage and the bucket's GC lifecycle cleans up orphans after 24h.
 */
export type FinalizePersistFn = (params: {
  readonly slug: string
  readonly photoId: string
  readonly publicUrl: string
}) => Promise<{ readonly persisted: boolean }>

/**
 * Fetcher contract — pulls the raw bytes for a given object key from
 * Supabase Storage. Injected for testability; production callers wrap the
 * service-role REST endpoint here.
 */
export type StorageFetchFn = (objectKey: string) => Promise<Uint8Array>

export interface ProcessWebhookInput {
  readonly rawBody: string
  readonly signatureHeader: string | undefined
  readonly timestampHeader: string | undefined
  readonly secret: string
  readonly uploadEnv: UploadEnv
  readonly fetchObject: StorageFetchFn
  readonly persist: FinalizePersistFn
  /** Override the wall clock — tests pin time; prod uses `Date.now`. */
  readonly now?: () => number
}

export interface FinalizeResult {
  readonly publicUrl: string
  readonly bytes: number
  readonly outputMime: 'image/jpeg' | 'image/png'
  readonly persisted: boolean
}

/**
 * Verify the HMAC-SHA256 signature on the raw request body.
 *
 * Uses `timingSafeEqual` against a fixed-length buffer to avoid leaking the
 * secret through response-time variance. Length-mismatched inputs are
 * rejected outright — `timingSafeEqual` throws on unequal lengths.
 */
export const verifySignature = (rawBody: string, signature: string, secret: string): boolean => {
  // Normalise: Supabase historically prepended `sha256=` in some versions.
  const provided = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'))
  } catch {
    return false
  }
}

/**
 * Parse the object key into `<slug>/<photoId>` parts. The Zod schema
 * already enforces the shape; this helper exists so the route handler
 * can re-use the parsing logic without re-running the schema.
 */
export const parseObjectKey = (objectKey: string): { slug: string; photoId: string } => {
  const slash = objectKey.indexOf('/')
  return {
    slug: objectKey.slice(0, slash),
    photoId: objectKey.slice(slash + 1),
  }
}

/**
 * End-to-end webhook processor. Pure orchestration — no Hono coupling, so
 * the route handler stays a thin wrapper and tests cover the wire format
 * + the orchestration in two distinct surfaces.
 *
 * Order of operations matters:
 *   1. Signature check FIRST — never spend CPU on an unsigned body.
 *   2. Timestamp window — cheap reject before JSON parse.
 *   3. JSON + Zod parse.
 *   4. Bucket check.
 *   5. Event-kind filter (Delete events surface as IGNORED_EVENT).
 *   6. Fetch raw bytes.
 *   7. `acceptUpload` (which runs `stripExif`).
 *   8. Persist hook.
 */
export const processStorageWebhook = async (
  input: ProcessWebhookInput,
): Promise<FinalizeResult> => {
  const { rawBody, signatureHeader, timestampHeader, secret, uploadEnv, fetchObject, persist } =
    input
  const now = (input.now ?? Date.now)()

  if (!signatureHeader || signatureHeader.trim().length === 0) {
    throw new StorageWebhookError('signature header missing', 'BAD_SIGNATURE')
  }
  if (!verifySignature(rawBody, signatureHeader, secret)) {
    throw new StorageWebhookError('signature mismatch', 'BAD_SIGNATURE')
  }

  if (!timestampHeader || timestampHeader.trim().length === 0) {
    throw new StorageWebhookError('timestamp header missing', 'REPLAY_REJECTED')
  }
  const eventMs = Date.parse(timestampHeader)
  if (Number.isNaN(eventMs)) {
    throw new StorageWebhookError('timestamp header unparseable', 'REPLAY_REJECTED')
  }
  if (Math.abs(now - eventMs) > WEBHOOK_REPLAY_WINDOW_MS) {
    throw new StorageWebhookError('timestamp outside replay window', 'REPLAY_REJECTED')
  }

  let payload: PhotoFinalizeWebhook
  try {
    const json = JSON.parse(rawBody) as unknown
    payload = photoFinalizeWebhookSchema.parse(json)
  } catch (err) {
    throw new StorageWebhookError(
      `payload invalid: ${err instanceof Error ? err.message : String(err)}`,
      'INVALID_PAYLOAD',
    )
  }

  if (payload.bucket !== uploadEnv.bucket) {
    throw new StorageWebhookError(
      `bucket mismatch — got ${payload.bucket}, expected ${uploadEnv.bucket}`,
      'BUCKET_MISMATCH',
    )
  }

  if (payload.event === 'ObjectRemoved:Delete') {
    // Not a finalize trigger — we surface this so the route can return
    // 200 + ignored=true without persisting anything.
    throw new StorageWebhookError(`event ignored: ${payload.event}`, 'IGNORED_EVENT')
  }

  let raw: Uint8Array
  try {
    raw = await fetchObject(payload.objectKey)
  } catch (err) {
    throw new StorageWebhookError(
      `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      'FETCH_FAILED',
    )
  }

  const { slug, photoId } = parseObjectKey(payload.objectKey)
  let accepted: Awaited<ReturnType<typeof acceptUpload>>
  try {
    accepted = await acceptUpload({
      env: uploadEnv,
      slug,
      photoId,
      raw: Buffer.from(raw),
      inputMime: payload.mimeType,
    })
  } catch (err) {
    if (err instanceof ExifStripError) {
      throw new StorageWebhookError(`exif strip failed: ${err.message}`, 'STRIP_FAILED', err.code)
    }
    throw new StorageWebhookError(
      `acceptUpload failed: ${err instanceof Error ? err.message : String(err)}`,
      'STRIP_FAILED',
    )
  }

  let persistResult: Awaited<ReturnType<FinalizePersistFn>>
  try {
    persistResult = await persist({ slug, photoId, publicUrl: accepted.publicUrl })
  } catch (err) {
    throw new StorageWebhookError(
      `persist failed: ${err instanceof Error ? err.message : String(err)}`,
      'PERSIST_FAILED',
    )
  }

  return {
    publicUrl: accepted.publicUrl,
    bytes: accepted.bytes,
    outputMime: accepted.outputMime,
    persisted: persistResult.persisted,
  }
}

/**
 * Read the webhook secret. Returns `undefined` when unset so the route can
 * cleanly return 503 `webhook_not_configured` without throwing.
 */
export const readWebhookSecret = (env: NodeJS.ProcessEnv = process.env): string | undefined => {
  const v = env.SUPABASE_STORAGE_WEBHOOK_SECRET
  return v && v.length > 0 ? v : undefined
}
