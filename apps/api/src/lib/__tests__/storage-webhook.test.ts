import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setSharpForTests, ExifStripError } from '../exif-strip.ts'
import {
  type FinalizePersistFn,
  parseObjectKey,
  processStorageWebhook,
  readWebhookSecret,
  type StorageFetchFn,
  StorageWebhookError,
  verifySignature,
  WEBHOOK_REPLAY_WINDOW_MS,
} from '../storage-webhook.ts'
import type { UploadEnv } from '../upload.ts'

/**
 * `lib/storage-webhook` tests — covers HMAC verification, replay window,
 * payload validation, error-code mapping, and the orchestration order
 * (signature → timestamp → parse → bucket → event → fetch → strip → persist).
 */

const SECRET = 'shhhhh-this-is-a-test-secret'
const env: UploadEnv = {
  storageUrl: 'https://storage.example.test',
  serviceRoleKey: 'srk-xyz',
  bucket: 'complaint-photos',
  publicBase: 'https://cdn.example.test',
}

const sign = (body: string, secret: string = SECRET): string =>
  createHmac('sha256', secret).update(body).digest('hex')

const mockJpegSharp = () => {
  const factory = (_input: Buffer) => {
    const pipeline = {
      metadata: async () => ({ format: 'jpeg' as const }),
      rotate: () => pipeline,
      withMetadata: () => pipeline,
      jpeg: () => pipeline,
      png: () => pipeline,
      toBuffer: async () => Buffer.from('STRIPPED'),
    }
    return pipeline
  }
  __setSharpForTests(factory as unknown as Parameters<typeof __setSharpForTests>[0])
}

const NOW_ISO = '2026-05-24T12:00:00.000Z'
const NOW_MS = Date.parse(NOW_ISO)
const validPayload = {
  event: 'ObjectCreated:Put' as const,
  bucket: env.bucket,
  objectKey: 'pothole-mg-7k3a/photo-1',
  mimeType: 'image/jpeg',
  size: 12345,
  eventTimestamp: NOW_ISO,
}

const buildPersist = (out: { persisted: boolean } = { persisted: true }): FinalizePersistFn =>
  vi.fn(async () => out) as unknown as FinalizePersistFn

const buildFetcher = (bytes: Uint8Array = new Uint8Array([1, 2, 3])): StorageFetchFn =>
  vi.fn(async () => bytes) as unknown as StorageFetchFn

describe('verifySignature', () => {
  it('returns true for a valid HMAC-SHA256 hex digest', () => {
    const body = '{"hello":"world"}'
    expect(verifySignature(body, sign(body), SECRET)).toBe(true)
  })

  it('returns true when the provided digest carries a sha256= prefix', () => {
    const body = '{"hello":"world"}'
    expect(verifySignature(body, `sha256=${sign(body)}`, SECRET)).toBe(true)
  })

  it('returns false when the body is tampered', () => {
    const body = '{"hello":"world"}'
    const sig = sign(body)
    expect(verifySignature('{"hello":"WORLD"}', sig, SECRET)).toBe(false)
  })

  it('returns false when the secret is wrong', () => {
    const body = '{"hello":"world"}'
    expect(verifySignature(body, sign(body, 'wrong-secret'), SECRET)).toBe(false)
  })

  it('returns false when signature length mismatches', () => {
    expect(verifySignature('body', 'abcd', SECRET)).toBe(false)
  })

  it('returns false when timingSafeEqual throws on bad input', () => {
    // Force buffers of equal length but obviously different content.
    const body = 'body'
    const fakeSig = 'z'.repeat(64)
    expect(verifySignature(body, fakeSig, SECRET)).toBe(false)
  })
})

describe('parseObjectKey', () => {
  it('splits <slug>/<photoId> on the first slash', () => {
    expect(parseObjectKey('water-issue-9xyz/photo-1')).toEqual({
      slug: 'water-issue-9xyz',
      photoId: 'photo-1',
    })
  })
})

describe('readWebhookSecret', () => {
  it('returns the secret when set', () => {
    expect(readWebhookSecret({ SUPABASE_STORAGE_WEBHOOK_SECRET: 'x' } as NodeJS.ProcessEnv)).toBe(
      'x',
    )
  })
  it('returns undefined when unset', () => {
    expect(readWebhookSecret({} as NodeJS.ProcessEnv)).toBeUndefined()
  })
  it('returns undefined when empty', () => {
    expect(
      readWebhookSecret({ SUPABASE_STORAGE_WEBHOOK_SECRET: '' } as NodeJS.ProcessEnv),
    ).toBeUndefined()
  })
})

describe('processStorageWebhook', () => {
  beforeEach(() => {
    mockJpegSharp()
  })
  afterEach(() => {
    __setSharpForTests(undefined)
  })

  const goodInput = () => {
    const rawBody = JSON.stringify(validPayload)
    return {
      rawBody,
      signatureHeader: sign(rawBody),
      timestampHeader: NOW_ISO,
      secret: SECRET,
      uploadEnv: env,
      fetchObject: buildFetcher(),
      persist: buildPersist(),
      now: () => NOW_MS,
    }
  }

  it('happy path: strips EXIF, re-uploads, persists, returns publicUrl', async () => {
    // acceptUpload re-uploads via fetch — stub global fetch.
    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    const realFetch = (globalThis as any).fetch
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    ;(globalThis as any).fetch = fetchSpy
    try {
      const out = await processStorageWebhook(goodInput())
      expect(out.publicUrl).toBe(
        'https://cdn.example.test/complaint-photos/pothole-mg-7k3a/photo-1',
      )
      expect(out.outputMime).toBe('image/jpeg')
      expect(out.bytes).toBeGreaterThan(0)
      expect(out.persisted).toBe(true)
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).fetch = realFetch
    }
  })

  it('rejects with BAD_SIGNATURE when signature header missing', async () => {
    const i = goodInput()
    await expect(processStorageWebhook({ ...i, signatureHeader: undefined })).rejects.toMatchObject(
      { code: 'BAD_SIGNATURE' },
    )
  })

  it('rejects with BAD_SIGNATURE when signature header is whitespace', async () => {
    const i = goodInput()
    await expect(processStorageWebhook({ ...i, signatureHeader: '   ' })).rejects.toMatchObject({
      code: 'BAD_SIGNATURE',
    })
  })

  it('rejects with BAD_SIGNATURE when signature mismatches', async () => {
    const i = goodInput()
    await expect(
      processStorageWebhook({ ...i, signatureHeader: 'a'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'BAD_SIGNATURE' })
  })

  it('rejects with REPLAY_REJECTED when timestamp header missing', async () => {
    const i = goodInput()
    await expect(processStorageWebhook({ ...i, timestampHeader: undefined })).rejects.toMatchObject(
      { code: 'REPLAY_REJECTED' },
    )
  })

  it('rejects with REPLAY_REJECTED when timestamp is unparseable', async () => {
    const i = goodInput()
    await expect(
      processStorageWebhook({ ...i, timestampHeader: 'not-a-date' }),
    ).rejects.toMatchObject({ code: 'REPLAY_REJECTED' })
  })

  it('rejects with REPLAY_REJECTED when timestamp is outside the window (past)', async () => {
    const i = goodInput()
    const tooOld = new Date(NOW_MS - WEBHOOK_REPLAY_WINDOW_MS - 1).toISOString()
    await expect(processStorageWebhook({ ...i, timestampHeader: tooOld })).rejects.toMatchObject({
      code: 'REPLAY_REJECTED',
    })
  })

  it('rejects with REPLAY_REJECTED when timestamp is outside the window (future)', async () => {
    const i = goodInput()
    const tooNew = new Date(NOW_MS + WEBHOOK_REPLAY_WINDOW_MS + 1).toISOString()
    // Re-sign because timestamp is in body too.
    const newBody = JSON.stringify({ ...validPayload, eventTimestamp: tooNew })
    await expect(
      processStorageWebhook({
        ...i,
        rawBody: newBody,
        signatureHeader: sign(newBody),
        timestampHeader: tooNew,
      }),
    ).rejects.toMatchObject({ code: 'REPLAY_REJECTED' })
  })

  it('rejects with INVALID_PAYLOAD on malformed JSON', async () => {
    const i = goodInput()
    const rawBody = '{not json'
    await expect(
      processStorageWebhook({
        ...i,
        rawBody,
        signatureHeader: sign(rawBody),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' })
  })

  it('rejects with INVALID_PAYLOAD on Zod failure', async () => {
    const i = goodInput()
    const rawBody = JSON.stringify({ event: 'ObjectCreated:Put' }) // missing fields
    await expect(
      processStorageWebhook({
        ...i,
        rawBody,
        signatureHeader: sign(rawBody),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' })
  })

  it('rejects with BUCKET_MISMATCH when bucket differs', async () => {
    const rawBody = JSON.stringify({ ...validPayload, bucket: 'other-bucket' })
    await expect(
      processStorageWebhook({
        ...goodInput(),
        rawBody,
        signatureHeader: sign(rawBody),
      }),
    ).rejects.toMatchObject({ code: 'BUCKET_MISMATCH' })
  })

  it('returns IGNORED_EVENT for ObjectRemoved:Delete', async () => {
    const rawBody = JSON.stringify({ ...validPayload, event: 'ObjectRemoved:Delete' })
    await expect(
      processStorageWebhook({
        ...goodInput(),
        rawBody,
        signatureHeader: sign(rawBody),
      }),
    ).rejects.toMatchObject({ code: 'IGNORED_EVENT' })
  })

  it('rejects with FETCH_FAILED when the object fetcher throws', async () => {
    const fetcher: StorageFetchFn = vi.fn(async () => {
      throw new Error('upstream 504')
    }) as unknown as StorageFetchFn
    await expect(
      processStorageWebhook({ ...goodInput(), fetchObject: fetcher }),
    ).rejects.toMatchObject({ code: 'FETCH_FAILED' })
  })

  it('rejects with STRIP_FAILED (with exif code) when stripExif throws', async () => {
    // Force exif-strip to bail on MIME — we send PDF in the payload.
    const rawBody = JSON.stringify({ ...validPayload, mimeType: 'application/pdf' })
    try {
      await processStorageWebhook({
        ...goodInput(),
        rawBody,
        signatureHeader: sign(rawBody),
      })
      expect.unreachable('expected STRIP_FAILED')
    } catch (err) {
      expect(err).toBeInstanceOf(StorageWebhookError)
      const e = err as StorageWebhookError
      expect(e.code).toBe('STRIP_FAILED')
      expect(e.detail).toBe('UNSUPPORTED_MIME')
    }
  })

  it('rejects with STRIP_FAILED when acceptUpload throws a non-ExifStripError', async () => {
    // Force re-upload to fail by failing global fetch.
    const fetchSpy = vi.fn(async () => new Response('boom', { status: 500 }))
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    const realFetch = (globalThis as any).fetch
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    ;(globalThis as any).fetch = fetchSpy
    try {
      await expect(processStorageWebhook(goodInput())).rejects.toMatchObject({
        code: 'STRIP_FAILED',
      })
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).fetch = realFetch
    }
  })

  it('rejects with PERSIST_FAILED when the persist hook throws', async () => {
    const persist: FinalizePersistFn = vi.fn(async () => {
      throw new Error('db down')
    }) as unknown as FinalizePersistFn
    // Stub global fetch for the acceptUpload re-upload.
    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    const realFetch = (globalThis as any).fetch
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    ;(globalThis as any).fetch = fetchSpy
    try {
      await expect(processStorageWebhook({ ...goodInput(), persist })).rejects.toMatchObject({
        code: 'PERSIST_FAILED',
      })
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).fetch = realFetch
    }
  })

  it('persisted=false propagates through to the result envelope', async () => {
    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    const realFetch = (globalThis as any).fetch
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    ;(globalThis as any).fetch = fetchSpy
    try {
      const out = await processStorageWebhook({
        ...goodInput(),
        persist: buildPersist({ persisted: false }),
      })
      expect(out.persisted).toBe(false)
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).fetch = realFetch
    }
  })

  it('uses Date.now() when input.now is omitted (smoke)', async () => {
    // Just exercise the default branch — happy path with the real clock.
    const rawBody = JSON.stringify({
      ...validPayload,
      eventTimestamp: new Date().toISOString(),
    })
    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    const realFetch = (globalThis as any).fetch
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    ;(globalThis as any).fetch = fetchSpy
    try {
      const out = await processStorageWebhook({
        rawBody,
        signatureHeader: sign(rawBody),
        timestampHeader: JSON.parse(rawBody).eventTimestamp,
        secret: SECRET,
        uploadEnv: env,
        fetchObject: buildFetcher(),
        persist: buildPersist(),
      })
      expect(out.publicUrl).toContain('cdn.example.test')
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).fetch = realFetch
    }
  })

  it('StorageWebhookError carries name + code + detail', () => {
    const e = new StorageWebhookError('m', 'STRIP_FAILED', 'TOO_LARGE')
    expect(e.name).toBe('StorageWebhookError')
    expect(e.code).toBe('STRIP_FAILED')
    expect(e.detail).toBe('TOO_LARGE')
    // Sanity — ExifStripError still defined separately.
    expect(new ExifStripError('x', 'TOO_LARGE').code).toBe('TOO_LARGE')
  })
})
