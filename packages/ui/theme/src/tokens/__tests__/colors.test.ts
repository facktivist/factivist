import { describe, expect, it } from 'vitest'

import {
  brand,
  COLOR_STEPS,
  type ColorScale,
  colors,
  danger,
  gray,
  info,
  success,
  warning,
} from '../colors.ts'

/** Strict oklch literal: `oklch(L C H)` where L∈[0,1], C≥0, H∈[0,360). */
const OKLCH_REGEX = /^oklch\(\s*(0?\.\d+|0|1(?:\.0+)?)\s+(0?\.\d+|0)\s+(\d{1,3}(?:\.\d+)?)\s*\)$/

const SCALES: ReadonlyArray<readonly [string, ColorScale]> = [
  ['gray', gray],
  ['brand', brand],
  ['success', success],
  ['warning', warning],
  ['danger', danger],
  ['info', info],
]

describe('COLOR_STEPS', () => {
  it('contains exactly the 11 canonical steps in ascending order', () => {
    expect([...COLOR_STEPS]).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ])
  })
})

describe('color scales', () => {
  it.each(SCALES)('%s defines every required step', (_name, scale) => {
    for (const step of COLOR_STEPS) {
      expect(scale, `missing step ${step}`).toHaveProperty(step)
      expect(typeof scale[step]).toBe('string')
    }
  })

  it.each(SCALES)('%s has exactly 11 keys (no extras, no gaps)', (_name, scale) => {
    expect(Object.keys(scale)).toHaveLength(COLOR_STEPS.length)
  })

  it.each(SCALES)('%s emits valid oklch(...) strings at every step', (_name, scale) => {
    for (const step of COLOR_STEPS) {
      const value = scale[step]
      expect(value, `${_name}.${step} = ${value}`).toMatch(OKLCH_REGEX)
    }
  })
})

describe('brand canonical hue', () => {
  it('brand 500 is exactly oklch(0.55 0.20 250)', () => {
    expect(brand['500']).toBe('oklch(0.55 0.20 250)')
  })

  it('every brand step uses hue 250', () => {
    for (const step of COLOR_STEPS) {
      const match = OKLCH_REGEX.exec(brand[step])
      expect(match, `brand.${step} did not match regex`).not.toBeNull()
      const hue = Number(match?.[3])
      expect(hue).toBe(250)
    }
  })
})

describe('lightness ladder', () => {
  it.each(SCALES)('%s L decreases monotonically from 50 → 950', (_name, scale) => {
    const lightnessValues = COLOR_STEPS.map((step) => {
      const match = OKLCH_REGEX.exec(scale[step])
      return Number(match?.[1])
    })
    for (let i = 1; i < lightnessValues.length; i++) {
      const prev = lightnessValues[i - 1] as number
      const curr = lightnessValues[i] as number
      expect(curr).toBeLessThan(prev)
    }
  })
})

describe('colors registry', () => {
  it('exposes exactly the six canonical scales', () => {
    expect(Object.keys(colors).sort()).toEqual(
      ['brand', 'danger', 'gray', 'info', 'success', 'warning'].sort(),
    )
  })
})

describe('info canonical hue', () => {
  it('every info step uses hue 220 (distinct from brand hue 250)', () => {
    for (const step of COLOR_STEPS) {
      const match = OKLCH_REGEX.exec(info[step])
      expect(match, `info.${step} did not match regex`).not.toBeNull()
      const hue = Number(match?.[3])
      expect(hue).toBe(220)
    }
  })
})
