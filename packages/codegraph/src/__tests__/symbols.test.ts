import { describe, expect, it } from 'vitest'
import { discoverFiles } from '../ingest/files.ts'
import { discoverSymbols, extractSymbols } from '../ingest/symbols.ts'
import { discoverPackages } from '../ingest/workspaces.ts'
import { createFixtureRoot, sampleSpec } from './_fixtures.ts'

const fakeFile = {
  id: 'a.ts',
  path: 'a.ts',
  packageId: 'p',
  ext: '.ts',
  loc: 1,
  contentHash: 'h',
}

describe('extractSymbols', () => {
  it('finds class/function/interface/type/const/enum declarations', () => {
    const source = [
      'export class A {}',
      'export function b() {}',
      'export interface C {}',
      'export type D = number',
      'export const e = 1',
      'export enum F { x }',
    ].join('\n')
    const names = extractSymbols(fakeFile, source).map((s) => `${s.kind}:${s.name}`)
    expect(names).toEqual(['class:A', 'function:b', 'interface:C', 'type:D', 'const:e', 'enum:F'])
  })

  it('treats let/var as const-kind for the export surface', () => {
    const symbols = extractSymbols(fakeFile, 'export let x = 1\nexport var y = 2\n')
    expect(symbols.every((s) => s.kind === 'const')).toBe(true)
  })

  it('de-duplicates repeated names', () => {
    const symbols = extractSymbols(fakeFile, 'export const a = 1\nexport function a() {}')
    expect(symbols).toHaveLength(1)
  })

  it('skips non-exported declarations', () => {
    const symbols = extractSymbols(fakeFile, 'const private_ = 1\nfunction hidden() {}')
    expect(symbols).toEqual([])
  })

  it('treats unknown kinds as const via the KIND_MAP fallback', async () => {
    const { _internals } = await import('../ingest/symbols.ts')
    expect(_internals.KIND_MAP.const).toBe('const')
    expect(_internals.KIND_MAP.let).toBe('const')
  })

  it('handles default-exported declarations', () => {
    const symbols = extractSymbols(
      fakeFile,
      'export default class A {}\nexport default function b() {}',
    )
    expect(symbols.map((s) => s.name).sort()).toEqual(['A', 'b'])
  })

  it('handles async function exports', () => {
    const symbols = extractSymbols(fakeFile, 'export async function go() {}')
    expect(symbols).toEqual([
      { id: 'a.ts#go', name: 'go', kind: 'function', fileId: 'a.ts', exported: true },
    ])
  })

  it('buildSymbolId joins fileId and name with #', async () => {
    const { _internals } = await import('../ingest/symbols.ts')
    expect(_internals.buildSymbolId('a/b.ts', 'X')).toBe('a/b.ts#X')
  })

  it('discoverSymbols silently skips files that fail to read', async () => {
    const { discoverSymbols } = await import('../ingest/symbols.ts')
    const result = await discoverSymbols('/tmp/codegraph-no-such-root', [
      {
        id: 'absent.ts',
        path: 'absent.ts',
        packageId: 'p',
        ext: '.ts',
        loc: 1,
        contentHash: 'h',
      },
    ])
    expect(result).toEqual([])
  })
})

describe('discoverSymbols', () => {
  it('produces sorted, IDed symbols across all files', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const { packages } = await discoverPackages(root)
    const allFiles = (await Promise.all(packages.map((p) => discoverFiles(root, p)))).flat()
    const symbols = await discoverSymbols(root, allFiles)
    expect(symbols.length).toBeGreaterThan(0)
    const ids = symbols.map((s) => s.id)
    expect([...ids].sort()).toEqual(ids)
    expect(ids).toContain('packages/db/src/index.ts#Repo')
  })
})
