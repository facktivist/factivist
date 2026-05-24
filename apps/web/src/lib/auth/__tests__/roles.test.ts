/**
 * Roles enum tests — keep parity with the API-side `ROLES` list.
 *
 * The web side only knows the two operator roles (admin + moderator);
 * `public` is implicit on the web (no session = redirect to `/`).
 */

import { describe, expect, it } from 'vitest'

import { ADMIN_ROLES, isAdminRole } from '../roles.ts'

describe('ADMIN_ROLES', () => {
  it('contains exactly admin + moderator', () => {
    expect(ADMIN_ROLES.slice().sort()).toEqual(['admin', 'moderator'].sort())
  })
})

describe('isAdminRole', () => {
  it('accepts admin + moderator', () => {
    expect(isAdminRole('admin')).toBe(true)
    expect(isAdminRole('moderator')).toBe(true)
  })

  it('rejects public + unknown roles', () => {
    expect(isAdminRole('public')).toBe(false)
    expect(isAdminRole('root')).toBe(false)
    expect(isAdminRole('')).toBe(false)
  })
})
