/**
 * checkAcl: ask whether `agent` may perform `action` on `path` per the index.
 *
 * Resolution order, first match wins:
 *   1. Deny rules on the agent's scope (highest priority).
 *   2. Allow rules (`read` / `write` / `exec`), checked across every layer.
 *
 * If no rule matches, the verdict is `deny` with `no matching rule` — i.e.
 * fail-closed. Coordinator is hard-coded to pass everything except files
 * matched by an explicit deny in its own scope.
 */

import { firstMatch, globMatches } from './match.ts'
import type { AclAction, AclIndex, AgentScope, Verdict } from './types.ts'

const allowList = (scope: AgentScope, action: AclAction): string[] | '*' | undefined => {
  if (action === 'read') return scope.read
  if (action === 'write') return scope.write
  return scope.exec
}

const collectAllowRules = (index: AclIndex, agent: string, action: AclAction): string[] => {
  const rules: string[] = []
  for (const layer of index.layers) {
    const scope = layer.file.agents[agent]
    if (!scope) continue
    const list = allowList(scope, action)
    if (list === '*') return ['*']
    if (Array.isArray(list)) rules.push(...list)
  }
  return rules
}

const collectDenyRules = (index: AclIndex, agent: string): string[] => {
  const rules: string[] = []
  for (const layer of index.layers) {
    const scope = layer.file.agents[agent]
    if (scope?.deny) rules.push(...scope.deny)
  }
  return rules
}

const agentDeclared = (index: AclIndex, agent: string): boolean =>
  index.layers.some((l) => Object.hasOwn(l.file.agents, agent))

const findRuleLayer = (
  index: AclIndex,
  rule: string,
  kind: 'allow' | 'deny',
  agent: string,
  action: AclAction,
): string => {
  for (const layer of index.layers) {
    const scope = layer.file.agents[agent]
    if (!scope) continue
    if (kind === 'deny' && scope.deny?.includes(rule)) return layer.source
    if (kind === 'allow') {
      const list = allowList(scope, action)
      if (list === '*' && rule === '*') return layer.source
      if (Array.isArray(list) && list.includes(rule)) return layer.source
    }
  }
  return '(unknown layer)'
}

export interface CheckOptions {
  /** Workspace-relative path the agent wants to touch. */
  path: string
  /** Action requested. */
  action: AclAction
}

export const checkAcl = (index: AclIndex, agent: string, options: CheckOptions): Verdict => {
  if (!agentDeclared(index, agent)) {
    return { ok: false, reason: `agent "${agent}" is not declared in any .agent-acl.yaml` }
  }
  const deny = collectDenyRules(index, agent)
  const denyHit = firstMatch(deny, options.path)
  if (denyHit !== undefined) {
    return {
      ok: false,
      reason: `agent "${agent}" denied on ${options.path} by rule "${denyHit}" (in ${findRuleLayer(index, denyHit, 'deny', agent, options.action)})`,
    }
  }
  if (agent === index.coordinator) {
    return { ok: true, matched: { layer: '(coordinator)', rule: '*' } }
  }
  const allow = collectAllowRules(index, agent, options.action)
  if (allow.length === 0) {
    return {
      ok: false,
      reason: `agent "${agent}" has no ${options.action} scope`,
    }
  }
  if (allow[0] === '*' && allow.length === 1) {
    return {
      ok: true,
      matched: { layer: findRuleLayer(index, '*', 'allow', agent, options.action), rule: '*' },
    }
  }
  const allowHit = firstMatch(allow, options.path)
  if (allowHit !== undefined) {
    return {
      ok: true,
      matched: {
        layer: findRuleLayer(index, allowHit, 'allow', agent, options.action),
        rule: allowHit,
      },
    }
  }
  return {
    ok: false,
    reason: `agent "${agent}" not permitted to ${options.action} ${options.path} (no matching allow rule)`,
  }
}

export const listAgents = (index: AclIndex): string[] => {
  const names = new Set<string>()
  for (const layer of index.layers) {
    for (const name of Object.keys(layer.file.agents)) names.add(name)
  }
  return [...names].sort()
}

export const explain = (index: AclIndex, agent: string): string[] => {
  const lines: string[] = []
  if (!agentDeclared(index, agent)) return [`agent "${agent}" is not declared`]
  for (const layer of index.layers) {
    const scope = layer.file.agents[agent]
    if (!scope) continue
    lines.push(`# ${layer.source}`)
    if (scope.description) lines.push(`  ${scope.description}`)
    if (scope.read) lines.push(`  read:  ${formatScope(scope.read)}`)
    if (scope.write) lines.push(`  write: ${formatScope(scope.write)}`)
    if (scope.exec) lines.push(`  exec:  ${formatScope(scope.exec)}`)
    if (scope.deny?.length) lines.push(`  deny:  ${scope.deny.join(', ')}`)
  }
  return lines
}

const formatScope = (s: string[] | '*'): string => (s === '*' ? '*' : s.join(', '))

export const _internals = {
  allowList,
  collectAllowRules,
  collectDenyRules,
  agentDeclared,
  findRuleLayer,
  formatScope,
  globMatches,
}
