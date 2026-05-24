import { describe, expect, it } from 'vitest'

import {
  photoFinalizeResponseSchema,
  photoFinalizeWebhookSchema,
  photoSignRequestSchema,
  photoSignResponseSchema,
} from '../uploads.ts'

describe('photoSignRequestSchema', () => {
  it('accepts a valid kebab-case slug + uuid-shape photoId', () => {
    const result = photoSignRequestSchema.safeParse({
      slug: 'water-supply-issue-abc123',
      photoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects uppercase characters in slug', () => {
    const result = photoSignRequestSchema.safeParse({
      slug: 'Water-Supply-Issue',
      photoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(false)
  })

  it('rejects too-short slug', () => {
    const result = photoSignRequestSchema.safeParse({
      slug: 'ab',
      photoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(false)
  })

  it('rejects photoId with disallowed punctuation', () => {
    const result = photoSignRequestSchema.safeParse({
      slug: 'valid-slug',
      photoId: 'has spaces in it',
    })
    expect(result.success).toBe(false)
  })

  it('rejects photoId shorter than 8 chars', () => {
    const result = photoSignRequestSchema.safeParse({
      slug: 'valid-slug',
      photoId: 'short',
    })
    expect(result.success).toBe(false)
  })
})

describe('photoSignResponseSchema', () => {
  it('accepts a well-formed token envelope', () => {
    const result = photoSignResponseSchema.safeParse({
      uploadUrl: 'https://example.supabase.co/upload/sign/1',
      token: 'opaque-token',
      path: 'slug/photoId',
      publicUrl: 'https://cdn.factivist.app/photos/slug/photoId',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing token', () => {
    const result = photoSignResponseSchema.safeParse({
      uploadUrl: 'https://example.supabase.co/upload/sign/1',
      token: '',
      path: 'slug/photoId',
      publicUrl: 'https://cdn.factivist.app/photos/slug/photoId',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid public URL', () => {
    const result = photoSignResponseSchema.safeParse({
      uploadUrl: 'https://example.supabase.co/upload/sign/1',
      token: 'opaque-token',
      path: 'slug/photoId',
      publicUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })
})

describe('photoFinalizeWebhookSchema', () => {
  const valid = {
    event: 'ObjectCreated:Put' as const,
    bucket: 'complaint-photos',
    objectKey: 'pothole-mg-7k3a/photo-1',
    mimeType: 'image/jpeg',
    size: 1024,
    eventTimestamp: '2026-05-24T12:00:00.000Z',
  }

  it('accepts a well-formed object-created Put event', () => {
    expect(photoFinalizeWebhookSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts ObjectCreated:Post events', () => {
    expect(
      photoFinalizeWebhookSchema.safeParse({ ...valid, event: 'ObjectCreated:Post' }).success,
    ).toBe(true)
  })

  it('accepts ObjectRemoved:Delete events (handler ignores them)', () => {
    expect(
      photoFinalizeWebhookSchema.safeParse({ ...valid, event: 'ObjectRemoved:Delete' }).success,
    ).toBe(true)
  })

  it('rejects unknown event kinds', () => {
    expect(
      photoFinalizeWebhookSchema.safeParse({ ...valid, event: 'ObjectUpdated:Put' }).success,
    ).toBe(false)
  })

  it('rejects objectKey without a slash', () => {
    expect(
      photoFinalizeWebhookSchema.safeParse({ ...valid, objectKey: 'no-slash-here' }).success,
    ).toBe(false)
  })

  it('rejects uppercase characters in objectKey', () => {
    expect(
      photoFinalizeWebhookSchema.safeParse({ ...valid, objectKey: 'Slug/PhotoId' }).success,
    ).toBe(false)
  })

  it('rejects negative size', () => {
    expect(photoFinalizeWebhookSchema.safeParse({ ...valid, size: -1 }).success).toBe(false)
  })

  it('rejects non-integer size', () => {
    expect(photoFinalizeWebhookSchema.safeParse({ ...valid, size: 1.5 }).success).toBe(false)
  })

  it('rejects unparseable eventTimestamp', () => {
    expect(
      photoFinalizeWebhookSchema.safeParse({ ...valid, eventTimestamp: 'yesterday' }).success,
    ).toBe(false)
  })

  it('preserves unknown extra fields via passthrough', () => {
    const result = photoFinalizeWebhookSchema.safeParse({
      ...valid,
      extra: 'preserved',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as { extra?: string }).extra).toBe('preserved')
    }
  })
})

describe('photoFinalizeResponseSchema', () => {
  it('accepts a well-formed finalize result', () => {
    const result = photoFinalizeResponseSchema.safeParse({
      publicUrl: 'https://cdn.example.test/complaint-photos/slug/pid',
      bytes: 1024,
      outputMime: 'image/jpeg',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unsupported outputMime', () => {
    const result = photoFinalizeResponseSchema.safeParse({
      publicUrl: 'https://cdn.example.test/complaint-photos/slug/pid',
      bytes: 1024,
      outputMime: 'image/heic',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero bytes (must be positive)', () => {
    const result = photoFinalizeResponseSchema.safeParse({
      publicUrl: 'https://cdn.example.test/complaint-photos/slug/pid',
      bytes: 0,
      outputMime: 'image/jpeg',
    })
    expect(result.success).toBe(false)
  })
})
