/**
 * Obsidian vault exporter.
 *
 * Turns a `GraphSnapshot` into a folder of markdown files that Obsidian can
 * open as a vault. Every node becomes one `.md` file with YAML frontmatter
 * carrying its graph identity, and edges become bidirectional `[[wiki-links]]`
 * inside the body — Obsidian's Graph View then renders the whole code KG
 * with zero plugin setup.
 *
 * Design notes:
 *   - The vault is a *derived* artifact. Never edit it by hand; rerun the
 *     exporter. We mirror the package's path layout to make navigation
 *     intuitive (vault/packages/codegraph.md, etc.).
 *   - File names use `.md`. Forward slashes in node IDs become directories.
 *     `:` is illegal on Windows filesystems but valid in our IDs, so we
 *     replace it with `__` in the path while keeping the original ID in
 *     the frontmatter for round-tripping.
 *   - Output is alphabetically deterministic — running twice on the same
 *     snapshot produces byte-identical files.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { FileNode, GraphSnapshot, PackageNode, SymbolNode } from '../types.ts'

export interface VaultFile {
  /** Path relative to the vault root, including extension. */
  path: string
  body: string
}

interface ImportsIndex {
  outgoing: Map<string, { to: string; specifier: string; isTypeOnly: boolean }[]>
  incoming: Map<string, { from: string; specifier: string; isTypeOnly: boolean }[]>
}

interface PackageEdgesIndex {
  outgoing: Map<string, string[]>
  incoming: Map<string, string[]>
}

interface ContainsIndex {
  filesByPackage: Map<string, string[]>
  packageByFile: Map<string, string>
}

interface SymbolsByFile {
  byFile: Map<string, SymbolNode[]>
}

const PATH_SEP_REPLACEMENT = '__'

const sanitizeForFs = (id: string): string => id.replace(/:/g, PATH_SEP_REPLACEMENT)

/**
 * Turn any node ID into a `[[wiki-link]]`. We point at the resolved vault
 * basename (without extension) so Obsidian resolves the link regardless of
 * which folder the current file lives in.
 */
const wikiLink = (id: string, label?: string): string => {
  const target = sanitizeForFs(id)
  return label ? `[[${target}|${label}]]` : `[[${target}]]`
}

const indexImports = (snapshot: GraphSnapshot): ImportsIndex => {
  const outgoing = new Map<string, { to: string; specifier: string; isTypeOnly: boolean }[]>()
  const incoming = new Map<string, { from: string; specifier: string; isTypeOnly: boolean }[]>()
  for (const edge of snapshot.imports) {
    const out = outgoing.get(edge.fromFileId) ?? []
    out.push({ to: edge.toFileId, specifier: edge.specifier, isTypeOnly: edge.isTypeOnly })
    outgoing.set(edge.fromFileId, out)
    const inc = incoming.get(edge.toFileId) ?? []
    inc.push({ from: edge.fromFileId, specifier: edge.specifier, isTypeOnly: edge.isTypeOnly })
    incoming.set(edge.toFileId, inc)
  }
  return { outgoing, incoming }
}

const indexPackageEdges = (snapshot: GraphSnapshot): PackageEdgesIndex => {
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  for (const edge of snapshot.dependsOn) {
    const out = outgoing.get(edge.fromPackageId) ?? []
    out.push(edge.toPackageId)
    outgoing.set(edge.fromPackageId, out)
    const inc = incoming.get(edge.toPackageId) ?? []
    inc.push(edge.fromPackageId)
    incoming.set(edge.toPackageId, inc)
  }
  return { outgoing, incoming }
}

const indexContains = (snapshot: GraphSnapshot): ContainsIndex => {
  const filesByPackage = new Map<string, string[]>()
  const packageByFile = new Map<string, string>()
  for (const edge of snapshot.contains) {
    const arr = filesByPackage.get(edge.packageId) ?? []
    arr.push(edge.fileId)
    filesByPackage.set(edge.packageId, arr)
    packageByFile.set(edge.fileId, edge.packageId)
  }
  return { filesByPackage, packageByFile }
}

const indexSymbols = (snapshot: GraphSnapshot): SymbolsByFile => {
  const byFile = new Map<string, SymbolNode[]>()
  for (const symbol of snapshot.symbols) {
    const arr = byFile.get(symbol.fileId) ?? []
    arr.push(symbol)
    byFile.set(symbol.fileId, arr)
  }
  return { byFile }
}

const frontmatter = (entries: Record<string, string | number | boolean | string[]>): string => {
  const lines: string[] = ['---']
  for (const key of Object.keys(entries).sort()) {
    const value = entries[key]
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`)
        continue
      }
      lines.push(`${key}:`)
      for (const item of [...value].sort()) lines.push(`  - ${item}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  lines.push('---')
  return lines.join('\n')
}

const renderPackage = (
  pkg: PackageNode,
  contains: ContainsIndex,
  pkgEdges: PackageEdgesIndex,
): VaultFile => {
  const files = (contains.filesByPackage.get(pkg.id) ?? []).slice().sort()
  const deps = (pkgEdges.outgoing.get(pkg.id) ?? []).slice().sort()
  const consumers = (pkgEdges.incoming.get(pkg.id) ?? []).slice().sort()
  const fm = frontmatter({
    type: 'package',
    id: pkg.id,
    name: pkg.name,
    path: pkg.path,
    isApp: pkg.isApp,
    isPrivate: pkg.isPrivate,
    tags: ['codegraph/package', pkg.isApp ? 'codegraph/app' : 'codegraph/lib'],
  })
  const sections: string[] = [
    fm,
    '',
    `# ${pkg.name}`,
    '',
    `Workspace package at \`${pkg.path}\`.`,
    '',
    '## Depends on',
    deps.length === 0
      ? '_(no internal dependencies)_'
      : deps.map((id) => `- ${wikiLink(id)}`).join('\n'),
    '',
    '## Consumed by',
    consumers.length === 0
      ? '_(no internal consumers)_'
      : consumers.map((id) => `- ${wikiLink(id)}`).join('\n'),
    '',
    '## Files',
    files.length === 0 ? '_(no source files)_' : files.map((id) => `- ${wikiLink(id)}`).join('\n'),
    '',
  ]
  return {
    path: `${sanitizeForFs(pkg.id)}.md`,
    body: sections.join('\n'),
  }
}

const renderFile = (file: FileNode, imports: ImportsIndex, symbols: SymbolsByFile): VaultFile => {
  const out = (imports.outgoing.get(file.id) ?? []).slice().sort((a, b) => a.to.localeCompare(b.to))
  const inc = (imports.incoming.get(file.id) ?? [])
    .slice()
    .sort((a, b) => a.from.localeCompare(b.from))
  const fileSymbols = (symbols.byFile.get(file.id) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  const fm = frontmatter({
    type: 'file',
    id: file.id,
    path: file.path,
    package: file.packageId,
    ext: file.ext,
    loc: file.loc,
    contentHash: file.contentHash,
    tags: ['codegraph/file'],
  })
  const sections: string[] = [
    fm,
    '',
    `# ${file.path}`,
    '',
    `In ${wikiLink(file.packageId, file.packageId)} — ${file.loc} LOC.`,
    '',
    '## Imports',
    out.length === 0
      ? '_(no in-graph imports)_'
      : out
          .map(
            (edge) =>
              `- ${wikiLink(edge.to)} — \`${edge.specifier}\`${edge.isTypeOnly ? ' _(type-only)_' : ''}`,
          )
          .join('\n'),
    '',
    '## Imported by',
    inc.length === 0
      ? '_(not imported by any in-graph file)_'
      : inc.map((edge) => `- ${wikiLink(edge.from)} via \`${edge.specifier}\``).join('\n'),
    '',
    '## Defines',
    fileSymbols.length === 0
      ? '_(no exported symbols)_'
      : fileSymbols.map((s) => `- ${wikiLink(s.id, s.name)} (${s.kind})`).join('\n'),
    '',
  ]
  return {
    path: `${sanitizeForFs(file.id)}.md`,
    body: sections.join('\n'),
  }
}

const renderSymbol = (symbol: SymbolNode): VaultFile => {
  const fm = frontmatter({
    type: 'symbol',
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    file: symbol.fileId,
    exported: symbol.exported,
    tags: ['codegraph/symbol', `codegraph/kind/${symbol.kind}`],
  })
  const sections: string[] = [
    fm,
    '',
    `# ${symbol.name}`,
    '',
    `A ${symbol.kind} defined in ${wikiLink(symbol.fileId, symbol.fileId)}.`,
    '',
  ]
  return { path: `${sanitizeForFs(symbol.id)}.md`, body: sections.join('\n') }
}

const renderIndex = (snapshot: GraphSnapshot): VaultFile => {
  const fm = frontmatter({
    type: 'index',
    generated: new Date().toISOString().slice(0, 10),
    packages: snapshot.packages.length,
    files: snapshot.files.length,
    symbols: snapshot.symbols.length,
    imports: snapshot.imports.length,
    tags: ['codegraph/index'],
  })
  const sections: string[] = [
    fm,
    '',
    '# Factivist code KG',
    '',
    `Generated from the codegraph snapshot. ${snapshot.packages.length} packages, ` +
      `${snapshot.files.length} files, ${snapshot.symbols.length} symbols, ` +
      `${snapshot.imports.length} import edges.`,
    '',
    '## Packages',
    ...snapshot.packages
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((pkg) => `- ${wikiLink(pkg.id, pkg.name)}`),
    '',
    '> This vault is derived. Re-run `bun run graph:export:obsidian` to refresh.',
    '',
  ]
  return { path: 'index.md', body: sections.join('\n') }
}

/**
 * Build the entire vault as an in-memory list of files. Pure and
 * deterministic so we can snapshot it in tests.
 */
export const buildVault = (snapshot: GraphSnapshot): VaultFile[] => {
  const imports = indexImports(snapshot)
  const pkgEdges = indexPackageEdges(snapshot)
  const contains = indexContains(snapshot)
  const symbols = indexSymbols(snapshot)
  const files: VaultFile[] = [renderIndex(snapshot)]
  for (const pkg of snapshot.packages) files.push(renderPackage(pkg, contains, pkgEdges))
  for (const file of snapshot.files) files.push(renderFile(file, imports, symbols))
  for (const symbol of snapshot.symbols) files.push(renderSymbol(symbol))
  files.sort((a, b) => a.path.localeCompare(b.path))
  return files
}

export interface WriteVaultOptions {
  /** When true, the existing vault directory is deleted before writing. */
  clean?: boolean
}

/**
 * Write a vault to disk at `vaultRoot`. Directories are created on demand.
 * `clean: true` deletes the directory first — the right default for CI
 * because the vault must mirror the snapshot exactly.
 */
export const writeVault = async (
  vaultRoot: string,
  vault: VaultFile[],
  options: WriteVaultOptions = {},
): Promise<void> => {
  if (options.clean) await rm(vaultRoot, { recursive: true, force: true })
  await mkdir(vaultRoot, { recursive: true })
  for (const file of vault) {
    const target = join(vaultRoot, file.path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, file.body, 'utf8')
  }
}

export const _internals = {
  frontmatter,
  indexImports,
  indexPackageEdges,
  indexContains,
  indexSymbols,
  renderFile,
  renderIndex,
  renderPackage,
  renderSymbol,
  sanitizeForFs,
  wikiLink,
}
