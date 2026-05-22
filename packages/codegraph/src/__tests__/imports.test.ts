import { describe, expect, it } from 'vitest'
import { discoverFiles } from '../ingest/files.ts'
import { _internals, discoverImports } from '../ingest/imports.ts'
import { discoverPackages } from '../ingest/workspaces.ts'

import { createFixtureRoot, sampleSpec } from './_fixtures.ts'

describe('extractImports', () => {
  it('catches static, type-only, and dynamic imports', () => {
    const source = `
      import a from 'pkg-a'
      import type { B } from 'pkg-b'
      import 'pkg-side'
      export { C } from './c'
      const mod = await import('./d')
    `
    const specs = _internals
      .extractImports(source)
      .map((r) => r.specifier)
      .sort()
    expect(specs).toEqual(['./c', './d', 'pkg-a', 'pkg-b', 'pkg-side'])
    const typed = _internals.extractImports(source).find((r) => r.specifier === 'pkg-b')
    expect(typed?.isTypeOnly).toBe(true)
  })

  it('returns [] for source without imports', () => {
    expect(_internals.extractImports('const x = 1')).toEqual([])
  })
})

describe('discoverImports (end-to-end)', () => {
  it('resolves relative and workspace specifiers to file IDs', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const { packages } = await discoverPackages(root)
    const allFiles = (await Promise.all(packages.map((p) => discoverFiles(root, p)))).flat()
    const edges = await discoverImports(root, packages, allFiles)
    const apiEdges = edges
      .filter((e) => e.fromFileId === 'apps/api/src/index.ts')
      .map((e) => e.toFileId)
      .sort()
    expect(apiEdges).toContain('packages/db/src/index.ts')
    expect(apiEdges).toContain('apps/api/src/types.ts')
    const dbEdges = edges.filter((e) => e.fromFileId === 'packages/db/src/index.ts')
    expect(dbEdges.find((e) => e.toFileId === 'packages/shared/src/index.ts')).toBeDefined()
    expect(dbEdges.find((e) => e.toFileId === 'packages/db/src/internal.ts')).toBeDefined()
  })
})

describe('imports internals', () => {
  it('isRelative identifies relative paths', () => {
    expect(_internals.isRelative('./x')).toBe(true)
    expect(_internals.isRelative('../x')).toBe(true)
    expect(_internals.isRelative('pkg/x')).toBe(false)
  })

  it('tryResolve handles base, .ts, .tsx, and index variants', async () => {
    const files = new Set(['a/b', 'a/c.ts', 'a/d.tsx', 'a/e/index.ts', 'a/f/index.tsx'])
    expect(await _internals.tryResolve('a/b', files)).toBe('a/b')
    expect(await _internals.tryResolve('a/c', files)).toBe('a/c.ts')
    expect(await _internals.tryResolve('a/d', files)).toBe('a/d.tsx')
    expect(await _internals.tryResolve('a/e', files)).toBe('a/e/index.ts')
    expect(await _internals.tryResolve('a/f', files)).toBe('a/f/index.tsx')
    expect(await _internals.tryResolve('a/missing', files)).toBeUndefined()
  })

  it('resolvePackageEntry falls back to src/index.ts when exports is absent', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: ['p/*'] },
      packages: [
        {
          path: 'p/one',
          manifest: { name: '@x/one' },
          files: [{ path: 'src/index.ts', content: 'export const v = 1\n' }],
        },
      ],
    })
    const { packages } = await discoverPackages(root)
    const files = await discoverFiles(root, packages[0]!)
    const fileIds = new Set(files.map((f) => f.id))
    const entry = await _internals.resolvePackageEntry(root, packages[0]!, fileIds)
    expect(entry).toBe('p/one/src/index.ts')
  })

  it('resolvePackageEntry reads main, the exports default object, and types', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: ['p/*'] },
      packages: [
        {
          path: 'p/m',
          manifest: { name: '@x/m', main: './src/m.ts' },
          files: [{ path: 'src/m.ts', content: 'export const m = 1\n' }],
        },
        {
          path: 'p/d',
          manifest: { name: '@x/d', exports: { '.': { default: './src/d.ts' } } },
          files: [{ path: 'src/d.ts', content: 'export const d = 1\n' }],
        },
        {
          path: 'p/t',
          manifest: { name: '@x/t', exports: { '.': { types: './src/t.ts' } } },
          files: [{ path: 'src/t.ts', content: 'export const t = 1\n' }],
        },
      ],
    })
    const { packages } = await discoverPackages(root)
    const filesAll = (await Promise.all(packages.map((p) => discoverFiles(root, p)))).flat()
    const fileIds = new Set(filesAll.map((f) => f.id))
    const byName = Object.fromEntries(packages.map((p) => [p.name, p]))
    expect(await _internals.resolvePackageEntry(root, byName['@x/m']!, fileIds)).toBe(
      'p/m/src/m.ts',
    )
    expect(await _internals.resolvePackageEntry(root, byName['@x/d']!, fileIds)).toBe(
      'p/d/src/d.ts',
    )
    expect(await _internals.resolvePackageEntry(root, byName['@x/t']!, fileIds)).toBe(
      'p/t/src/t.ts',
    )
  })

  it('resolvePackageEntry returns undefined on missing manifest', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: [] },
      packages: [],
    })
    const entry = await _internals.resolvePackageEntry(
      root,
      { id: 'gone', name: '@gone/x', path: 'gone', isApp: false, isPrivate: true },
      new Set(),
    )
    expect(entry).toBeUndefined()
  })

  it('resolveRelative refuses to escape the workspace root', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const out = await _internals.resolveRelative(
      root,
      'packages/db/src/index.ts',
      '../../../outside',
      new Set([]),
    )
    expect(out).toBeUndefined()
  })

  it('discoverImports prefers the longest matching workspace prefix', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: ['p/*'] },
      packages: [
        {
          path: 'p/scope',
          manifest: { name: '@scope/x', exports: { '.': './src/index.ts' } },
          files: [{ path: 'src/index.ts', content: 'export const a = 1\n' }],
        },
        {
          path: 'p/scope-extra',
          manifest: { name: '@scope/x-extra', exports: { '.': './src/index.ts' } },
          files: [{ path: 'src/index.ts', content: 'export const b = 1\n' }],
        },
        {
          path: 'p/consumer',
          manifest: { name: '@scope/c', exports: { '.': './src/index.ts' } },
          files: [
            {
              path: 'src/index.ts',
              content: `import a from '@scope/x'\nimport b from '@scope/x-extra'\nexport const c = 1\n`,
            },
          ],
        },
      ],
    })
    const { packages } = await discoverPackages(root)
    const files = (await Promise.all(packages.map((p) => discoverFiles(root, p)))).flat()
    const edges = await discoverImports(root, packages, files)
    const consumer = edges.filter((e) => e.fromFileId === 'p/consumer/src/index.ts')
    expect(consumer.find((e) => e.specifier === '@scope/x')?.toFileId).toBe('p/scope/src/index.ts')
    expect(consumer.find((e) => e.specifier === '@scope/x-extra')?.toFileId).toBe(
      'p/scope-extra/src/index.ts',
    )
  })

  it('discoverImports handles unreadable source files gracefully', async () => {
    const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const root = await mkdtemp(join(tmpdir(), 'cg-unread-'))
    await mkdir(join(root, 'p/src'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'r', workspaces: ['p'] }))
    await writeFile(join(root, 'p/package.json'), JSON.stringify({ name: '@x/p' }))
    await writeFile(join(root, 'p/src/index.ts'), 'export const x = 1\n')
    const { packages } = await discoverPackages(root)
    const files = (await Promise.all(packages.map((p) => discoverFiles(root, p)))).flat()
    const phantomFile = {
      id: 'p/src/gone.ts',
      path: 'p/src/gone.ts',
      packageId: 'p',
      ext: '.ts',
      loc: 0,
      contentHash: 'h',
    }
    const edges = await discoverImports(root, packages, [...files, phantomFile])
    expect(edges.find((e) => e.fromFileId === 'p/src/gone.ts')).toBeUndefined()
  })

  it('discoverImports skips absolute and unresolvable specifiers', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: ['p/*'] },
      packages: [
        {
          path: 'p/a',
          manifest: { name: '@x/a', exports: { '.': './src/index.ts' } },
          files: [
            {
              path: 'src/index.ts',
              content: `import '/abs/path'\nimport 'no-such-pkg'\nimport './missing'\nexport const v = 1\n`,
            },
          ],
        },
      ],
    })
    const { packages } = await discoverPackages(root)
    const files = (await Promise.all(packages.map((p) => discoverFiles(root, p)))).flat()
    const edges = await discoverImports(root, packages, files)
    expect(edges).toEqual([])
  })
})
