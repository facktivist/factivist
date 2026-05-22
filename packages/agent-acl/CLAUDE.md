# packages/agent-acl — Per-Agent File Access Control

## Purpose

Declarative scopes for the agents in this monorepo. The root `.agent-acl.yaml`
defines every agent identity once. Each `packages/*/.agent-acl.yaml` and
`apps/*/.agent-acl.yaml` overlays per-package rules. A `checkAcl(agent, path,
action)` returns `pass`/`deny` with a human-readable reason — wired into
ruflo's pre-task hook to fail-closed before a worker writes outside its scope.

## Rules

- Read-write-execute scopes only. Anything finer (per-symbol, per-line) is
  out of scope for v1.
- Coordinator is the only agent with `write: "*"`. Worker agents always have
  a narrow scope.
- Per-package overrides ADD to the root ACL; they never remove globally
  granted rights. Removal requires editing the root file (auditable in a
  single PR).
- Patterns are picomatch-flavored globs evaluated against workspace-relative
  paths. The first matching rule wins.

## Skills
@skills/tdd-guide
@skills/coverage
