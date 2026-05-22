/**
 * Extract import edges from source files.
 *
 * We use a focused regex scan rather than the TypeScript compiler API. The
 * compiler is correct but pulls in ~30MB of types per process and adds ~5s
 * to CI ingest on a monorepo this size. The regex matches:
 *
 *   - `import X from 'spec'`
 *   - `import { x } from 'spec'`
 *   - `import 'spec'`
 *   - `import type { x } from 'spec'`
 *   - `export { x } from 'spec'`
 *   - dynamic `import('spec')`
 *
 * Commented-out imports are tolerated as false positives because the cost is
 * one extra edge in the graph, not an incorrect result. If the false-positive
 * rate becomes a problem, swap the implementation here — the public contract
 * (input file path → list of specifiers) stays the same.
 */

import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import type { FileNode, ImportEdge, PackageNode } from '../types.ts'

interface RawImport {
  specifier: string
  isTypeOnly: boolean
}

const IMPORT_RE = /(?:^|\s)import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/gm
const EXPORT_FROM_RE = /(?:^|\s)export\s+(?:type\s+)?[\w*{}\s,]+\s+from\s+['"]([^'"]+)['"]/gm
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gm
const TYPE_PREFIX_RE = /import\s+type/

const extractImports = (source: string): RawImport[] => {
  const results: RawImport[] = []
  // Each regex above has exactly one mandatory capture group, so m[1] is
  // always present whenever matchAll yields a match — we can assert it.
  for (const m of source.matchAll(IMPORT_RE)) {
    const spec = m[1] as string
    const start = m.index ?? 0
    const head = source.slice(Math.max(0, start), start + m[0].length)
    results.push({ specifier: spec, isTypeOnly: TYPE_PREFIX_RE.test(head) })
  }
  for (const m of source.matchAll(EXPORT_FROM_RE)) {
    results.push({ specifier: m[1] as string, isTypeOnly: false })
  }
  for (const m of source.matchAll(DYNAMIC_RE)) {
    results.push({ specifier: m[1] as string, isTypeOnly: false })
  }
  return results
}

const EXT_CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx']

const tryResolve = async (candidate: string, files: Set<string>): Promise<string | undefined> => {
  if (files.has(candidate)) return candidate
  for (const ext of EXT_CANDIDATES) {
    const withExt = candidate + ext
    if (files.has(withExt)) return withExt
  }
  return undefined
}

const resolveRelative = async (
  root: string,
  fromFile: string,
  specifier: string,
  files: Set<string>,
): Promise<string | undefined> => {
  const fromAbs = join(root, fromFile)
  const targetAbs = resolve(dirname(fromAbs), specifier)
  if (!targetAbs.startsWith(`${root}${sep}`)) return undefined
  const targetRel = relative(root, targetAbs).split(sep).join('/')
  // Strip any explicit extension to let `tryResolve` try the candidates.
  const stripped = targetRel.replace(/\.(ts|tsx)$/, '')
  return tryResolve(stripped, files)
}

/**
 * Find the entry-point file for a workspace package by reading its
 * `package.json` `exports['.']` or `main` field, then resolving to a real
 * file. We deliberately resolve only the root export; deeper subpaths
 * (`@factivist/db/schema`) are tracked as package edges but not file edges
 * to avoid duplicating Drizzle barrel layouts in the graph.
 */
const resolvePackageEntry = async (
  root: string,
  pkg: PackageNode,
  files: Set<string>,
): Promise<string | undefined> => {
  const manifestPath = join(root, pkg.path, 'package.json')
  let manifest: { exports?: unknown; main?: string }
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    return undefined
  }
  let entry: string | undefined
  const exp = manifest.exports
  if (typeof exp === 'object' && exp !== null) {
    const dot = (exp as Record<string, unknown>)['.']
    if (typeof dot === 'string') entry = dot
    else if (typeof dot === 'object' && dot !== null) {
      const obj = dot as Record<string, unknown>
      const candidate = obj.default ?? obj.types
      if (typeof candidate === 'string') entry = candidate
    }
  }
  if (!entry && typeof manifest.main === 'string') entry = manifest.main
  if (!entry) entry = './src/index.ts'
  const absEntry = resolve(join(root, pkg.path), entry)
  const relEntry = relative(root, absEntry).split(sep).join('/')
  const stripped = relEntry.replace(/\.(ts|tsx)$/, '')
  return tryResolve(stripped, files)
}

const isRelative = (spec: string): boolean => spec.startsWith('./') || spec.startsWith('../')
const isAbsoluteSpec = (spec: string): boolean => isAbsolute(spec)

/**
 * Resolve every import edge in `files` to either another file in `files` or
 * to nothing (external dep). Returns only edges whose target is in-graph.
 */
export const discoverImports = async (
  root: string,
  packages: PackageNode[],
  files: FileNode[],
): Promise<ImportEdge[]> => {
  const fileIds = new Set(files.map((f) => f.id))
  const packageEntries = new Map<string, string>()
  for (const pkg of packages) {
    const entry = await resolvePackageEntry(root, pkg, fileIds)
    if (entry) packageEntries.set(pkg.name, entry)
  }
  const edges: ImportEdge[] = []
  for (const file of files) {
    const source = await readFile(join(root, file.id), 'utf8').catch(() => undefined)
    if (source === undefined) continue
    for (const raw of extractImports(source)) {
      let target: string | undefined
      if (isRelative(raw.specifier)) {
        target = await resolveRelative(root, file.id, raw.specifier, fileIds)
      } else if (isAbsoluteSpec(raw.specifier)) {
        continue
      } else {
        // Workspace package import — match exact name or longest scoped prefix.
        let matchKey: string | undefined
        for (const name of packageEntries.keys()) {
          const matches = raw.specifier === name || raw.specifier.startsWith(`${name}/`)
          if (!matches) continue
          if (matchKey === undefined || name.length > matchKey.length) matchKey = name
        }
        if (matchKey) target = packageEntries.get(matchKey)
      }
      if (target && target !== file.id) {
        edges.push({
          fromFileId: file.id,
          toFileId: target,
          specifier: raw.specifier,
          isTypeOnly: raw.isTypeOnly,
        })
      }
    }
  }
  edges.sort(
    (a, b) =>
      a.fromFileId.localeCompare(b.fromFileId) ||
      a.toFileId.localeCompare(b.toFileId) ||
      a.specifier.localeCompare(b.specifier),
  )
  return edges
}

export const _internals = {
  extractImports,
  isRelative,
  resolveRelative,
  resolvePackageEntry,
  tryResolve,
}
