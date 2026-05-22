/**
 * Discover workspace packages by reading the root `package.json` and walking
 * each glob pattern under `workspaces`. Returns one `PackageNode` per package
 * that has a `package.json` with a `name` field.
 *
 * We deliberately do NOT use `bun pm ls` or shell out — keeping ingest a pure
 * function of the filesystem makes it trivial to test with fixtures.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import type { PackageNode } from '../types.ts'

interface RootManifest {
  workspaces?: string[] | { packages?: string[] }
}

interface PackageManifest {
  name?: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const APP_PARENT = 'apps'

const readJson = async <T>(path: string): Promise<T | undefined> => {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

const normalizeWorkspaces = (manifest: RootManifest): string[] => {
  const ws = manifest.workspaces
  if (!ws) return []
  if (Array.isArray(ws)) return ws
  return ws.packages ?? []
}

/**
 * Expand a single workspace pattern into directory paths.
 *
 * Supports the two patterns Factivist uses: a trailing `/*` for a single
 * level (e.g., `apps/*`) and exact paths. Nested globs are not supported
 * because we don't need them and supporting them would invite mistakes.
 */
const expandPattern = async (root: string, pattern: string): Promise<string[]> => {
  if (!pattern.endsWith('/*')) {
    return [join(root, pattern)]
  }
  const parent = join(root, pattern.slice(0, -2))
  let entries: string[]
  try {
    entries = await readdir(parent)
  } catch {
    return []
  }
  const dirs: string[] = []
  for (const entry of entries.sort()) {
    const full = join(parent, entry)
    const s = await stat(full).catch(() => undefined)
    if (s?.isDirectory()) dirs.push(full)
  }
  return dirs
}

const isAppPackage = (root: string, pkgPath: string): boolean => {
  const rel = relative(root, pkgPath)
  return rel.split(sep)[0] === APP_PARENT
}

/**
 * Build the `name → PackageNode` map for the workspace at `root`.
 *
 * Each entry in `dependsOn` is the list of internal package names the package
 * declares in any of `dependencies`/`devDependencies`/`peerDependencies`. We
 * only track internal edges — external npm deps are not part of the code KG.
 */
export const discoverPackages = async (
  root: string,
): Promise<{ packages: PackageNode[]; dependsOn: Map<string, Set<string>> }> => {
  const rootManifest = await readJson<RootManifest>(join(root, 'package.json'))
  if (!rootManifest) {
    return { packages: [], dependsOn: new Map() }
  }
  const patterns = normalizeWorkspaces(rootManifest)
  const candidates: string[] = []
  for (const p of patterns) {
    candidates.push(...(await expandPattern(root, p)))
  }
  const packages: PackageNode[] = []
  const dependsOn = new Map<string, Set<string>>()
  for (const pkgPath of candidates) {
    const manifest = await readJson<PackageManifest>(join(pkgPath, 'package.json'))
    if (!manifest?.name) continue
    const rel = relative(root, pkgPath).split(sep).join('/')
    packages.push({
      id: rel,
      name: manifest.name,
      path: rel,
      isApp: isAppPackage(root, pkgPath),
      isPrivate: manifest.private === true,
    })
    const edges = new Set<string>()
    for (const block of [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.peerDependencies,
    ]) {
      if (!block) continue
      for (const dep of Object.keys(block)) edges.add(dep)
    }
    dependsOn.set(manifest.name, edges)
  }
  packages.sort((a, b) => a.id.localeCompare(b.id))
  return { packages, dependsOn }
}

/**
 * Resolve `dependsOn` name-edges down to package IDs, dropping any edge whose
 * target is not an internal workspace package. The result is suitable for
 * direct emission into the Kuzu `DEPENDS_ON` rel table.
 */
export const resolveDependsOnEdges = (
  packages: PackageNode[],
  dependsOn: Map<string, Set<string>>,
): { fromPackageId: string; toPackageId: string }[] => {
  const byName = new Map(packages.map((p) => [p.name, p.id]))
  const edges: { fromPackageId: string; toPackageId: string }[] = []
  for (const pkg of packages) {
    const deps = dependsOn.get(pkg.name)
    if (!deps) continue
    for (const dep of [...deps].sort()) {
      const target = byName.get(dep)
      if (target) edges.push({ fromPackageId: pkg.id, toPackageId: target })
    }
  }
  return edges
}

export const _internals = { expandPattern, isAppPackage, normalizeWorkspaces, readJson }
