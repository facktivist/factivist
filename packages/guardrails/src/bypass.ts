/**
 * Bypass parsing and validation.
 *
 * Bypasses are expressed via env vars to keep them visible in shell history
 * and CI logs:
 *
 *   BYPASS_GUARDRAILS=hotfix BYPASS_REASON="prod outage" \
 *   BYPASS_INCIDENT_ID=INC-1234 bun run db:migrate
 *
 * The function below converts that env into a `BypassRequest`, or returns
 * `undefined` if no bypass was requested. Invalid combinations (e.g.,
 * `hotfix` without an incident ID) return an error string — callers should
 * propagate it as a check failure so the bypass attempt is auditable instead
 * of being silently ignored.
 */

import type { BypassClass, BypassRequest } from './types.ts'

const VALID_CLASSES: readonly BypassClass[] = ['hotfix', 'experiment', 'local', 'sudo']

export interface BypassParseResult {
  request?: BypassRequest
  error?: string
}

export const parseBypass = (env: Record<string, string | undefined>): BypassParseResult => {
  const raw = env.BYPASS_GUARDRAILS?.trim()
  if (!raw) return {}
  if (!isValidClass(raw)) {
    return {
      error: `unknown BYPASS_GUARDRAILS value "${raw}" — expected one of ${VALID_CLASSES.join(', ')}`,
    }
  }
  const reason = env.BYPASS_REASON?.trim()
  if (!reason) {
    return { error: 'BYPASS_REASON is required when BYPASS_GUARDRAILS is set' }
  }
  const request: BypassRequest = { class: raw, reason }
  if (raw === 'hotfix') {
    const incidentId = env.BYPASS_INCIDENT_ID?.trim()
    if (!incidentId) {
      return { error: 'BYPASS_INCIDENT_ID is required for hotfix bypass' }
    }
    request.incidentId = incidentId
  }
  return { request }
}

const isValidClass = (value: string): value is BypassClass =>
  (VALID_CLASSES as readonly string[]).includes(value)

/**
 * Verify that a parsed bypass is acceptable for a specific guardrail.
 *
 * Returns the bypass on success, or a human-readable error string when the
 * guardrail does not accept the requested class. The empty-list case
 * ("unbypassable") is handled here so individual guardrails don't have to.
 */
export const acceptBypass = (
  request: BypassRequest,
  accepts: readonly BypassClass[],
): { request: BypassRequest } | { error: string } => {
  if (accepts.length === 0) {
    return { error: 'this guardrail does not accept any bypass' }
  }
  if (!accepts.includes(request.class)) {
    return {
      error: `this guardrail accepts ${accepts.join(', ')}, not ${request.class}`,
    }
  }
  return { request }
}

/**
 * The fixed `experiment` bypass also requires the working branch to match
 * `experiment/*`. Centralizing the check keeps the policy in one place
 * rather than scattered through individual guardrail definitions.
 */
export const isExperimentBranch = (branch: string | undefined): boolean =>
  typeof branch === 'string' && branch.startsWith('experiment/')
