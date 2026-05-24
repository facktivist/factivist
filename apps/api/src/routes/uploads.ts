import { photoSignRequestSchema } from '@factivist/shared/validators'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import {
  issueUploadToken,
  readUploadEnv,
  UploadConfigError,
  type UploadEnv,
} from '../lib/upload.ts'

/**
 * Photo upload sign endpoint — issues a one-shot signed Supabase Storage
 * `PUT` URL so the mobile composer (and, in Pipeline E, the web composer)
 * can resume-uploads via tus-js-client without ever touching the service
 * role key.
 *
 * Why this lives here (not behind Pipeline E):
 *   - The mobile composer can't render a photo step without a signed URL.
 *     Blocking that surface on Pipeline E would mean the mobile complaint
 *     flow ships without photo support — explicitly out-of-scope for S1.
 *   - The boundary is already in `apps/api/src/lib/upload.ts`
 *     (`issueUploadToken` + `acceptUpload`). This route is a thin handler.
 *   - Pipeline E still owns the Storage webhook that calls `acceptUpload`,
 *     the GC lifecycle policy, and the public-bucket policy. We don't
 *     pre-empt any of that here.
 *
 * Auth:
 *   - Phase 5 wave 1 convention — `x-factivist-nullifier` header. The
 *     header must be a syntactically valid nullifier; we don't yet check
 *     it against `citizens.nullifier` (that lands with the session work in
 *     Pipeline F). The signed URL itself is the credential, so token leak
 *     ≠ identity leak.
 *
 * Failure modes:
 *   - Upload env unset → 503 `upload_not_configured`.
 *   - Header missing/invalid → 401 `unauthenticated`.
 *   - Supabase REST sign call fails → 502 `sign_failed`.
 */

const isNullifierHeaderValid = (header: string | undefined): header is string => {
  if (!header) return false
  // Nullifier is a 64-char hex BigInt string per shared validators. Keep this
  // lightweight; the canonical schema lives in @factivist/shared.
  return /^[0-9a-fA-F]{32,80}$/u.test(header)
}

export const uploadsRoute = new Hono().post(
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

export type UploadsRoute = typeof uploadsRoute
