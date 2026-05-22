/**
 * Typed query helpers built on top of an open Kuzu connection.
 *
 * Each helper is a single Cypher statement plus a small parser — we keep the
 * Cypher inline rather than hiding it behind a builder, because (a) the
 * queries are stable, (b) the schema is small, and (c) seeing the Cypher
 * next to the function makes it obvious what the graph is being asked.
 *
 * Pair these with a snapshot built via `buildSnapshot`/`writeSnapshot` from
 * the ingest module; queries against an empty database return `[]`.
 */

import type { GraphConnection } from '../client.ts'

const rows = async (conn: GraphConnection, cypher: string): Promise<unknown[]> => {
  const result = await conn.query(cypher)
  return result.getAll()
}

const escapeCypher = (s: string): string => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const stringField = (row: unknown, field: string): string => {
  if (typeof row !== 'object' || row === null) return ''
  const value = (row as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : ''
}

/**
 * Files that import `fileId` (one hop). Surfaces direct dependents — the
 * "who breaks if I change this" question for a single file.
 */
export const directDependentsOfFile = async (
  conn: GraphConnection,
  fileId: string,
): Promise<string[]> => {
  const cypher =
    `MATCH (a:File)-[:IMPORTS]->(b:File {id: '${escapeCypher(fileId)}'}) ` +
    `RETURN a.id AS id ORDER BY a.id`
  const out = await rows(conn, cypher)
  return out.map((r) => stringField(r, 'id')).filter(Boolean)
}

/**
 * Files reachable backwards through IMPORTS from `fileId`, up to `depth`.
 * Use this for blast-radius analysis: every file that would need re-review
 * if you change the target.
 */
export const blastRadius = async (
  conn: GraphConnection,
  fileId: string,
  depth = 3,
): Promise<string[]> => {
  const safeDepth = Math.max(1, Math.min(10, Math.floor(depth)))
  const cypher =
    `MATCH (a:File)-[:IMPORTS*1..${safeDepth}]->(b:File {id: '${escapeCypher(fileId)}'}) ` +
    `RETURN DISTINCT a.id AS id ORDER BY a.id`
  const out = await rows(conn, cypher)
  return out.map((r) => stringField(r, 'id')).filter(Boolean)
}

/**
 * Packages that depend on `packageId` directly.
 */
export const packageDependents = async (
  conn: GraphConnection,
  packageId: string,
): Promise<string[]> => {
  const cypher =
    `MATCH (a:Package)-[:DEPENDS_ON]->(b:Package {id: '${escapeCypher(packageId)}'}) ` +
    `RETURN a.id AS id ORDER BY a.id`
  const out = await rows(conn, cypher)
  return out.map((r) => stringField(r, 'id')).filter(Boolean)
}

/**
 * Detect cycles in the package dependency graph. Returns each cycle as the
 * list of package IDs along its path. Cycles violate the project's
 * dependency rules (apps → packages, never reverse), so a non-empty result
 * here is a CI failure signal.
 */
export const detectPackageCycles = async (conn: GraphConnection): Promise<string[][]> => {
  const cypher =
    `MATCH path = (a:Package)-[:DEPENDS_ON*2..6]->(a) ` +
    `RETURN [n IN nodes(path) | n.id] AS cycle`
  const out = await rows(conn, cypher)
  const cycles: string[][] = []
  const seen = new Set<string>()
  for (const r of out) {
    if (typeof r !== 'object' || r === null) continue
    const raw = (r as Record<string, unknown>).cycle
    if (!Array.isArray(raw)) continue
    const ids = raw.filter((x): x is string => typeof x === 'string')
    if (ids.length === 0) continue
    const canonical = canonicalizeCycle(ids).join('→')
    if (seen.has(canonical)) continue
    seen.add(canonical)
    cycles.push(canonicalizeCycle(ids))
  }
  return cycles
}

const canonicalizeCycle = (ids: string[]): string[] => {
  // Drop the trailing repeat so cycles read as [a, b, c] not [a, b, c, a].
  const trimmed = ids[0] === ids[ids.length - 1] ? ids.slice(0, -1) : ids
  if (trimmed.length === 0) return trimmed
  let minIdx = 0
  for (let i = 1; i < trimmed.length; i++) {
    if ((trimmed[i] ?? '') < (trimmed[minIdx] ?? '')) minIdx = i
  }
  return [...trimmed.slice(minIdx), ...trimmed.slice(0, minIdx)]
}

/**
 * Files inside a package. Useful as the starting point for package-scoped
 * analysis ("show me every symbol exported from `@factivist/shared`").
 */
export const filesInPackage = async (
  conn: GraphConnection,
  packageId: string,
): Promise<string[]> => {
  const cypher =
    `MATCH (p:Package {id: '${escapeCypher(packageId)}'})-[:CONTAINS]->(f:File) ` +
    `RETURN f.id AS id ORDER BY f.id`
  const out = await rows(conn, cypher)
  return out.map((r) => stringField(r, 'id')).filter(Boolean)
}

/**
 * Symbols exported from a file. Pairs with `filesInPackage` for a two-level
 * drill-down without exposing Cypher to callers.
 */
export const symbolsInFile = async (
  conn: GraphConnection,
  fileId: string,
): Promise<{ id: string; name: string; kind: string }[]> => {
  const cypher =
    `MATCH (f:File {id: '${escapeCypher(fileId)}'})-[:DEFINES]->(s:Symbol) ` +
    `RETURN s.id AS id, s.name AS name, s.kind AS kind ORDER BY s.name`
  const out = await rows(conn, cypher)
  return out
    .map((r) => ({
      id: stringField(r, 'id'),
      name: stringField(r, 'name'),
      kind: stringField(r, 'kind'),
    }))
    .filter((s) => s.id)
}

export const _internals = { canonicalizeCycle, escape: escapeCypher, stringField }
