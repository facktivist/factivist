import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { _internals, buildVault, writeVault } from '../export/obsidian.ts'
import { buildSnapshot } from '../ingest/index.ts'

import { createFixtureRoot, sampleSpec } from './_fixtures.ts'

const findByPath = (vault: { path: string; body: string }[], path: string) =>
  vault.find((f) => f.path === path)

describe('buildVault', () => {
  it('emits one file per package, file, and symbol, plus an index', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    const indexCount = 1
    const expected =
      indexCount + snapshot.packages.length + snapshot.files.length + snapshot.symbols.length
    expect(vault.length).toBe(expected)
    expect(findByPath(vault, 'index.md')).toBeDefined()
  })

  it('renders package files with depends-on and consumed-by wiki-links', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    const db = findByPath(vault, 'packages/db.md')
    expect(db).toBeDefined()
    expect(db?.body).toContain('type: package')
    expect(db?.body).toContain('[[packages/shared]]') // depends on shared
    expect(db?.body).toContain('[[apps/api]]') // consumed by api
  })

  it('renders file pages with imports, imported-by, and defines sections', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    const file = findByPath(vault, 'packages/db/src/index.ts.md')
    expect(file).toBeDefined()
    expect(file?.body).toMatch(/## Imports/)
    expect(file?.body).toMatch(/## Imported by/)
    expect(file?.body).toMatch(/## Defines/)
    expect(file?.body).toContain('[[packages/shared/src/index.ts]]')
  })

  it('renders symbol files keyed by the # form', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    const repo = vault.find((f) => f.path.includes('Repo.md'))
    expect(repo).toBeDefined()
    expect(repo?.body).toMatch(/type: symbol/)
    expect(repo?.body).toContain('[[packages/db/src/index.ts')
  })

  it('produces empty-state strings when a section has no entries', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    const shared = findByPath(vault, 'packages/shared.md')
    expect(shared?.body).toMatch(/_\(no internal dependencies\)_/)
  })

  it('orders files deterministically across runs', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const first = buildVault(snapshot).map((f) => f.path)
    const second = buildVault(snapshot).map((f) => f.path)
    expect(first).toEqual(second)
    // Locale-compare ordering — the same one the exporter uses internally.
    const expected = [...first].sort((a, b) => a.localeCompare(b))
    expect(first).toEqual(expected)
  })
})

describe('buildVault — wider fixtures', () => {
  it('sorts multiple incoming imports and multiple symbols deterministically', async () => {
    const root = await createFixtureRoot({
      rootManifest: { name: 'r', workspaces: ['p/*'] },
      packages: [
        {
          path: 'p/shared',
          manifest: { name: '@x/shared', exports: { '.': './src/index.ts' } },
          files: [
            {
              path: 'src/index.ts',
              content: 'export const a = 1\nexport const b = 2\nexport function go() {}\n',
            },
          ],
        },
        {
          path: 'p/a',
          manifest: { name: '@x/a', dependencies: { '@x/shared': 'workspace:*' } },
          files: [
            { path: 'src/index.ts', content: "import { a } from '@x/shared'\nexport const z = 1" },
          ],
        },
        {
          path: 'p/b',
          manifest: { name: '@x/b', dependencies: { '@x/shared': 'workspace:*' } },
          files: [
            { path: 'src/index.ts', content: "import { b } from '@x/shared'\nexport const y = 1" },
          ],
        },
      ],
    })
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    const sharedFile = findByPath(vault, 'p/shared/src/index.ts.md')
    expect(sharedFile).toBeDefined()
    // Two inbound imports — comparator runs.
    expect(sharedFile?.body).toContain('[[p/a/src/index.ts]]')
    expect(sharedFile?.body).toContain('[[p/b/src/index.ts]]')
    // Three exported symbols — comparator runs.
    expect(sharedFile?.body.match(/codegraph\/symbol/g)).toBeNull()
    expect(sharedFile?.body).toMatch(/\(const\)/)
    expect(sharedFile?.body).toMatch(/\(function\)/)
  })
})

describe('writeVault', () => {
  it('writes every file to disk under the given root', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'cg-vault-'))
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    const vault = buildVault(snapshot)
    await writeVault(tmp, vault)
    const top = await readdir(tmp)
    expect(top.length).toBeGreaterThan(0)
    const indexBody = await readFile(join(tmp, 'index.md'), 'utf8')
    expect(indexBody).toMatch(/Factivist code KG/)
  })

  it('clean: true wipes pre-existing files before writing', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'cg-vault-clean-'))
    await writeVault(tmp, [{ path: 'stale.md', body: 'stale' }])
    const root = await createFixtureRoot(sampleSpec())
    const snapshot = await buildSnapshot(root)
    await writeVault(tmp, buildVault(snapshot), { clean: true })
    const top = await readdir(tmp)
    expect(top).not.toContain('stale.md')
  })
})

describe('internals', () => {
  it('wikiLink emits [[id]] or [[id|label]]', () => {
    expect(_internals.wikiLink('a/b')).toBe('[[a/b]]')
    expect(_internals.wikiLink('a/b', 'B')).toBe('[[a/b|B]]')
  })

  it('sanitizeForFs replaces colons with double underscores', () => {
    expect(_internals.sanitizeForFs('namespace:thing')).toBe('namespace__thing')
  })

  it('frontmatter renders sorted scalar and list keys', () => {
    const yaml = _internals.frontmatter({ b: 1, a: 'hi', tags: ['z', 'a'] })
    const lines = yaml.split('\n')
    expect(lines[0]).toBe('---')
    expect(lines.at(-1)).toBe('---')
    const aIdx = lines.findIndex((l) => l.startsWith('a:'))
    const bIdx = lines.findIndex((l) => l.startsWith('b:'))
    const tIdx = lines.indexOf('tags:')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(tIdx)
    // tags list is sorted alphabetically
    expect(lines.slice(tIdx + 1, tIdx + 3)).toEqual(['  - a', '  - z'])
  })

  it('frontmatter emits an empty list literal', () => {
    expect(_internals.frontmatter({ tags: [] })).toContain('tags: []')
  })
})
