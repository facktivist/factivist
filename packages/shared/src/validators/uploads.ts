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
