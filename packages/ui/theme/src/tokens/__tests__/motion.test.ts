import { describe, expect, it } from 'vitest'

import { duration, easing, motion } from '../motion.ts'

describe('motion.duration', () => {
  it('exposes fast, base, slow', () => {
    expect(Object.keys(duration).sort()).toEqual(['base', 'fast', 'slow'])
  })

  it('every value is a CSS ms string', () => {
    for (const [key, value] of Object.entries(duration)) {
      expect(value, `duration.${key} = ${value}`).toMatch(/^\d+ms$/)
    }
  })

  it('durations strictly increase: fast < base < slow', () => {
    const numeric = (s: string) => Number(s.replace('ms', ''))
    expect(numeric(duration.fast)).toBeLessThan(numeric(duration.base))
    expect(numeric(duration.base)).toBeLessThan(numeric(duration.slow))
  })
})

describe('motion.easing', () => {
  it('exposes linear, standard, enter, exit', () => {
    expect(Object.keys(easing).sort()).toEqual(['enter', 'exit', 'linear', 'standard'])
  })

  it('non-linear eases are cubic-bezier(...)', () => {
    for (const key of ['standard', 'enter', 'exit'] as const) {
      expect(easing[key], `easing.${key}`).toMatch(/^cubic-bezier\(/)
    }
  })

  it('linear is the literal string "linear"', () => {
    expect(easing.linear).toBe('linear')
  })
})

describe('motion bundle', () => {
  it('groups duration and easing', () => {
    expect(motion.duration).toBe(duration)
    expect(motion.easing).toBe(easing)
  })
})
