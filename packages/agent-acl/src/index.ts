/**
 * `@factivist/agent-acl` — per-agent file access control.
 *
 * Prefer subpath imports:
 *
 *   import { loadAcl } from '@factivist/agent-acl/loader'
 *   import { checkAcl } from '@factivist/agent-acl/check'
 */

export { type CheckOptions, checkAcl, explain, listAgents } from './check.ts'
export { loadAcl } from './loader.ts'
export type {
  AclAction,
  AclFile,
  AclIndex,
  AclLayer,
  AgentScope,
  Verdict,
} from './types.ts'
