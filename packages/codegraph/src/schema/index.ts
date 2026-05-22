/**
 * Kuzu DDL for the code knowledge graph.
 *
 * The schema is intentionally narrow: every concept must be present in the
 * source repo (no curated nodes). If you find yourself wanting a node type
 * that can't be regenerated from the filesystem and ASTs, it belongs in
 * the AGE domain KG (`packages/db`) or ruflo's causal graph, not here.
 */

export const SCHEMA_VERSION = '1.0.0'

/**
 * Ordered list of DDL statements to apply to a fresh Kuzu database.
 *
 * Kuzu requires node tables to exist before rel tables that reference them,
 * so order matters. Statements are idempotent via `IF NOT EXISTS` where
 * supported; callers that need a truly fresh DB should delete the file first.
 */
export const SCHEMA_STATEMENTS: readonly string[] = [
  // Node tables
  `CREATE NODE TABLE IF NOT EXISTS Package (
    id STRING,
    name STRING,
    path STRING,
    isApp BOOLEAN,
    isPrivate BOOLEAN,
    PRIMARY KEY(id)
  )`,
  `CREATE NODE TABLE IF NOT EXISTS File (
    id STRING,
    path STRING,
    packageId STRING,
    ext STRING,
    loc INT64,
    contentHash STRING,
    PRIMARY KEY(id)
  )`,
  `CREATE NODE TABLE IF NOT EXISTS Symbol (
    id STRING,
    name STRING,
    kind STRING,
    fileId STRING,
    exported BOOLEAN,
    PRIMARY KEY(id)
  )`,
  // Rel tables
  `CREATE REL TABLE IF NOT EXISTS CONTAINS (FROM Package TO File)`,
  `CREATE REL TABLE IF NOT EXISTS DEPENDS_ON (FROM Package TO Package)`,
  `CREATE REL TABLE IF NOT EXISTS IMPORTS (
    FROM File TO File,
    specifier STRING,
    isTypeOnly BOOLEAN
  )`,
  `CREATE REL TABLE IF NOT EXISTS DEFINES (FROM File TO Symbol)`,
  `CREATE REL TABLE IF NOT EXISTS REFERENCES (FROM Symbol TO Symbol)`,
] as const
