/**
 * Audit transport for guardrail outcomes.
 *
 * Production transport spawns the ruflo CLI to write entries into the
 * `guardrail-bypass` namespace. Tests use `memoryTransport` for assertions.
 * We never block the caller on audit failures — telemetry must not become a
 * vector for guardrail bypass via "the audit broke, let it through" logic.
 *
 * For uniform handling, transports are async and return void. Errors caught
 * inside the production transport are swallowed and logged to stderr; the
 * guardrail's verdict is what matters for control flow.
 */

import { spawn } from 'node:child_process'

import type { AuditEntry, AuditTransport } from './types.ts'

export const cliAuditTransport = (binary = 'ruflo'): AuditTransport => ({
  record: async (entry) => {
    const args = [
      'memory',
      'store',
      '--namespace',
      'guardrail-bypass',
      '--key',
      `${entry.guardrail}:${entry.ts}`,
      '--value',
      JSON.stringify(entry),
    ]
    try {
      await new Promise<void>((resolveSpawn, rejectSpawn) => {
        const child = spawn(binary, args, { stdio: 'ignore' })
        child.on('error', rejectSpawn)
        child.on('exit', (code) => {
          if (code === 0) resolveSpawn()
          else rejectSpawn(new Error(`ruflo exited with code ${code}`))
        })
      })
    } catch (err) {
      process.stderr.write(
        `guardrails: audit write failed (${err instanceof Error ? err.message : String(err)})\n`,
      )
    }
  },
})

export const memoryAuditTransport = (): AuditTransport & { entries: AuditEntry[] } => {
  const entries: AuditEntry[] = []
  return {
    entries,
    record: async (entry) => {
      entries.push(entry)
    },
  }
}

/**
 * Stitch a fully-populated `AuditEntry` from individual fields. Centralizing
 * timestamp + branch attribution avoids per-callsite drift.
 */
export const buildEntry = (base: Omit<AuditEntry, 'ts'> & { ts?: string }): AuditEntry => ({
  ...base,
  ts: base.ts ?? new Date().toISOString(),
})
