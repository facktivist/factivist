import { describe, expect, it } from 'vitest'

import { createId } from '../_helpers.ts'

describe('createId', () => {
  it('generates an ID with the configured prefix', () => {
    const gen = createId('usr')
    const id = gen()
    expect(id.startsWith('usr_')).toBe(true)
  })

  it('appends an RFC 4122 UUID after the underscore', () => {
    const gen = createId('org')
    const id = gen()
    const uuid = id.slice('org_'.length)
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('produces unique values on each call', () => {
    const gen = createId('doc')
    const ids = new Set([gen(), gen(), gen(), gen(), gen()])
    expect(ids.size).toBe(5)
  })

  it('isolates prefixes across generators', () => {
    const userGen = createId('usr')
    const orgGen = createId('org')
    expect(userGen().startsWith('usr_')).toBe(true)
    expect(orgGen().startsWith('org_')).toBe(true)
  })

  it('rejects an empty prefix', () => {
    expect(() => createId('')).toThrow(/non-empty string/)
  })

  it('rejects a prefix with an underscore', () => {
    expect(() => createId('us_r')).toThrow(/lowercase alphanumerics/)
  })

  it('rejects a prefix with uppercase characters', () => {
    expect(() => createId('Usr')).toThrow(/lowercase alphanumerics/)
  })

  it('rejects a prefix with special characters', () => {
    expect(() => createId('usr-1')).toThrow(/lowercase alphanumerics/)
  })

  it('accepts alphanumeric prefixes', () => {
    const gen = createId('v2usr')
    expect(gen().startsWith('v2usr_')).toBe(true)
  })
})
