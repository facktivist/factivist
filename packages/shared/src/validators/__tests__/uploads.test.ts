import { describe, expect, it } from 'vitest'

import { photoSignRequestSchema, photoSignResponseSchema } from '../uploads.ts'

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
