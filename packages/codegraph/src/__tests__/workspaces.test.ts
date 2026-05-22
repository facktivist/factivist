import { describe, expect, it } from 'vitest'

import { _internals, discoverPackages, resolveDependsOnEdges } from '../ingest/workspaces.ts'

import { createFixtureRoot, sampleSpec } from './_fixtures.ts'

describe('discoverPackages', () => {
  it('returns each package with stable IDs and isApp flag', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const { packages } = await discoverPackages(root)
    const byName = Object.fromEntries(packages.map((p) => [p.name, p]))
    expect(packages.map((p) => p.id).sort()).toEqual(['apps/api', 'packages/db', 'packages/shared'])
    expect(byName['@demo/api']?.isApp).toBe(true)
    expect(byName['@demo/shared']?.isApp).toBe(false)
    expect(byName['@demo/shared']?.isPrivate).toBe(true)
  })

  it('returns empty when the root manifest is missing', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'no-workspaces' },
      packages: [],
    })
    const { packages, dependsOn } = await discoverPackages(root)
    expect(packages).toEqual([])
    expect(dependsOn.size).toBe(0)
  })

  it('treats object-form workspaces as a packages array', () => {
    const ws = _internals.normalizeWorkspaces({ workspaces: { packages: ['x/*'] } })
    expect(ws).toEqual(['x/*'])
  })

  it('handles a missing/invalid root package.json gracefully', async () => {
    const result = await discoverPackages('/tmp/does-not-exist-codegraph-test')
    expect(result.packages).toEqual([])
  })
})

describe('resolveDependsOnEdges', () => {
  it('emits one edge per internal dependency, sorted', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const { packages, dependsOn } = await discoverPackages(root)
    const edges = resolveDependsOnEdges(packages, dependsOn)
    expect(edges).toEqual([
      { fromPackageId: 'apps/api', toPackageId: 'packages/db' },
      { fromPackageId: 'packages/db', toPackageId: 'packages/shared' },
    ])
  })

  it('drops edges to external packages', () => {
    const packages = [
      { id: 'pkg/a', name: '@demo/a', path: 'pkg/a', isApp: false, isPrivate: true },
    ]
    const deps = new Map([['@demo/a', new Set(['react', 'lodash'])]])
    expect(resolveDependsOnEdges(packages, deps)).toEqual([])
  })
})

describe('workspace internals', () => {
  it('readJson returns undefined on missing files', async () => {
    const result = await _internals.readJson('/tmp/codegraph-missing-file.json')
    expect(result).toBeUndefined()
  })

  it('expandPattern returns the single dir for exact paths', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const dirs = await _internals.expandPattern(root, 'apps/api')
    expect(dirs).toEqual([`${root}/apps/api`])
  })

  it('expandPattern returns [] for missing parents', async () => {
    const dirs = await _internals.expandPattern('/tmp/codegraph-missing', 'sub/*')
    expect(dirs).toEqual([])
  })

  it('expandPattern skips entries that are files, not directories', async () => {
    const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const root = await mkdtemp(join(tmpdir(), 'cg-expand-'))
    await mkdir(join(root, 'items'), { recursive: true })
    await writeFile(join(root, 'items', 'not-a-dir.txt'), 'noop')
    await mkdir(join(root, 'items', 'real-dir'), { recursive: true })
    const dirs = await _internals.expandPattern(root, 'items/*')
    expect(dirs).toEqual([join(root, 'items', 'real-dir')])
  })

  it('isAppPackage distinguishes apps/ and packages/', async () => {
    const root = await createFixtureRoot(sampleSpec())
    expect(_internals.isAppPackage(root, `${root}/apps/api`)).toBe(true)
    expect(_internals.isAppPackage(root, `${root}/packages/db`)).toBe(false)
  })

  it('normalizeWorkspaces returns [] when object form lacks packages key', () => {
    expect(_internals.normalizeWorkspaces({ workspaces: {} })).toEqual([])
  })

  it('normalizeWorkspaces returns [] for missing workspaces field', () => {
    expect(_internals.normalizeWorkspaces({})).toEqual([])
  })

  it('discoverPackages skips workspace members without a name field', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: ['p/*'] },
      packages: [
        { path: 'p/nameless', manifest: { private: true }, files: [] },
        {
          path: 'p/named',
          manifest: { name: '@x/named' },
          files: [{ path: 'src/index.ts', content: 'export const v = 1\n' }],
        },
      ],
    })
    const { packages } = await discoverPackages(root)
    expect(packages.map((p) => p.name)).toEqual(['@x/named'])
  })
})

describe('resolveDependsOnEdges (extra branches)', () => {
  it('handles packages with no recorded dependencies', () => {
    const packages = [{ id: 'p/a', name: '@x/a', path: 'p/a', isApp: false, isPrivate: true }]
    const deps = new Map<string, Set<string>>() // no entry for @x/a
    expect(resolveDependsOnEdges(packages, deps)).toEqual([])
  })
})
