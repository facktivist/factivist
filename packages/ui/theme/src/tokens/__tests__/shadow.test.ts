import { describe, expect, it } from 'vitest'

import { elevation, shadow } from '../shadow.ts'

describe('shadow tokens', () => {
  it('exposes none, light, medium, strong (in that conceptual order)', () => {
    expect(Object.keys(shadow).sort()).toEqual(['light', 'medium', 'none', 'strong'].sort())
  })

  it('every value is a non-empty string', () => {
    for (const [key, value] of Object.entries(shadow)) {
      expect(typeof value, `shadow.${key}`).toBe('string')
      expect(value.length, `shadow.${key} = "${value}"`).toBeGreaterThan(0)
    }
  })

  it('the `none` sentinel is the explicit transparent shadow', () => {
    expect(shadow.none).toBe('0 0 #0000')
  })
})

describe('elevation tokens', () => {
  it('shares the same key set as shadow', () => {
    expect(Object.keys(elevation).sort()).toEqual(Object.keys(shadow).sort())
  })

  it('values are non-negative integers and strictly increase: none < light < medium < strong', () => {
    expect(elevation.none).toBe(0)
    expect(elevation.light).toBeGreaterThan(elevation.none)
    expect(elevation.medium).toBeGreaterThan(elevation.light)
    expect(elevation.strong).toBeGreaterThan(elevation.medium)
    for (const value of Object.values(elevation)) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})
