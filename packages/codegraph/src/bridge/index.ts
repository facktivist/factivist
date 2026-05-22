/**
 * Ruflo bridge — wires the code KG to ruflo's causal/agent memory.
 *
 * The bridge is intentionally one-directional and stateless: nothing in
 * `packages/codegraph` ever reads from ruflo. Instead, callers (agents,
 * pre-commit hooks, CI tasks) ask the bridge to *record* facts ABOUT code KG
 * nodes into ruflo's causal store. That keeps ruflo as the ground truth for
 * reasoning trajectories while the code KG stays a pure derivative of source.
 *
 * Convention: every ruflo node referencing a file uses the URN `file:<fileId>`
 * (e.g. `file:apps/api/src/index.ts`). Packages use `pkg:<packageId>`. These
 * URNs are stable across ingests because file IDs are content-independent.
 */

import { spawn } from 'node:child_process'

export type CodeUrn = `file:${string}` | `pkg:${string}` | `sym:${string}`

export const fileUrn = (fileId: string): CodeUrn => `file:${fileId}`
export const packageUrn = (packageId: string): CodeUrn => `pkg:${packageId}`
export const symbolUrn = (symbolId: string): CodeUrn => `sym:${symbolId}`

export interface CausalRecord {
  /** URN of the code KG node this fact is about. */
  about: CodeUrn
  /** Short, human-readable label (`"refactored auth middleware"`). */
  label: string
  /** Optional structured payload — stored verbatim in ruflo metadata. */
  payload?: Record<string, unknown>
  /** Optional URN of a parent/predecessor record (`file:` or a prior node id). */
  parent?: CodeUrn
}

/**
 * Strategy for delivering causal records to ruflo. Swappable so tests can
 * assert payloads without spawning the ruflo CLI.
 */
export interface RufloTransport {
  record: (record: CausalRecord) => Promise<void>
}

/**
 * Default transport: invokes the ruflo CLI to store an entry in the
 * `causal-graph` namespace. We do not parse the output — fire-and-forget
 * is appropriate for telemetry-style writes that should never block ingest.
 */
export const cliTransport = (binary = 'ruflo'): RufloTransport => ({
  record: async (record) => {
    const args = [
      'memory',
      'store',
      '--namespace',
      'causal-graph',
      '--key',
      record.about,
      '--value',
      JSON.stringify({
        label: record.label,
        parent: record.parent ?? null,
        payload: record.payload ?? {},
        ts: new Date().toISOString(),
      }),
    ]
    await new Promise<void>((resolveSpawn, rejectSpawn) => {
      const child = spawn(binary, args, { stdio: 'ignore' })
      child.on('error', rejectSpawn)
      child.on('exit', (code) => {
        if (code === 0) resolveSpawn()
        else rejectSpawn(new Error(`ruflo exited with code ${code}`))
      })
    })
  },
})

/**
 * In-memory transport for tests: keeps every record so assertions can read
 * them back. Never use in production — there's no persistence.
 */
export const memoryTransport = (): RufloTransport & { records: CausalRecord[] } => {
  const records: CausalRecord[] = []
  return {
    records,
    record: async (record) => {
      records.push(record)
    },
  }
}

/**
 * Record that an agent has changed (or reviewed, or analyzed) a file.
 * Convenience wrapper that constructs the URN and forwards to the transport.
 */
export const recordFileTouch = async (
  transport: RufloTransport,
  fileId: string,
  label: string,
  payload?: Record<string, unknown>,
): Promise<void> => {
  await transport.record({ about: fileUrn(fileId), label, payload })
}

/**
 * Record a higher-level finding about a whole package — e.g. "performance
 * regression in `@factivist/db` after caching refactor."
 */
export const recordPackageNote = async (
  transport: RufloTransport,
  packageId: string,
  label: string,
  payload?: Record<string, unknown>,
): Promise<void> => {
  await transport.record({ about: packageUrn(packageId), label, payload })
}
