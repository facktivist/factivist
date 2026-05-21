import { describe, expect, it } from 'vitest'

import { EMAIL_REGEX, SLUG_REGEX, UUID_V4_REGEX } from '../patterns.ts'

describe('UUID_V4_REGEX', () => {
  it.each([
    '550e8400-e29b-41d4-a716-446655440000',
    'F47AC10B-58CC-4372-A567-0E02B2C3D479',
    '00000000-0000-4000-8000-000000000000',
  ])('matches valid v4 UUID %s', (uuid) => {
    expect(UUID_V4_REGEX.test(uuid)).toBe(true)
  })

  it.each([
    '',
    'not-a-uuid',
    '550e8400-e29b-11d4-a716-446655440000', // v1, third group starts with 1
    '550e8400-e29b-41d4-7716-446655440000', // bad variant nibble
    '550e8400e29b41d4a716446655440000', // missing hyphens
  ])('rejects invalid UUID %s', (uuid) => {
    expect(UUID_V4_REGEX.test(uuid)).toBe(false)
  })
})

describe('EMAIL_REGEX', () => {
  it.each([
    'a@b.co',
    'user.name+tag@example.com',
    'first.last@sub.domain.io',
  ])('matches valid email %s', (email) => {
    expect(EMAIL_REGEX.test(email)).toBe(true)
  })

  it.each([
    '',
    'no-at-sign',
    'a@b',
    'spaces in@email.com',
    '@nouser.com',
    'user@',
  ])('rejects invalid email %s', (email) => {
    expect(EMAIL_REGEX.test(email)).toBe(false)
  })
})

describe('SLUG_REGEX', () => {
  it.each([
    'my-post',
    'factivist',
    'factivist-2026',
    'a1-b2-c3',
  ])('matches valid slug %s', (slug) => {
    expect(SLUG_REGEX.test(slug)).toBe(true)
  })

  it.each([
    '',
    '-bad',
    'bad-',
    'Bad-Case',
    'double--hyphen',
    'has space',
    'has_underscore',
  ])('rejects invalid slug %s', (slug) => {
    expect(SLUG_REGEX.test(slug)).toBe(false)
  })
})
