import { describe, expect, it } from 'vitest'

import { _internals, discoverFiles } from '../ingest/files.ts'

import { createFixtureRoot, sampleSpec } from './_fixtures.ts'

describe('discoverFiles', () => {
  it('walks all .ts files in a package and assigns IDs relative to root', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const pkg = {
      id: 'packages/db',
      name: '@demo/db',
      path: 'packages/db',
      isApp: false,
      isPrivate: true,
    }
    const files = await discoverFiles(root, pkg)
    expect(files.map((f) => f.path).sort()).toEqual([
      'packages/db/src/index.ts',
      'packages/db/src/internal.ts',
    ])
    for (const f of files) {
      expect(f.contentHash).toMatch(/^[0-9a-f]{40}$/)
      expect(f.loc).toBeGreaterThan(0)
      expect(f.packageId).toBe('packages/db')
    }
  })

  it('skips node_modules and test files', () => {
    expect(_internals.shouldSkipDir('node_modules')).toBe(true)
    expect(_internals.shouldSkipDir('.turbo')).toBe(true)
    expect(_internals.shouldSkipDir('src')).toBe(false)
    expect(_internals.shouldSkipFile('users.test.ts')).toBe(true)
    expect(_internals.shouldSkipFile('users.d.ts')).toBe(true)
    expect(_internals.shouldSkipFile('users.ts')).toBe(false)
  })

  it('countLines returns 0 for empty input and counts newlines otherwise', () => {
    expect(_internals.countLines('')).toBe(0)
    expect(_internals.countLines('a')).toBe(1)
    expect(_internals.countLines('a\nb\nc')).toBe(3)
  })

  it('sha1 produces stable, 40-char hex output', () => {
    expect(_internals.sha1('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })

  it('returns empty list for a missing package directory', async () => {
    const pkg = {
      id: 'packages/missing',
      name: '@demo/missing',
      path: 'packages/missing',
      isApp: false,
      isPrivate: true,
    }
    const files = await discoverFiles('/tmp/codegraph-missing-root', pkg)
    expect(files).toEqual([])
  })

  it('silently skips files whose read fails between walk and read', async () => {
    const { mkdtemp, mkdir, writeFile, chmod, rm } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const root = await mkdtemp(join(tmpdir(), 'cg-unread-file-'))
    const pkgDir = join(root, 'p/src')
    await mkdir(pkgDir, { recursive: true })
    const okPath = join(pkgDir, 'ok.ts')
    const gonePath = join(pkgDir, 'race.ts')
    await writeFile(okPath, 'export const a = 1\n')
    await writeFile(gonePath, 'export const b = 1\n')
    // Make race.ts unreadable so readFile fails inside discoverFiles.
    await chmod(gonePath, 0o000).catch(() => {})
    const files = await discoverFiles(root, {
      id: 'p',
      name: '@x/p',
      path: 'p',
      isApp: false,
      isPrivate: true,
    })
    await chmod(gonePath, 0o644).catch(() => {})
    await rm(root, { recursive: true, force: true }).catch(() => {})
    expect(files.find((f) => f.path === 'p/src/ok.ts')).toBeDefined()
  })

  it('skips entries whose stat fails (transient or broken symlinks)', async () => {
    const { mkdtemp, mkdir, writeFile, symlink } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const root = await mkdtemp(join(tmpdir(), 'cg-broken-'))
    const pkgDir = join(root, 'p/src')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'real.ts'), 'export const r = 1\n')
    await symlink('/tmp/nonexistent-target-codegraph', join(pkgDir, 'broken.ts')).catch(() => {})
    const files = await discoverFiles(root, {
      id: 'p',
      name: '@x/p',
      path: 'p',
      isApp: false,
      isPrivate: true,
    })
    expect(files.map((f) => f.path)).toContain('p/src/real.ts')
  })

  it('skips .test.ts files encountered during a walk', async () => {
    const { mkdtemp, mkdir, writeFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const root = await mkdtemp(join(tmpdir(), 'cg-testfile-'))
    const pkgDir = join(root, 'p/src')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'real.ts'), 'export const r = 1\n')
    await writeFile(join(pkgDir, 'real.test.ts'), 'export const t = 1\n')
    await writeFile(join(pkgDir, 'real.d.ts'), 'export const d: number\n')
    const files = await discoverFiles(root, {
      id: 'p',
      name: '@x/p',
      path: 'p',
      isApp: false,
      isPrivate: true,
    })
    expect(files.map((f) => f.path)).toEqual(['p/src/real.ts'])
  })

  it('skips hidden directories and ignored ext, and walks subdirs', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises')
    const { mkdtemp } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')
    const root = await mkdtemp(join(tmpdir(), 'cg-walk-'))
    const pkgDir = join(root, 'p')
    await mkdir(join(pkgDir, 'src/nested'), { recursive: true })
    await mkdir(join(pkgDir, '.hidden'), { recursive: true })
    await mkdir(join(pkgDir, 'node_modules'), { recursive: true })
    await writeFile(join(pkgDir, 'src/keep.ts'), 'export const k = 1')
    await writeFile(join(pkgDir, 'src/nested/deep.tsx'), 'export const d = 1')
    await writeFile(join(pkgDir, 'src/skip.js'), 'module.exports = 1')
    await writeFile(join(pkgDir, '.hidden/secret.ts'), 'export const s = 1')
    await writeFile(join(pkgDir, 'node_modules/x.ts'), 'export const x = 1')
    const files = await discoverFiles(root, {
      id: 'p',
      name: '@x/p',
      path: 'p',
      isApp: false,
      isPrivate: true,
    })
    expect(files.map((f) => f.path).sort()).toEqual(['p/src/keep.ts', 'p/src/nested/deep.tsx'])
  })
})
