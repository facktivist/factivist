import { describe, expect, it } from 'vitest'

import { darkSemantic, lightSemantic, Themes } from '../index.ts'

describe('semantic tokens', () => {
  it('light and dark expose identical key sets (no drift)', () => {
    expect(Object.keys(lightSemantic).sort()).toEqual(Object.keys(darkSemantic).sort())
  })

  it('exposes the full canonical semantic vocabulary', () => {
    const required = [
      // core surface / text
      'background',
      'foreground',
      'surface',
      'surfaceElevated',
      'text',
      'textMuted',
      'textOnBrand',
      // card (HeroUI-compat)
      'card',
      'cardForeground',
      // brand / primary
      'brand',
      'brandText',
      'primary',
      'primaryForeground',
      // secondary / muted / accent
      'secondary',
      'secondaryForeground',
      'muted',
      'mutedForeground',
      'accent',
      'accentForeground',
      // status: danger
      'destructive',
      'destructiveForeground',
      'dangerBg',
      'dangerText',
      // status: success / warning / info
      'successBg',
      'successText',
      'warningBg',
      'warningText',
      'infoBg',
      'infoText',
      // borders / inputs / focus ring
      'border',
      'borderStrong',
      'input',
      'ring',
    ].sort()
    expect(Object.keys(lightSemantic).sort()).toEqual(required)
  })

  it('every light value resolves to an oklch(...) string', () => {
    for (const [key, value] of Object.entries(lightSemantic)) {
      expect(value, `lightSemantic.${key} = ${value}`).toMatch(/^oklch\(/)
    }
  })

  it('every dark value resolves to an oklch(...) string', () => {
    for (const [key, value] of Object.entries(darkSemantic)) {
      expect(value, `darkSemantic.${key} = ${value}`).toMatch(/^oklch\(/)
    }
  })

  it('light vs dark differ on at least one role (background)', () => {
    expect(lightSemantic.background).not.toBe(darkSemantic.background)
  })
})

describe('Themes registry', () => {
  it('contains exactly { light, dark }', () => {
    expect(Object.keys(Themes).sort()).toEqual(['dark', 'light'])
  })

  it('Themes.light points at lightSemantic and Themes.dark at darkSemantic', () => {
    expect(Themes.light).toBe(lightSemantic)
    expect(Themes.dark).toBe(darkSemantic)
  })
})
