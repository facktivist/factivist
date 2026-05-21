import { describe, expect, it } from 'vitest'

import { space } from '../space.ts'

describe('space scale', () => {
  it('every value is a non-negative integer multiple of 2', () => {
    for (const [key, value] of Object.entries(space)) {
      expect(Number.isInteger(value), `space[${key}] = ${value}`).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value % 2, `space[${key}] = ${value}`).toBe(0)
    }
  })

  it('every step except 0.5 and 1.5 is a multiple of 4 (4px grid compliance)', () => {
    for (const [key, value] of Object.entries(space)) {
      if (key === '0.5' || key === '1.5') continue
      expect(value % 4, `space[${key}] = ${value} is not 4-grid aligned`).toBe(0)
    }
  })

  it('the 0.5 step equals 2 (the only sub-grid value, by design)', () => {
    expect(space[0.5]).toBe(2)
  })

  it('numeric keys are strictly increasing', () => {
    const keys = Object.keys(space)
      .map(Number)
      .sort((a, b) => a - b)
    for (let i = 1; i < keys.length; i++) {
      const prev = keys[i - 1] as number
      const curr = keys[i] as number
      expect(curr).toBeGreaterThan(prev)
    }
  })

  it('contains the required canonical steps', () => {
    const values: readonly number[] = Object.values(space)
    for (const required of [0, 2, 4, 8, 16, 24, 32, 48, 64, 96]) {
      expect(values.includes(required), `space scale missing ${required}`).toBe(true)
    }
  })
})
