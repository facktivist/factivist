import { z } from 'zod'

/**
 * Photo upload sign request — used by `POST /uploads/photo/sign` to issue
 * a one-shot signed Supabase Storage `PUT` URL. The client (mobile or
 * web composer) generates `photoId` locally and references the composer
 * draft via `slug`.
 *
 * Constraints:
 *   - `slug` is the composer's draft slug — lowercase kebab-case, 3-140
 *     chars (matches the server-side slug shape used by `complaints.slug`).
 *   - `photoId` is a caller-generated UUID-shaped string — 8-64 chars,
 *     lowercase alphanumeric + dashes. The signed URL is the credential,
 *     so the photoId need not be cryptographically random.
 */
export const photoSignRequestSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(140)
    .regex(/^[a-z0-9-]+$/u, 'slug must be lowercase kebab-case'),
  photoId: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[a-z0-9-]+$/u, 'photoId must be lowercase alphanumeric or dashes'),
})

export type PhotoSignRequest = z.infer<typeof photoSignRequestSchema>

/**
 * Response envelope returned to the client. Mirrors `UploadToken` from
 * `apps/api/src/lib/upload.ts` (defined separately there to keep the API
 * package decoupled from the public type surface).
 */
export const photoSignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  token: z.string().min(1),
  path: z.string().min(1),
  publicUrl: z.string().url(),
})

export type PhotoSignResponse = z.infer<typeof photoSignResponseSchema>

/**
 * Supabase Storage object-created webhook payload.
 *
 * Supabase emits a JSON body when a Storage object is created/updated. The
 * exact shape varies slightly across Supabase versions — we model the
 * subset Factivist depends on and use `passthrough()` so unrelated keys are
 * preserved without failing validation.
 *
 * Required fields (S1):
 *   - `event`     — must be `'ObjectCreated:Put'` or `'ObjectCreated:Post'`.
 *                   Other events (e.g. `ObjectRemoved:*`) are ignored at the
 *                   route boundary (returns 200 with `{ ignored: true }`).
 *   - `bucket`    — must match `SUPABASE_PHOTO_BUCKET`. Webhooks for any
 *                   other bucket are rejected at the route boundary.
 *   - `objectKey` — `<slug>/<photoId>` layout per `issueUploadToken`.
 *   - `mimeType`  — reported MIME from the client `PUT` (validated again
 *                   inside `stripExif` against `ALLOWED_PHOTO_MIME`).
 *   - `size`      — payload size in bytes; double-checked inside `stripExif`.
 *
 * Anti-replay:
 *   - `eventTimestamp` is an ISO-8601 string. The webhook handler enforces
 *     a ±5 minute window against the server clock. Older or future-dated
 *     events are rejected with 401.
 */
export const photoFinalizeWebhookSchema = z
  .object({
    event: z.enum(['ObjectCreated:Put', 'ObjectCreated:Post', 'ObjectRemoved:Delete']),
    bucket: z.string().min(1),
    objectKey: z
      .string()
      .min(3)
      .max(256)
      .regex(
        /^[a-z0-9-]+\/[a-z0-9-]+$/u,
        'objectKey must be <slug>/<photoId> lowercase kebab-case',
      ),
    mimeType: z.string().min(1).max(128),
    size: z.number().int().nonnegative(),
    eventTimestamp: z.string().datetime({ offset: true }),
  })
  .passthrough()

export type PhotoFinalizeWebhook = z.infer<typeof photoFinalizeWebhookSchema>

/**
 * Response envelope returned to Supabase when the webhook is processed.
 * Supabase ignores the body but Factivist's own tests + tracing rely on it.
 */
export const photoFinalizeResponseSchema = z.object({
  publicUrl: z.string().url(),
  bytes: z.number().int().positive(),
  outputMime: z.enum(['image/jpeg', 'image/png']),
})

export type PhotoFinalizeResponse = z.infer<typeof photoFinalizeResponseSchema>
