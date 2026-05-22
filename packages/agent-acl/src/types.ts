/**
 * Types for per-agent file access control.
 *
 * The file format is YAML; this module describes its shape after parsing.
 * Two surfaces matter:
 *   1. `AclFile` — what each `.agent-acl.yaml` document looks like.
 *   2. `AclIndex` — the merged, queryable view produced by the loader.
 */

export type AclAction = 'read' | 'write' | 'exec'

export interface AgentScope {
  /** Glob patterns this agent may READ. `"*"` shorthand for the whole tree. */
  read?: string[] | '*'
  /** Glob patterns this agent may WRITE. */
  write?: string[] | '*'
  /** Glob patterns this agent may EXEC (bash, scripts). */
  exec?: string[] | '*'
  /** Patterns explicitly excluded from this agent's scope (highest priority). */
  deny?: string[]
  /** Optional human-readable note shown in `acl list`. */
  description?: string
}

export interface AclFile {
  /** Schema version — bumped if shape changes incompatibly. */
  version: 1
  /** Root path the file's globs are interpreted relative to. */
  basePath?: string
  /** Coordinator agent identity (only one allowed). */
  coordinator?: string
  /** Map of agent name → scope. */
  agents: Record<string, AgentScope>
}

export interface AclLayer {
  /** Absolute path to the source file (for error messages). */
  source: string
  /** Workspace-relative base — overlay layers anchor their globs here. */
  base: string
  file: AclFile
}

export interface AclIndex {
  /** All layers in load order: root first, then per-package overlays. */
  layers: AclLayer[]
  /** Coordinator identity (taken from the deepest layer that declares one). */
  coordinator?: string
}

export type Verdict =
  | { ok: true; matched: { layer: string; rule: string } }
  | { ok: false; reason: string }
