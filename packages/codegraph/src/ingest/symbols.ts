/**
 * Lightweight symbol extraction.
 *
 * We capture top-level exported declarations only — that's the API surface of
 * each module and the right granularity for "what does this file expose to
 * the graph." Nested symbols, class members, and locals are deliberately
 * skipped; if you need that level of detail, a tree-sitter pass is the right
 * upgrade, but it isn't free and most blast-radius questions don't need it.
 *
 * Like `imports.ts`, this is a regex pass rather than a full parse. Edge
 * cases (multi-line generic clauses, decorators) may be miscategorized as
 * `const`. The trade-off is the same as imports: cheaper to run, occasional
 * false attribution, and the public interface stays stable.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { FileNode, SymbolKind, SymbolNode } from '../types.ts'

const DECL_RE =
  /^export\s+(?:default\s+)?(?:async\s+)?(class|function|interface|type|const|let|var|enum)\s+(\w+)/gm

const KIND_MAP: Record<string, SymbolKind> = {
  class: 'class',
  function: 'function',
  interface: 'interface',
  type: 'type',
  const: 'const',
  let: 'const',
  var: 'const',
  enum: 'enum',
}

const buildSymbolId = (fileId: string, name: string): string => `${fileId}#${name}`

export const extractSymbols = (file: FileNode, source: string): SymbolNode[] => {
  const symbols: SymbolNode[] = []
  const seen = new Set<string>()
  for (const m of source.matchAll(DECL_RE)) {
    // The regex's two capture groups are required match positions, so by
    // construction both are defined when a match exists.
    const rawKind = m[1] as keyof typeof KIND_MAP
    const name = m[2] as string
    if (seen.has(name)) continue
    seen.add(name)
    symbols.push({
      id: buildSymbolId(file.id, name),
      name,
      kind: KIND_MAP[rawKind] as SymbolKind,
      fileId: file.id,
      exported: true,
    })
  }
  return symbols
}

export const discoverSymbols = async (root: string, files: FileNode[]): Promise<SymbolNode[]> => {
  const out: SymbolNode[] = []
  for (const file of files) {
    const source = await readFile(join(root, file.id), 'utf8').catch(() => undefined)
    if (source === undefined) continue
    out.push(...extractSymbols(file, source))
  }
  out.sort((a, b) => a.id.localeCompare(b.id))
  return out
}

export const _internals = { buildSymbolId, KIND_MAP }
