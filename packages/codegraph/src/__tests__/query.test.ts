import { describe, expect, it } from 'vitest'

import {
  _internals,
  blastRadius,
  detectPackageCycles,
  directDependentsOfFile,
  filesInPackage,
  packageDependents,
  symbolsInFile,
} from '../query/index.ts'

import { createFakeConn } from './_fixtures.ts'

describe('query helpers', () => {
  it('directDependentsOfFile parses string IDs from rows', async () => {
    const conn = createFakeConn([[{ id: 'apps/web/src/page.ts' }, { id: 'apps/api/src/x.ts' }]])
    const result = await directDependentsOfFile(conn, 'packages/shared/src/index.ts')
    expect(result).toEqual(['apps/web/src/page.ts', 'apps/api/src/x.ts'])
    expect(conn.statements[0]).toContain("'packages/shared/src/index.ts'")
  })

  it('blastRadius clamps depth to [1, 10]', async () => {
    const conn = createFakeConn([[]])
    await blastRadius(conn, 'a.ts', 100)
    expect(conn.statements[0]).toContain('IMPORTS*1..10')
  })

  it('blastRadius forwards an in-range depth', async () => {
    const conn = createFakeConn([[]])
    await blastRadius(conn, 'a.ts', 2)
    expect(conn.statements[0]).toContain('IMPORTS*1..2')
  })

  it('packageDependents returns IDs in result order', async () => {
    const conn = createFakeConn([[{ id: 'apps/web' }]])
    expect(await packageDependents(conn, 'packages/shared')).toEqual(['apps/web'])
  })

  it('detectPackageCycles canonicalizes and deduplicates rotations', async () => {
    const conn = createFakeConn([
      [
        { cycle: ['b', 'c', 'a', 'b'] },
        { cycle: ['a', 'b', 'c', 'a'] },
        { cycle: ['c', 'a', 'b', 'c'] },
      ],
    ])
    const cycles = await detectPackageCycles(conn)
    expect(cycles).toEqual([['a', 'b', 'c']])
  })

  it('filesInPackage returns string IDs', async () => {
    const conn = createFakeConn([[{ id: 'packages/shared/src/index.ts' }]])
    expect(await filesInPackage(conn, 'packages/shared')).toEqual(['packages/shared/src/index.ts'])
  })

  it('symbolsInFile returns id/name/kind triples', async () => {
    const conn = createFakeConn([
      [
        { id: 'a.ts#X', name: 'X', kind: 'class' },
        { id: 'a.ts#y', name: 'y', kind: 'function' },
      ],
    ])
    expect(await symbolsInFile(conn, 'a.ts')).toEqual([
      { id: 'a.ts#X', name: 'X', kind: 'class' },
      { id: 'a.ts#y', name: 'y', kind: 'function' },
    ])
  })

  it('drops non-string rows defensively', async () => {
    const conn = createFakeConn([
      [null as unknown as Record<string, unknown>, { id: 42 }, { id: 'ok' }],
    ])
    const result = await directDependentsOfFile(conn, 'x')
    expect(result).toEqual(['ok'])
  })

  it('canonicalizeCycle handles arrays without trailing repeat', () => {
    expect(_internals.canonicalizeCycle(['c', 'a', 'b'])).toEqual(['a', 'b', 'c'])
  })

  it('canonicalizeCycle handles empty input', () => {
    expect(_internals.canonicalizeCycle([])).toEqual([])
  })
})
