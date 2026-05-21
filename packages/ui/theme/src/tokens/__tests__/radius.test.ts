import { describe, expect, it } from 'vitest'

import { radius } from '../radius.ts'

describe('radius scale', () => {
  it('exposes the canonical key set', () => {
    expect(Object.keys(radius).sort()).toEqual(['full', 'lg', 'md', 'none', 'sm', 'xl'].sort())
  })

  it('named steps (excluding `full`) increase monotonically', () => {
    const ordered: ReadonlyArray<keyof typeof radius> = ['none', 'sm', 'md', 'lg', 'xl']
    for (let i = 1; i < ordered.length; i++) {
      const prevKey = ordered[i - 1] as keyof typeof radius
      const currKey = ordered[i] as keyof typeof radius
      expect(radius[currKey]).toBeGreaterThan(radius[prevKey])
    }
  })

  it('full is the pill sentinel (9999)', () => {
    expect(radius.full).toBe(9999)
  })

  it('none is 0', () => {
    expect(radius.none).toBe(0)
  })
})
