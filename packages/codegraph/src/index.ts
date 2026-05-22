/**
 * `@factivist/codegraph` — embedded code knowledge graph.
 *
 * Prefer subpath imports in app/package code:
 *
 *   import { openGraph } from '@factivist/codegraph/client';
 *   import { ingest } from '@factivist/codegraph/ingest';
 *   import { blastRadius } from '@factivist/codegraph/query';
 *
 * The root barrel re-exports the most common surface for tooling and
 * one-off scripts that don't resolve subpaths.
 */

export {
  type CausalRecord,
  type CodeUrn,
  cliTransport,
  fileUrn,
  memoryTransport,
  packageUrn,
  type RufloTransport,
  recordFileTouch,
  recordPackageNote,
  symbolUrn,
} from './bridge/index.ts'
export { type GraphConnection, type GraphHandle, openGraph, openInMemoryGraph } from './client.ts'
export { buildSnapshot, type IngestStats, ingest, writeSnapshot } from './ingest/index.ts'
export {
  blastRadius,
  detectPackageCycles,
  directDependentsOfFile,
  filesInPackage,
  packageDependents,
  symbolsInFile,
} from './query/index.ts'
export { SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema/index.ts'
export type {
  ContainsEdge,
  DefinesEdge,
  DependsOnEdge,
  FileId,
  FileNode,
  GraphSnapshot,
  ImportEdge,
  PackageId,
  PackageNode,
  ReferencesEdge,
  SymbolId,
  SymbolKind,
  SymbolNode,
} from './types.ts'
