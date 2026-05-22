/**
 * Kuzu connection management.
 *
 * Kuzu is embedded — there is no server. A `Database` is a directory on disk
 * (or `:memory:` for tests). We load the native module dynamically so the
 * package typechecks (and the rest of the code is reachable) on machines
 * where the prebuilt binary hasn't been installed yet — the prebuilt only
 * matters at the moment you actually open a graph.
 */

import { SCHEMA_STATEMENTS } from './schema/index.ts'

/**
 * Minimal interface for a Kuzu connection — the only surface we depend on.
 * Keeping it small lets tests inject a stub without pulling the native module.
 */
export interface GraphConnection {
  query: (cypher: string) => Promise<{ getAll: () => Promise<unknown[]> }>
  close: () => void
}

export interface GraphHandle {
  conn: GraphConnection
  close: () => void
}

interface KuzuModule {
  Database: new (path: string) => unknown
  Connection: new (db: unknown) => GraphConnection
}

let _loader: () => Promise<KuzuModule> = async () => (await import('kuzu')) as unknown as KuzuModule

/**
 * Override the kuzu loader for tests. Production callers should never call
 * this; it exists so unit tests can run on machines without the native build.
 */
export const __setKuzuLoaderForTests = (loader: () => Promise<KuzuModule>): void => {
  _loader = loader
}

/**
 * Open (or create) a Kuzu database at `dbPath` and apply the schema.
 *
 * `:memory:` is honored for tests — Kuzu creates a fresh ephemeral DB.
 * Schema statements use `IF NOT EXISTS`, so reopening an existing DB is safe.
 */
export const openGraph = async (dbPath: string): Promise<GraphHandle> => {
  const kuzu = await _loader()
  const db = new kuzu.Database(dbPath)
  const conn = new kuzu.Connection(db)
  for (const stmt of SCHEMA_STATEMENTS) {
    await conn.query(stmt)
  }
  return {
    conn,
    close: () => conn.close(),
  }
}

/**
 * Test-only factory: opens an in-memory graph with the schema applied.
 *
 * Production callers should prefer `openGraph(path)` so the graph survives
 * across processes (CI ingest → app query at request time).
 */
export const openInMemoryGraph = (): Promise<GraphHandle> => openGraph(':memory:')
