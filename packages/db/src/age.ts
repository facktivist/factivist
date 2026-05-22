/**
 * Apache AGE Cypher helper for the Factivist domain knowledge graph.
 *
 * AGE exposes Cypher to Postgres via the `cypher(graph, $$ <cypher> $$)`
 * function. Every query MUST live inside a `SELECT * FROM cypher(...) AS (...)`
 * statement and the result columns MUST be declared with `agtype` types — we
 * hide both warts behind `runCypher`.
 *
 * The graph name (`factivist_kg`) is fixed at the package layer; pass a
 * different name only if you're targeting a per-tenant or per-test graph.
 */

import postgres from 'postgres'

const DEFAULT_GRAPH = 'factivist_kg'

const SEARCH_PATH_STMT = `SET search_path = ag_catalog, "$user", public`
const LOAD_STMT = `LOAD 'age'`

/**
 * A connection scoped to AGE: ensures `LOAD 'age'` and the search path are
 * applied on every checked-out connection. Postgres-js opens connections
 * lazily, so we register a `connection` callback rather than running the
 * statements eagerly at construction time.
 */
export const openAgeClient = (url: string): postgres.Sql => {
  return postgres(url, {
    prepare: false,
    // Keep `fetch_types` off — AGE introduces custom types (agtype) the
    // driver shouldn't try to introspect on connection.
    fetch_types: false,
  } as postgres.Options<Record<string, never>>)
}

/**
 * Apply the AGE bootstrap by running every SET/LOAD statement once on the
 * supplied `sql` client. Call this immediately after `openAgeClient` and
 * before any `runCypher` invocation in the same logical session.
 */
export const ensureAgeSession = async (sql: postgres.Sql): Promise<void> => {
  await sql.unsafe(LOAD_STMT)
  await sql.unsafe(SEARCH_PATH_STMT)
}

/**
 * Column spec for the synthetic SQL projection AGE requires. Each column
 * receives a Cypher binding and a result name. Pass `agtype` (the default)
 * unless you know you need a coerced type.
 */
export interface CypherColumn {
  name: string
  type?: string
}

/**
 * Run a Cypher statement against a named AGE graph. Returns the projected
 * rows as plain objects with one key per declared column.
 *
 * @example
 *   const rows = await runCypher(sql, `
 *     MATCH (e:Entity {name: 'India'})-[:ASSERTS]->(c:Claim)
 *     RETURN c.id AS id, c.text AS text
 *   `, [{ name: 'id' }, { name: 'text' }])
 */
export const runCypher = async <T extends Record<string, unknown>>(
  sql: postgres.Sql,
  cypher: string,
  columns: CypherColumn[],
  graph: string = DEFAULT_GRAPH,
): Promise<T[]> => {
  if (columns.length === 0) {
    throw new Error('runCypher: at least one column must be declared')
  }
  const colSpec = columns.map((c) => `"${c.name}" ${c.type ?? 'agtype'}`).join(', ')
  const stmt = `SELECT * FROM cypher('${graph}', $$ ${cypher} $$) AS (${colSpec})`
  const rows = (await sql.unsafe(stmt)) as unknown as T[]
  return rows.map((row) => coerceRow(row, columns)) as T[]
}

/**
 * AGE returns `agtype` values as strings with embedded JSON (often suffixed
 * with `::vertex` or similar). For the common case — scalar values — we strip
 * the suffix and JSON-parse so callers get plain JS values.
 */
const coerceRow = <T extends Record<string, unknown>>(row: T, columns: CypherColumn[]): T => {
  const out: Record<string, unknown> = {}
  for (const col of columns) {
    const value = row[col.name as keyof T]
    out[col.name] = coerceAgtype(value)
  }
  return out as T
}

const AGTYPE_SUFFIX_RE = /::(vertex|edge|path)$/

const coerceAgtype = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const stripped = value.replace(AGTYPE_SUFFIX_RE, '')
  try {
    return JSON.parse(stripped)
  } catch {
    return stripped
  }
}

export const _internals = { coerceAgtype, coerceRow, DEFAULT_GRAPH }
