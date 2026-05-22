/**
 * Core guardrail runner.
 *
 * Responsibilities:
 *   1. Run the guardrail's pure `run()` against the context.
 *   2. If it fails, consult bypass env. Reject malformed bypass requests.
 *   3. Record an audit entry (`pass`, `fail`, or `bypassed`).
 *   4. Return a normalized `CheckResult` to the caller.
 *
 * All branching beyond this is the caller's concern (exit code, message
 * formatting). Keeping the runner free of CLI/IO assumptions lets the same
 * logic power git hooks, CI, and runtime checks inside the API.
 */

import { acceptBypass, isExperimentBranch, parseBypass } from './bypass.ts'
import type {
  AuditTransport,
  BypassRequest,
  Guardrail,
  GuardrailContext,
  Verdict,
} from './types.ts'

export type CheckOutcome = 'pass' | 'fail' | 'bypassed'

export interface CheckResult {
  guardrail: string
  outcome: CheckOutcome
  reason?: string
  details?: string[]
  bypass?: BypassRequest
}

export interface CheckOptions {
  /** Audit transport — `memoryAuditTransport()` in tests, CLI in prod. */
  audit: AuditTransport
  /** Optional actor identity recorded in the audit entry (agent name, user). */
  actor?: string
}

export const check = async (
  guardrail: Guardrail,
  ctx: GuardrailContext,
  options: CheckOptions,
): Promise<CheckResult> => {
  const verdict = await guardrail.run(ctx)
  if (verdict.ok) {
    await options.audit.record({
      guardrail: guardrail.name,
      outcome: 'pass',
      ts: new Date().toISOString(),
      actor: options.actor,
      branch: ctx.branch,
    })
    return { guardrail: guardrail.name, outcome: 'pass' }
  }
  const bypassed = await tryBypass(guardrail, ctx, verdict, options)
  if (bypassed) return bypassed
  await options.audit.record({
    guardrail: guardrail.name,
    outcome: 'fail',
    reason: verdict.reason,
    details: verdict.details,
    ts: new Date().toISOString(),
    actor: options.actor,
    branch: ctx.branch,
  })
  return {
    guardrail: guardrail.name,
    outcome: 'fail',
    reason: verdict.reason,
    details: verdict.details,
  }
}

const tryBypass = async (
  guardrail: Guardrail,
  ctx: GuardrailContext,
  verdict: Extract<Verdict, { ok: false }>,
  options: CheckOptions,
): Promise<CheckResult | undefined> => {
  const parsed = parseBypass(ctx.env)
  if (parsed.error) {
    // Malformed bypass requests are always failures — never silently ignored.
    return {
      guardrail: guardrail.name,
      outcome: 'fail',
      reason: verdict.reason,
      details: [...(verdict.details ?? []), `bypass rejected: ${parsed.error}`],
    }
  }
  if (!parsed.request) return undefined
  const accept = acceptBypass(parsed.request, guardrail.acceptsBypass)
  if ('error' in accept) {
    return {
      guardrail: guardrail.name,
      outcome: 'fail',
      reason: verdict.reason,
      details: [...(verdict.details ?? []), `bypass rejected: ${accept.error}`],
    }
  }
  if (accept.request.class === 'experiment' && !isExperimentBranch(ctx.branch)) {
    return {
      guardrail: guardrail.name,
      outcome: 'fail',
      reason: verdict.reason,
      details: [
        ...(verdict.details ?? []),
        `bypass rejected: experiment bypass requires an experiment/* branch`,
      ],
    }
  }
  await options.audit.record({
    guardrail: guardrail.name,
    outcome: 'bypassed',
    reason: verdict.reason,
    bypass: accept.request,
    details: verdict.details,
    ts: new Date().toISOString(),
    actor: options.actor,
    branch: ctx.branch,
  })
  return {
    guardrail: guardrail.name,
    outcome: 'bypassed',
    reason: verdict.reason,
    details: verdict.details,
    bypass: accept.request,
  }
}
