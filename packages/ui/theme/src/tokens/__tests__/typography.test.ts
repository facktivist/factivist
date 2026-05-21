import { describe, expect, it } from 'vitest'

import { fontSize, fontWeight, lineHeight, typography } from '../typography.ts'

describe('fontSize', () => {
  it('every value is a positive integer (px)', () => {
    for (const [key, value] of Object.entries(fontSize)) {
      expect(Number.isInteger(value), `fontSize[${key}] = ${value}`).toBe(true)
      expect(value).toBeGreaterThan(0)
    }
  })

  it('scale steps strictly increase in declaration order', () => {
    const values = Object.values(fontSize)
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1] as number
      const curr = values[i] as number
      expect(curr).toBeGreaterThan(prev)
    }
  })

  it('base equals 16 (browser default)', () => {
    expect(fontSize.base).toBe(16)
  })
})

describe('lineHeight', () => {
  it('shares the same key set as fontSize (no orphan keys)', () => {
    expect(Object.keys(lineHeight).sort()).toEqual(Object.keys(fontSize).sort())
  })

  it('every value is between 1 and 2', () => {
    for (const [key, value] of Object.entries(lineHeight)) {
      expect(value, `lineHeight[${key}] = ${value}`).toBeGreaterThanOrEqual(1)
      expect(value, `lineHeight[${key}] = ${value}`).toBeLessThanOrEqual(2)
    }
  })
})

describe('fontWeight', () => {
  it('exposes regular, medium, semibold, bold', () => {
    expect(fontWeight).toEqual({
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    })
  })

  it('values are valid CSS font-weight integers (100..900, step 100)', () => {
    for (const value of Object.values(fontWeight)) {
      expect(value % 100).toBe(0)
      expect(value).toBeGreaterThanOrEqual(100)
      expect(value).toBeLessThanOrEqual(900)
    }
  })
})

describe('typography bundle', () => {
  it('groups fontSize, lineHeight, fontWeight', () => {
    expect(typography.fontSize).toBe(fontSize)
    expect(typography.lineHeight).toBe(lineHeight)
    expect(typography.fontWeight).toBe(fontWeight)
  })
})
