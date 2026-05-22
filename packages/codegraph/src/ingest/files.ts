/**
 * Walk each package directory and yield `FileNode`s for ingestable source.
 *
 * We constrain to TypeScript and TSX intentionally. JavaScript files exist in
 * the repo only as config (already excluded) and would muddy the symbol graph
 * with looser typing. JSON/markdown belong in the AGE domain KG, not here.
 */

import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

import type { FileNode, PackageNode } from '../types.ts'

const INCLUDE_EXTS = new Set(['.ts', '.tsx'])

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.expo',
  'coverage',
  '__tests__',
  '__mocks__',
  '.git',
])

const SKIP_FILE_SUFFIXES = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.d.ts']

const shouldSkipDir = (name: string): boolean => SKIP_DIRS.has(name) || name.startsWith('.')

const shouldSkipFile = (name: string): boolean =>
  SKIP_FILE_SUFFIXES.some((suffix) => name.endsWith(suffix))

const walk = async (dir: string, out: string[]): Promise<void> => {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }
  for (const name of entries.sort()) {
    if (shouldSkipDir(name)) continue
    const full = join(dir, name)
    const s = await stat(full).catch(() => undefined)
    if (!s) continue
    if (s.isDirectory()) {
      await walk(full, out)
      continue
    }
    if (!INCLUDE_EXTS.has(extname(name))) continue
    if (shouldSkipFile(name)) continue
    out.push(full)
  }
}

const sha1 = (input: string): string => createHash('sha1').update(input).digest('hex')

const countLines = (source: string): number => {
  if (source.length === 0) return 0
  let n = 1
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) n++
  }
  return n
}

/**
 * Build `FileNode`s for every source file under `pkg.path`.
 *
 * The returned IDs are paths relative to `root`, normalized to forward
 * slashes. This is the join key for all cross-layer references (ruflo causal
 * nodes can store `file:apps/api/src/index.ts` verbatim).
 */
export const discoverFiles = async (root: string, pkg: PackageNode): Promise<FileNode[]> => {
  const pkgRoot = join(root, pkg.path)
  const collected: string[] = []
  await walk(pkgRoot, collected)
  const files: FileNode[] = []
  for (const abs of collected) {
    const rel = relative(root, abs).split(sep).join('/')
    const source = await readFile(abs, 'utf8').catch(() => undefined)
    if (source === undefined) continue
    files.push({
      id: rel,
      path: rel,
      packageId: pkg.id,
      ext: extname(abs),
      loc: countLines(source),
      contentHash: sha1(source),
    })
  }
  return files
}

export const _internals = { countLines, sha1, shouldSkipDir, shouldSkipFile, walk }
