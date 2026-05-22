/**
 * Full ingest pipeline.
 *
 * Orchestrates the four discovery stages — packages, files, imports, symbols
 * — into a single `GraphSnapshot`, then writes that snapshot to Kuzu with
 * batched inserts. Splitting build (pure) from write (effectful) lets tests
 * assert on the snapshot without spinning up Kuzu.
 */

import type { GraphHandle } from '../client.ts'
import type { ContainsEdge, DefinesEdge, FileNode, GraphSnapshot, PackageNode } from '../types.ts'

import { discoverFiles } from './files.ts'
import { discoverImports } from './imports.ts'
import { discoverSymbols } from './symbols.ts'
import { discoverPackages, resolveDependsOnEdges } from './workspaces.ts'

/**
 * Build a `GraphSnapshot` for the workspace rooted at `root` without touching
 * Kuzu. Useful in tests and dry-run modes.
 */
export const buildSnapshot = async (root: string): Promise<GraphSnapshot> => {
  const { packages, dependsOn } = await discoverPackages(root)
  const filesByPackage: FileNode[] = []
  const contains: ContainsEdge[] = []
  for (const pkg of packages) {
    const files = await discoverFiles(root, pkg)
    filesByPackage.push(...files)
    for (const f of files) contains.push({ packageId: pkg.id, fileId: f.id })
  }
  const symbols = await discoverSymbols(root, filesByPackage)
  const defines: DefinesEdge[] = symbols.map((s) => ({ fileId: s.fileId, symbolId: s.id }))
  const imports = await discoverImports(root, packages, filesByPackage)
  const dependsOnEdges = resolveDependsOnEdges(packages, dependsOn)
  return {
    packages,
    files: filesByPackage,
    symbols,
    imports,
    contains,
    defines,
    dependsOn: dependsOnEdges,
    references: [],
  }
}

const escapeString = (s: string): string => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const bool = (b: boolean): string => (b ? 'true' : 'false')

/**
 * Write a `GraphSnapshot` to an open Kuzu connection. Uses Cypher literals
 * (not parameter binding) because the kuzu Node.js prepared-statement API
 * has been a moving target across releases; literal escaping for our limited
 * types (string, int, bool) is safe enough for a CI ingest of internal data.
 */
export const writeSnapshot = async (
  handle: GraphHandle,
  snapshot: GraphSnapshot,
): Promise<void> => {
  const { conn } = handle
  for (const p of snapshot.packages) {
    await conn.query(
      `MERGE (n:Package {id: '${escapeString(p.id)}'}) ` +
        `SET n.name = '${escapeString(p.name)}', ` +
        `n.path = '${escapeString(p.path)}', ` +
        `n.isApp = ${bool(p.isApp)}, ` +
        `n.isPrivate = ${bool(p.isPrivate)}`,
    )
  }
  for (const f of snapshot.files) {
    await conn.query(
      `MERGE (n:File {id: '${escapeString(f.id)}'}) ` +
        `SET n.path = '${escapeString(f.path)}', ` +
        `n.packageId = '${escapeString(f.packageId)}', ` +
        `n.ext = '${escapeString(f.ext)}', ` +
        `n.loc = ${f.loc}, ` +
        `n.contentHash = '${escapeString(f.contentHash)}'`,
    )
  }
  for (const s of snapshot.symbols) {
    await conn.query(
      `MERGE (n:Symbol {id: '${escapeString(s.id)}'}) ` +
        `SET n.name = '${escapeString(s.name)}', ` +
        `n.kind = '${escapeString(s.kind)}', ` +
        `n.fileId = '${escapeString(s.fileId)}', ` +
        `n.exported = ${bool(s.exported)}`,
    )
  }
  for (const e of snapshot.contains) {
    await conn.query(
      `MATCH (p:Package {id: '${escapeString(e.packageId)}'}), (f:File {id: '${escapeString(e.fileId)}'}) ` +
        `MERGE (p)-[:CONTAINS]->(f)`,
    )
  }
  for (const e of snapshot.dependsOn) {
    await conn.query(
      `MATCH (a:Package {id: '${escapeString(e.fromPackageId)}'}), ` +
        `(b:Package {id: '${escapeString(e.toPackageId)}'}) ` +
        `MERGE (a)-[:DEPENDS_ON]->(b)`,
    )
  }
  for (const e of snapshot.imports) {
    await conn.query(
      `MATCH (a:File {id: '${escapeString(e.fromFileId)}'}), ` +
        `(b:File {id: '${escapeString(e.toFileId)}'}) ` +
        `MERGE (a)-[r:IMPORTS]->(b) ` +
        `SET r.specifier = '${escapeString(e.specifier)}', r.isTypeOnly = ${bool(e.isTypeOnly)}`,
    )
  }
  for (const e of snapshot.defines) {
    await conn.query(
      `MATCH (f:File {id: '${escapeString(e.fileId)}'}), (s:Symbol {id: '${escapeString(e.symbolId)}'}) ` +
        `MERGE (f)-[:DEFINES]->(s)`,
    )
  }
}

/**
 * Stats summary returned by `ingest` — handy for CLI output and CI logs.
 */
export interface IngestStats {
  packages: number
  files: number
  symbols: number
  imports: number
  dependsOn: number
}

const statsOf = (s: GraphSnapshot): IngestStats => ({
  packages: s.packages.length,
  files: s.files.length,
  symbols: s.symbols.length,
  imports: s.imports.length,
  dependsOn: s.dependsOn.length,
})

/**
 * End-to-end: build snapshot, write to Kuzu, return stats.
 *
 * The pure `buildSnapshot` + `writeSnapshot` split lets you skip the second
 * stage in dry-run mode or feed the snapshot into a different store entirely.
 */
export const ingest = async (root: string, handle: GraphHandle): Promise<IngestStats> => {
  const snapshot = await buildSnapshot(root)
  await writeSnapshot(handle, snapshot)
  return statsOf(snapshot)
}

export { discoverFiles, discoverImports, discoverPackages, discoverSymbols, resolveDependsOnEdges }
export const _internals = { escapeString, bool, statsOf }
