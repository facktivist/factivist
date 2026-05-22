/**
 * `@factivist/guardrails` — project policy checks.
 *
 * Prefer subpath imports:
 *
 *   import { check } from '@factivist/guardrails/check'
 *   import { byName } from '@factivist/guardrails/registry'
 *   import { memoryAuditTransport } from '@factivist/guardrails/audit'
 *
 * This barrel exists for convenience and tooling that doesn't resolve
 * subpaths.
 */

export {
  buildEntry,
  cliAuditTransport,
  memoryAuditTransport,
} from './audit.ts'
export { acceptBypass, isExperimentBranch, parseBypass } from './bypass.ts'
export { type CheckOptions, type CheckOutcome, type CheckResult, check } from './check.ts'
export { envFile, isEnvFileName } from './registry/env-file.ts'
export { ALL, byName } from './registry/index.ts'
export type {
  AuditEntry,
  AuditTransport,
  BypassClass,
  BypassRequest,
  Guardrail,
  GuardrailContext,
  Verdict,
} from './types.ts'
