/**
 * Shared TypeScript types for the code graph.
 *
 * The ID conventions here are intentionally stable across ingests: a path
 * relative to the workspace root, lowercased and with forward slashes. This
 * lets external systems (ruflo causal nodes, AGE domain KG) reference graph
 * vertices by string ID without coupling to Kuzu internals.
 */

export type PackageId = string
export type FileId = string
export type SymbolId = string

export interface PackageNode {
  id: PackageId
  name: string
  path: string
  isApp: boolean
  isPrivate: boolean
}

export interface FileNode {
  id: FileId
  path: string
  packageId: PackageId
  ext: string
  loc: number
  contentHash: string
}

export type SymbolKind = 'class' | 'function' | 'interface' | 'type' | 'const' | 'enum'

export interface SymbolNode {
  id: SymbolId
  name: string
  kind: SymbolKind
  fileId: FileId
  exported: boolean
}

export interface ImportEdge {
  fromFileId: FileId
  toFileId: FileId
  specifier: string
  isTypeOnly: boolean
}

export interface DependsOnEdge {
  fromPackageId: PackageId
  toPackageId: PackageId
}

export interface ContainsEdge {
  packageId: PackageId
  fileId: FileId
}

export interface DefinesEdge {
  fileId: FileId
  symbolId: SymbolId
}

export interface ReferencesEdge {
  fromSymbolId: SymbolId
  toSymbolId: SymbolId
}

export interface GraphSnapshot {
  packages: PackageNode[]
  files: FileNode[]
  symbols: SymbolNode[]
  imports: ImportEdge[]
  dependsOn: DependsOnEdge[]
  contains: ContainsEdge[]
  defines: DefinesEdge[]
  references: ReferencesEdge[]
}
