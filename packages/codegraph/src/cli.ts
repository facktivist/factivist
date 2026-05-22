/**
 * CLI entry point: `bun run graph:ingest` and `bun run graph:query "<cypher>"`.
 *
 * Kept minimal on purpose — the heavy lifting lives in `ingest/` and
 * `query/`, so the CLI is just argument parsing plus stdout/stderr. Anything
 * fancier (file watching, incremental ingest) belongs as a separate script
 * that imports these helpers.
 */

import { resolve } from 'node:path'
import process from 'node:process'

import { openGraph } from './client.ts'
import { buildVault, writeVault } from './export/obsidian.ts'
import { buildSnapshot, type IngestStats, ingest } from './ingest/index.ts'

export const DEFAULT_DB = '.codegraph/graph.kuzu'
export const DEFAULT_VAULT = '.codegraph/vault'

export const formatStats = (stats: IngestStats): string =>
  `Ingested ${stats.packages} packages, ${stats.files} files, ` +
  `${stats.symbols} symbols, ${stats.imports} imports, ` +
  `${stats.dependsOn} package edges\n`

export const cmdIngest = async (root: string, dbPath: string): Promise<IngestStats> => {
  const handle = await openGraph(dbPath)
  try {
    return await ingest(root, handle)
  } finally {
    handle.close()
  }
}

export const cmdQuery = async (dbPath: string, cypher: string): Promise<unknown[]> => {
  const handle = await openGraph(dbPath)
  try {
    const result = await handle.conn.query(cypher)
    return await result.getAll()
  } finally {
    handle.close()
  }
}

export interface ExportStats {
  files: number
  vaultRoot: string
}

export const cmdExportObsidian = async (root: string, vaultRoot: string): Promise<ExportStats> => {
  const snapshot = await buildSnapshot(root)
  const vault = buildVault(snapshot)
  await writeVault(vaultRoot, vault, { clean: true })
  return { files: vault.length, vaultRoot }
}

export const formatExportStats = (stats: ExportStats): string =>
  `Wrote ${stats.files} markdown files to ${stats.vaultRoot}\n`

export interface CliIO {
  argv: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  stdout: { write: (chunk: string) => void }
  stderr: { write: (chunk: string) => void }
  exit: (code: number) => void
}

/**
 * Parse argv and dispatch. Returns 0 on success, non-zero on misuse, and
 * does not throw — exceptions from the underlying commands are rethrown so
 * the harness wrapping main() can decide how to surface them.
 */
export const runCli = async (io: CliIO): Promise<number> => {
  const [, , cmd, ...rest] = io.argv
  const dbPath = io.env.CODEGRAPH_DB ?? resolve(io.cwd, DEFAULT_DB)
  if (cmd === 'ingest') {
    const stats = await cmdIngest(io.cwd, dbPath)
    io.stdout.write(formatStats(stats))
    return 0
  }
  if (cmd === 'query') {
    const cypher = rest.join(' ').trim()
    if (!cypher) {
      io.stderr.write('Usage: bun run graph:query "<cypher>"\n')
      return 2
    }
    const rows = await cmdQuery(dbPath, cypher)
    io.stdout.write(`${JSON.stringify(rows, null, 2)}\n`)
    return 0
  }
  if (cmd === 'export:obsidian') {
    const vaultRoot = io.env.CODEGRAPH_VAULT ?? resolve(io.cwd, DEFAULT_VAULT)
    const stats = await cmdExportObsidian(io.cwd, vaultRoot)
    io.stdout.write(formatExportStats(stats))
    return 0
  }
  io.stderr.write('Usage: bun run graph:ingest | graph:query "<cypher>" | graph:export:obsidian\n')
  return 2
}

const main = async (): Promise<void> => {
  const code = await runCli({
    argv: process.argv,
    cwd: process.cwd(),
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    exit: (c) => process.exit(c),
  })
  if (code !== 0) process.exit(code)
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  })
}
