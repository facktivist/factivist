import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setSharpForTests } from '../exif-strip.ts'
import {
  acceptUpload,
  issueUploadToken,
  readUploadEnv,
  UploadConfigError,
  type UploadEnv,
} from '../upload.ts'

/**
 * `lib/upload` tests — boundary between the API and Supabase Storage.
 * stripExif() runs before persistence (ADR-0004 + I-COMPL-3) — that ordering
 * is the most important invariant we assert.
 */

const env: UploadEnv = {
  storageUrl: 'https://storage.example.test',
  serviceRoleKey: 'srk-xyz',
  bucket: 'complaint-photos',
  publicBase: 'https://cdn.example.test',
}

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

describe('readUploadEnv', () => {
  it('returns env when all required vars are present', () => {
    const result = readUploadEnv({
      SUPABASE_STORAGE_URL: 'https://x.test',
      SUPABASE_SERVICE_ROLE_KEY: 'srk',
      SUPABASE_PHOTO_BUCKET: 'photos',
      SUPABASE_PHOTO_PUBLIC_BASE: 'https://cdn.test',
    } as NodeJS.ProcessEnv)
    expect(result.storageUrl).toBe('https://x.test')
    expect(result.serviceRoleKey).toBe('srk')
    expect(result.bucket).toBe('photos')
    expect(result.publicBase).toBe('https://cdn.test')
  })

  it('defaults the bucket to "complaint-photos" when unset', () => {
    const result = readUploadEnv({
      SUPABASE_STORAGE_URL: 'https://x.test',
      SUPABASE_SERVICE_ROLE_KEY: 'srk',
      SUPABASE_PHOTO_PUBLIC_BASE: 'https://cdn.test',
    } as NodeJS.ProcessEnv)
    expect(result.bucket).toBe('complaint-photos')
  })

  it('throws UploadConfigError when SUPABASE_STORAGE_URL is missing', () => {
    expect(() =>
      readUploadEnv({
        SUPABASE_SERVICE_ROLE_KEY: 'srk',
        SUPABASE_PHOTO_PUBLIC_BASE: 'https://cdn.test',
      } as NodeJS.ProcessEnv),
    ).toThrow(UploadConfigError)
  })

  it('throws UploadConfigError when SERVICE_ROLE_KEY is missing', () => {
    expect(() =>
      readUploadEnv({
        SUPABASE_STORAGE_URL: 'https://x.test',
        SUPABASE_PHOTO_PUBLIC_BASE: 'https://cdn.test',
      } as NodeJS.ProcessEnv),
    ).toThrow(UploadConfigError)
  })

  it('throws UploadConfigError when PUBLIC_BASE is missing', () => {
    expect(() =>
      readUploadEnv({
        SUPABASE_STORAGE_URL: 'https://x.test',
        SUPABASE_SERVICE_ROLE_KEY: 'srk',
      } as NodeJS.ProcessEnv),
    ).toThrow(UploadConfigError)
  })

  it('UploadConfigError carries the right name', () => {
    const err = new UploadConfigError('x')
    expect(err.name).toBe('UploadConfigError')
  })
})

describe('issueUploadToken', () => {
  it('POSTs to Supabase sign endpoint with the service-role bearer + returns shaped token', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => {
      return new Response(JSON.stringify({ url: 'https://upload.test/u', token: 'tok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch
    const out = await issueUploadToken(env, 'pothole-mg-7k3a', 'photo-1', fetchMock)
    expect(out.uploadUrl).toBe('https://upload.test/u')
    expect(out.token).toBe('tok')
    expect(out.path).toBe('pothole-mg-7k3a/photo-1')
    expect(out.publicUrl).toBe('https://cdn.example.test/complaint-photos/pothole-mg-7k3a/photo-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(calledUrl).toContain(
      '/storage/v1/object/upload/sign/complaint-photos/pothole-mg-7k3a/photo-1',
    )
    expect((calledInit as RequestInit).method).toBe('POST')
    expect(((calledInit as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer srk-xyz',
    )
  })

  it('throws when Supabase returns a non-OK status', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('forbidden', {
          status: 403,
        }),
    ) as unknown as typeof fetch
    await expect(issueUploadToken(env, 'slug', 'pid', fetchMock)).rejects.toThrow(
      /Supabase Storage sign failed: 403/,
    )
  })

  it('throws when the sign response body lacks url/token', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch
    await expect(issueUploadToken(env, 'slug', 'pid', fetchMock)).rejects.toThrow(
      /missing url\/token/,
    )
  })
})

describe('acceptUpload', () => {
  beforeEach(() => {
    mockJpegSharp()
  })
  afterEach(() => {
    __setSharpForTests(undefined)
  })

  it('runs stripExif BEFORE re-uploading and surfaces the public URL', async () => {
    const callOrder: string[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      callOrder.push((init as { method?: string }).method ?? 'GET')
      return new Response('ok', { status: 200 })
    }) as unknown as typeof fetch
    const result = await acceptUpload({
      env,
      slug: 'pothole-mg-7k3a',
      photoId: 'photo-1',
      raw: Buffer.from('original-with-exif'),
      inputMime: 'image/jpeg',
      fetchImpl: fetchMock,
    })
    expect(result.publicUrl).toBe(
      'https://cdn.example.test/complaint-photos/pothole-mg-7k3a/photo-1',
    )
    expect(result.outputMime).toBe('image/jpeg')
    expect(result.bytes).toBeGreaterThan(0)
    expect(callOrder).toEqual(['PUT'])
    // Body was the stripped buffer — not the original.
    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect((init as RequestInit).body?.toString()).toBe('STRIPPED')
    expect(((init as RequestInit).headers as Record<string, string>)['content-type']).toBe(
      'image/jpeg',
    )
    expect(((init as RequestInit).headers as Record<string, string>)['x-upsert']).toBe('true')
  })

  it('throws when the re-upload returns a non-OK status', async () => {
    const fetchMock = vi.fn(
      async () => new Response('bucket policy', { status: 403 }),
    ) as unknown as typeof fetch
    await expect(
      acceptUpload({
        env,
        slug: 'pothole-mg-7k3a',
        photoId: 'photo-1',
        raw: Buffer.from('x'),
        inputMime: 'image/jpeg',
        fetchImpl: fetchMock,
      }),
    ).rejects.toThrow(/Supabase Storage re-upload failed: 403/)
  })

  it('bubbles up stripExif errors (e.g. UNSUPPORTED_MIME)', async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch
    await expect(
      acceptUpload({
        env,
        slug: 'slug',
        photoId: 'pid',
        raw: Buffer.from('x'),
        inputMime: 'application/pdf',
        fetchImpl: fetchMock,
      }),
    ).rejects.toThrow(/Unsupported photo MIME/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to the global fetch when fetchImpl is omitted', async () => {
    const realFetch = globalThis.fetch
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }))
    // biome-ignore lint/suspicious/noExplicitAny: jsdom global has no narrower type
    ;(globalThis as any).fetch = fetchMock
    try {
      const result = await acceptUpload({
        env,
        slug: 'slug',
        photoId: 'pid',
        raw: Buffer.from('x'),
        inputMime: 'image/jpeg',
      })
      expect(result.publicUrl).toContain('cdn.example.test')
      expect(fetchMock).toHaveBeenCalledOnce()
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restore
      ;(globalThis as any).fetch = realFetch
    }
  })
})
