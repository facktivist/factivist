import { describe, expect, it } from 'vitest'

import { compileGlob, firstMatch, globMatches } from '../match.ts'

describe('compileGlob', () => {
  it('treats `*` as single-segment wildcard', () => {
    const re = compileGlob('apps/*/index.ts')
    expect(re.test('apps/web/index.ts')).toBe(true)
    expect(re.test('apps/web/src/index.ts')).toBe(false)
  })

  it('treats `**` as multi-segment wildcard', () => {
    const re = compileGlob('apps/**/page.tsx')
    expect(re.test('apps/web/page.tsx')).toBe(true)
    expect(re.test('apps/web/src/routes/page.tsx')).toBe(true)
  })

  it('treats `?` as single non-slash char', () => {
    const re = compileGlob('file?.ts')
    expect(re.test('fileA.ts')).toBe(true)
    expect(re.test('file/A.ts')).toBe(false)
    expect(re.test('fileAB.ts')).toBe(false)
  })

  it('escapes regex metacharacters in literals', () => {
    const re = compileGlob('file.with+chars[1].ts')
    expect(re.test('file.with+chars[1].ts')).toBe(true)
    expect(re.test('fileXwithXcharsX1X.ts')).toBe(false)
  })
})

describe('globMatches', () => {
  it('handles the `"*"` shorthand as match-anything', () => {
    expect(globMatches('*', 'literally/anything')).toBe(true)
  })

  it('matches literal patterns exactly', () => {
    expect(globMatches('apps/web', 'apps/web')).toBe(true)
    expect(globMatches('apps/web', 'apps/web/extra')).toBe(false)
  })
})

describe('firstMatch', () => {
  it('returns the first matching pattern', () => {
    expect(firstMatch(['apps/api/**', 'apps/web/**'], 'apps/web/x.ts')).toBe('apps/web/**')
  })

  it('returns undefined when nothing matches', () => {
    expect(firstMatch(['apps/api/**'], 'packages/db/x.ts')).toBeUndefined()
  })
})
