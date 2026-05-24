import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /uploads/photo/sign` tests.
 *
 * Mocks the upload library so we exercise the route handler in isolation
 * (env-check, auth-header validation, Zod boundary, error envelope).
 */

const issueUploadTokenMock = vi.fn()
const readUploadEnvMock = vi.fn()

class UploadConfigErrorMock extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadConfigError'
  }
}

vi.mock('../../lib/upload.ts', () => ({
  issueUploadToken: issueUploadTokenMock,
  readUploadEnv: readUploadEnvMock,
  UploadConfigError: UploadConfigErrorMock,
}))

// Uploads route uses a lightweight 32–80 hex check (no `0x` prefix). Keep
// this distinct from `nullifierSchema` (which mandates `0x`-prefix); the
// route's own contract is the one we test here.
const VALID_NULLIFIER = 'a'.repeat(64)
const validBody = { slug: 'pothole-mg-7k3a', photoId: 'a1b2c3d4-e5f6-1234-9999-111111111111' }

describe('POST /uploads/photo/sign', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    issueUploadTokenMock.mockReset()
    readUploadEnvMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 400 on invalid Zod body', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify({ slug: 'X' }),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('BAD_INPUT')
  })

  it('returns 401 when x-factivist-nullifier header is missing', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('UNAUTH')
  })

  it('returns 401 when x-factivist-nullifier is too short', async () => {
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': 'short' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
  })

  it('returns 503 when upload env is not configured', async () => {
    readUploadEnvMock.mockImplementation(() => {
      throw new UploadConfigErrorMock('not configured')
    })
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('UPLOAD_CONFIG')
  })

  it('returns 200 with the upload token on happy path', async () => {
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'b',
      publicBase: 'https://cdn',
    })
    issueUploadTokenMock.mockResolvedValue({
      uploadUrl: 'https://x/upload',
      token: 'tok',
      path: validBody.slug + '/' + validBody.photoId,
      publicUrl: `https://cdn/b/${validBody.slug}/${validBody.photoId}`,
    })
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { token: string; uploadUrl: string }
    expect(body.token).toBe('tok')
    expect(body.uploadUrl).toBe('https://x/upload')
  })

  it('returns 502 when the underlying sign call rejects', async () => {
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'b',
      publicBase: 'https://cdn',
    })
    issueUploadTokenMock.mockRejectedValue(new Error('upstream 502'))
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(502)
    const body = (await res.json()) as { code: string; detail: string }
    expect(body.code).toBe('SIGN_FAILED')
    expect(body.detail).toBe('upstream 502')
  })

  it('502 with detail="unknown" when the thrown value is not an Error', async () => {
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'b',
      publicBase: 'https://cdn',
    })
    issueUploadTokenMock.mockRejectedValue('plain-string')
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(502)
    const body = (await res.json()) as { detail: string }
    expect(body.detail).toBe('unknown')
  })

  it('rethrows non-UploadConfigError sync exceptions from readUploadEnv', async () => {
    readUploadEnvMock.mockImplementation(() => {
      throw new Error('unexpected')
    })
    const { createApp } = await import('../../app.ts')
    // Hono converts unhandled throws to a 500 response by default.
    const res = await createApp().request('/uploads/photo/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-factivist-nullifier': VALID_NULLIFIER },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(500)
  })
})
