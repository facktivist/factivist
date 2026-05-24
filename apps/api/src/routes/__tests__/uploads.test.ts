import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /uploads/photo/sign` + `POST /uploads/photo/finalize` tests.
 *
 * Mocks the upload + storage-webhook libs so we exercise the route handler
 * in isolation (env-check, auth-header validation, Zod boundary, error
 * envelope, webhook signature → status mapping).
 */

const issueUploadTokenMock = vi.fn()
const readUploadEnvMock = vi.fn()
const processStorageWebhookMock = vi.fn()
const readWebhookSecretMock = vi.fn()

class UploadConfigErrorMock extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadConfigError'
  }
}

class StorageWebhookErrorMock extends Error {
  constructor(
    message: string,
    readonly code:
      | 'BAD_SIGNATURE'
      | 'REPLAY_REJECTED'
      | 'INVALID_PAYLOAD'
      | 'BUCKET_MISMATCH'
      | 'IGNORED_EVENT'
      | 'FETCH_FAILED'
      | 'STRIP_FAILED'
      | 'PERSIST_FAILED',
    readonly detail?: string,
  ) {
    super(message)
    this.name = 'StorageWebhookError'
  }
}

vi.mock('../../lib/upload.ts', () => ({
  issueUploadToken: issueUploadTokenMock,
  readUploadEnv: readUploadEnvMock,
  UploadConfigError: UploadConfigErrorMock,
}))

vi.mock('../../lib/storage-webhook.ts', () => ({
  processStorageWebhook: processStorageWebhookMock,
  readWebhookSecret: readWebhookSecretMock,
  SIGNATURE_HEADER: 'x-supabase-signature',
  TIMESTAMP_HEADER: 'x-supabase-timestamp',
  StorageWebhookError: StorageWebhookErrorMock,
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
    processStorageWebhookMock.mockReset()
    readWebhookSecretMock.mockReset()
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

describe('POST /uploads/photo/finalize', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    issueUploadTokenMock.mockReset()
    readUploadEnvMock.mockReset()
    processStorageWebhookMock.mockReset()
    readWebhookSecretMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const goodHeaders = {
    'content-type': 'application/json',
    'x-supabase-signature': 'abc123',
    'x-supabase-timestamp': '2026-05-24T12:00:00.000Z',
  }
  const goodBody = JSON.stringify({
    event: 'ObjectCreated:Put',
    bucket: 'complaint-photos',
    objectKey: 'pothole-mg-7k3a/photo-1',
    mimeType: 'image/jpeg',
    size: 1024,
    eventTimestamp: '2026-05-24T12:00:00.000Z',
  })

  it('returns 503 webhook_not_configured when secret env is unset', async () => {
    readWebhookSecretMock.mockReturnValue(undefined)
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('WEBHOOK_CONFIG')
  })

  it('returns 503 upload_not_configured when upload env is unset', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockImplementation(() => {
      throw new UploadConfigErrorMock('upload missing')
    })
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('UPLOAD_CONFIG')
  })

  it('rethrows non-UploadConfigError sync errors from readUploadEnv', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockImplementation(() => {
      throw new Error('boom')
    })
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(500)
  })

  it('returns 200 with publicUrl on happy path', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockResolvedValue({
      publicUrl: 'https://cdn/complaint-photos/slug/pid',
      bytes: 42,
      outputMime: 'image/jpeg',
      persisted: true,
    })
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { publicUrl: string; persisted: boolean }
    expect(body.publicUrl).toBe('https://cdn/complaint-photos/slug/pid')
    expect(body.persisted).toBe(true)
  })

  it('returns 401 on BAD_SIGNATURE', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(
      new StorageWebhookErrorMock('sig bad', 'BAD_SIGNATURE'),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string; error: string }
    expect(body.code).toBe('BAD_SIGNATURE')
    expect(body.error).toBe('bad_signature')
  })

  it('returns 401 on REPLAY_REJECTED', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(
      new StorageWebhookErrorMock('old', 'REPLAY_REJECTED'),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('REPLAY_REJECTED')
  })

  it('returns 400 on INVALID_PAYLOAD', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(
      new StorageWebhookErrorMock('zod fail', 'INVALID_PAYLOAD'),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('INVALID_PAYLOAD')
  })

  it('returns 400 on BUCKET_MISMATCH', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(
      new StorageWebhookErrorMock('wrong bucket', 'BUCKET_MISMATCH'),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('BUCKET_MISMATCH')
  })

  it('returns 200 + ignored=true on IGNORED_EVENT', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(
      new StorageWebhookErrorMock('delete', 'IGNORED_EVENT'),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ignored: boolean; code: string }
    expect(body.ignored).toBe(true)
    expect(body.code).toBe('IGNORED_EVENT')
  })

  it('returns 502 on FETCH_FAILED', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(new StorageWebhookErrorMock('504', 'FETCH_FAILED'))
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(502)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('FETCH_FAILED')
  })

  it('returns 422 on STRIP_FAILED with exifCode in detail', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(
      new StorageWebhookErrorMock('strip', 'STRIP_FAILED', 'UNSUPPORTED_MIME'),
    )
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { code: string; exifCode: string }
    expect(body.code).toBe('STRIP_FAILED')
    expect(body.exifCode).toBe('UNSUPPORTED_MIME')
  })

  it('returns 500 on PERSIST_FAILED', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(new StorageWebhookErrorMock('db', 'PERSIST_FAILED'))
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PERSIST_FAILED')
  })

  it('rethrows non-StorageWebhookError throws from processStorageWebhook', async () => {
    readWebhookSecretMock.mockReturnValue('secret')
    readUploadEnvMock.mockReturnValue({
      storageUrl: 'https://x',
      serviceRoleKey: 's',
      bucket: 'complaint-photos',
      publicBase: 'https://cdn',
    })
    processStorageWebhookMock.mockRejectedValue(new Error('unexpected'))
    const { createApp } = await import('../../app.ts')
    const res = await createApp().request('/uploads/photo/finalize', {
      method: 'POST',
      headers: goodHeaders,
      body: goodBody,
    })
    // Hono converts the unhandled throw to 500.
    expect(res.status).toBe(500)
  })
})

/**
 * Direct unit tests for the default fetcher + persist factories that the
 * route uses in production. The route-handler tests above mock
 * `processStorageWebhook` end-to-end, so these factories need their own
 * coverage path. Both are exported solely for this purpose.
 */
describe('buildDefaultFetcher / buildDefaultPersist', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    issueUploadTokenMock.mockReset()
    readUploadEnvMock.mockReset()
    processStorageWebhookMock.mockReset()
    readWebhookSecretMock.mockReset()
  })
  it('buildDefaultFetcher returns bytes on 200', async () => {
    const { buildDefaultFetcher } = await import('../uploads.ts')
    const fetchMock = vi.fn(
      async () => new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 }),
    ) as unknown as typeof fetch
    const fetcher = buildDefaultFetcher(
      {
        storageUrl: 'https://s',
        serviceRoleKey: 'srk',
        bucket: 'b',
        publicBase: 'https://cdn',
      },
      fetchMock,
    )
    const out = await fetcher('slug/pid')
    expect(out).toEqual(new Uint8Array([1, 2, 3]))
    const [calledUrl, calledInit] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(calledUrl).toBe('https://s/storage/v1/object/b/slug/pid')
    expect((calledInit as RequestInit).method).toBe('GET')
    expect(((calledInit as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer srk',
    )
  })

  it('buildDefaultFetcher throws on non-OK response', async () => {
    const { buildDefaultFetcher } = await import('../uploads.ts')
    const fetchMock = vi.fn(
      async () => new Response('not found', { status: 404 }),
    ) as unknown as typeof fetch
    const fetcher = buildDefaultFetcher(
      {
        storageUrl: 'https://s',
        serviceRoleKey: 'srk',
        bucket: 'b',
        publicBase: 'https://cdn',
      },
      fetchMock,
    )
    await expect(fetcher('slug/pid')).rejects.toThrow(/Storage fetch failed: 404/)
  })

  it('buildDefaultPersist throws when DATABASE_URL is unset', async () => {
    const { buildDefaultPersist } = await import('../uploads.ts')
    // biome-ignore lint/suspicious/noExplicitAny: dbFactory not invoked here
    const persist = buildDefaultPersist(() => ({}) as any, {} as NodeJS.ProcessEnv)
    await expect(persist({ slug: 'x', photoId: 'p', publicUrl: 'https://cdn/x' })).rejects.toThrow(
      /DATABASE_URL not set/,
    )
  })

  it('buildDefaultPersist returns persisted=true when the update affects a row', async () => {
    const { buildDefaultPersist } = await import('../uploads.ts')
    // Drizzle's fluent chain — return ourselves until `.returning()`, which
    // resolves to the array of updated rows.
    const chain = {
      set: () => chain,
      where: () => chain,
      returning: async () => [{ slug: 'x' }],
    }
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const dbFactory = vi.fn(() => ({ update: () => chain }) as any)
    const persist = buildDefaultPersist(dbFactory, {
      DATABASE_URL: 'postgres://x',
    } as NodeJS.ProcessEnv)
    const out = await persist({ slug: 'x', photoId: 'p', publicUrl: 'https://cdn/x' })
    expect(out.persisted).toBe(true)
    expect(dbFactory).toHaveBeenCalledWith('postgres://x')
  })

  it('buildDefaultPersist returns persisted=false when no rows match', async () => {
    const { buildDefaultPersist } = await import('../uploads.ts')
    const chain = {
      set: () => chain,
      where: () => chain,
      returning: async () => [],
    }
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const dbFactory = vi.fn(() => ({ update: () => chain }) as any)
    const persist = buildDefaultPersist(dbFactory, {
      DATABASE_URL: 'postgres://x',
    } as NodeJS.ProcessEnv)
    const out = await persist({ slug: 'x', photoId: 'p', publicUrl: 'https://cdn/x' })
    expect(out.persisted).toBe(false)
  })
})
