/**
 * Shared types for the guardrails layer.
 *
 * Design notes:
 *   - `GuardrailContext` is the only input every check sees, so adding a new
 *     project-wide signal (e.g., the current branch) means extending this
 *     shape rather than passing it to a hundred callers.
 *   - A `Verdict` is either `pass` or `fail` with a human-readable reason.
 *     "Warn" intentionally does not exist — if it's worth surfacing, it's
 *     worth failing the gate and asking for an explicit bypass.
 */

export type BypassClass = 'hotfix' | 'experiment' | 'local' | 'sudo'

export interface GuardrailContext {
  /** Absolute workspace root. */
  cwd: string
  /** Files this check should consider. For pre-commit: staged files only. */
  stagedFiles: string[]
  /** Current branch, if known. */
  branch?: string
  /** Process env, scoped so tests can inject. */
  env: Record<string, string | undefined>
  /** Optional reader hook for file content — defaults to fs in production. */
  readFile?: (path: string) => Promise<string>
}

export type Verdict = { ok: true } | { ok: false; reason: string; details?: string[] }

export interface Guardrail {
  /** Stable kebab-case identifier. Used in bypass env and audit logs. */
  name: string
  /** One-line description shown in `guardrails list`. */
  description: string
  /** Bypass classes this guardrail accepts. Empty array = unbypassable. */
  acceptsBypass: BypassClass[]
  /** Pure check function. Should never throw — return `Verdict` instead. */
  run: (ctx: GuardrailContext) => Promise<Verdict>
}

export interface BypassRequest {
  /** Which class of bypass the caller is claiming. */
  class: BypassClass
  /** Free-form reason; required. */
  reason: string
  /** Required for `hotfix` class — incident ticket ID. */
  incidentId?: string
}

export interface AuditEntry {
  guardrail: string
  outcome: 'pass' | 'fail' | 'bypassed'
  /** ISO timestamp in UTC. */
  ts: string
  reason?: string
  bypass?: BypassRequest
  details?: string[]
  branch?: string
  actor?: string
}

export interface AuditTransport {
  record: (entry: AuditEntry) => Promise<void>
}
