import { describe, expect, it } from 'vitest'

import {
  emailSchema,
  idSchema,
  parseTimestamp,
  slugSchema,
  timestampSchema,
} from '../primitives.ts'

describe('idSchema', () => {
  it('parses a valid UUID v4', () => {
    const id = idSchema.parse('550e8400-e29b-41d4-a716-446655440000')
    expect(id).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('rejects non-UUID strings via safeParse', () => {
    const result = idSchema.safeParse('not-a-uuid')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Must be a valid UUID v4')
    }
  })

  it('throws on parse with invalid input', () => {
    expect(() => idSchema.parse('')).toThrow()
  })
})

describe('emailSchema', () => {
  it('lowercases and trims a valid email', () => {
    const email = emailSchema.parse('  USER@Example.COM  ')
    expect(email).toBe('user@example.com')
  })

  it('rejects malformed emails', () => {
    const result = emailSchema.safeParse('not-an-email')
    expect(result.success).toBe(false)
  })

  it('rejects empty input', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('slugSchema', () => {
  it('accepts a typical slug', () => {
    expect(slugSchema.parse('my-blog-post')).toBe('my-blog-post')
  })

  it('rejects empty strings', () => {
    const result = slugSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Slug cannot be empty')
    }
  })

  it('rejects strings longer than 80 characters', () => {
    const long = 'a'.repeat(81)
    const result = slugSchema.safeParse(long)
    expect(result.success).toBe(false)
  })

  it('rejects uppercase and special chars', () => {
    expect(slugSchema.safeParse('Bad-Slug').success).toBe(false)
    expect(slugSchema.safeParse('bad_slug').success).toBe(false)
  })
})

describe('timestampSchema', () => {
  it('accepts an ISO-8601 timestamp with offset', () => {
    const ts = '2026-05-22T10:00:00.000Z'
    expect(timestampSchema.parse(ts)).toBe(ts)
  })

  it('rejects plain date strings', () => {
    expect(timestampSchema.safeParse('2026-05-22').success).toBe(false)
  })

  it('rejects non-string inputs', () => {
    expect(timestampSchema.safeParse(Date.now()).success).toBe(false)
  })
})

describe('parseTimestamp', () => {
  it('returns a Date for a valid ISO-8601 string', () => {
    const date = parseTimestamp('2026-05-22T10:00:00.000Z')
    expect(date).toBeInstanceOf(Date)
    expect(date.toISOString()).toBe('2026-05-22T10:00:00.000Z')
  })

  it('throws on invalid input', () => {
    expect(() => parseTimestamp('nope')).toThrow()
    expect(() => parseTimestamp(123)).toThrow()
  })
})
