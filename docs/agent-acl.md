# Agent ACL

`@factivist/agent-acl` declares per-agent file access scopes. The Coordinator
holds the master scope; every worker agent (web, api, mobile, db, codegraph,
guardrails, domain-kg, security-auditor) has a narrow, declarative slice of
the workspace. The check is fail-closed: if no rule matches, access is
denied.

## File layout

```
.agent-acl.yaml                              # root — declares every agent identity
apps/web/.agent-acl.yaml                     # overlay — adds to web-agent's scope
apps/api/.agent-acl.yaml
apps/mobile/.agent-acl.yaml
packages/db/.agent-acl.yaml
packages/codegraph/.agent-acl.yaml
packages/guardrails/.agent-acl.yaml
packages/agent-acl/.agent-acl.yaml
```

Overlays **add** rules; they cannot revoke. Revocation requires editing the
root file so the change is a single auditable diff.

## YAML schema

```yaml
version: 1                       # required, currently always 1
coordinator: coordinator         # optional in overlays; the deepest declaration wins
agents:
  <agent-name>:
    description: "..."           # shown in `acl explain`
    read:  ["packages/db/**"]    # or "*" for the whole tree
    write: ["packages/db/src/**"]
    exec:  ["packages/db/**"]
    deny:  [".env", "**/secrets/**"]
```

- Globs use `*`, `**`, and `?`. No brace groups or character classes — keep
  the policy easy to audit.
- `deny` always wins over `allow`, even for the coordinator.
- `"*"` shorthand means "everything"; equivalent to `["**"]` but cheaper.

## Agent roster (root file)

| Agent | Description | Read | Write |
|-------|-------------|------|-------|
| **coordinator** | Orchestrator — only one allowed | `*` | `*` (except `.env`) |
| **web-agent** | Frontend (Next.js) | `apps/web/**`, `packages/shared`, `packages/ui`, `tooling` | `apps/web/**` |
| **api-agent** | Backend (Hono) | `apps/api/**`, `packages/api`, `packages/db`, `packages/shared`, `tooling` | `apps/api/**` |
| **mobile-agent** | Expo / React Native | `apps/mobile/**`, `packages/shared`, `packages/ui/native`, `packages/ui/theme`, `tooling` | `apps/mobile/**` |
| **db-agent** | Drizzle + AGE | `packages/db/**`, `packages/shared`, `tooling` | `packages/db/src/**` (NOT `drizzle/`) |
| **codegraph-agent** | Code graph maintenance | `*` | `packages/codegraph/**` |
| **guardrails-agent** | Guardrail authoring | `*` | `packages/guardrails/**`, `lefthook.yml`, `docs/guardrails.md` |
| **domain-kg-agent** | AGE domain-KG ingestion | `*` | (none — writes via DB client) |
| **security-auditor** | Read-only auditor | `*` | (none) |

Per-package overlays narrow or extend specific corners — see each
`.agent-acl.yaml` for the exact rules.

## CLI

```bash
cd packages/agent-acl

# Every declared agent (coordinator is marked)
bun run acl list

# Print effective scope per layer
bun run acl explain web-agent

# Fail-closed permission check
bun run acl check web-agent apps/web/src/page.tsx write
# → [ALLOW] web-agent write apps/web/src/page.tsx — rule "apps/web/**" (...)

bun run acl check web-agent apps/api/handler.ts write
# → [DENY]  web-agent write apps/api/handler.ts — not permitted to write apps/api/handler.ts
```

Exit codes: `0` for allow, `1` for deny, `2` for misuse.

## Wiring into ruflo

Ruflo workers call `checkAcl` from their pre-task hook. A worker
named `web-agent` attempting to write `apps/api/handler.ts` is rejected
before any file system call happens. The hook records the denial to
ruflo memory under `agent-acl-violation` for review.

Pseudocode for the pre-task hook:

```typescript
import { checkAcl } from '@factivist/agent-acl/check'
import { loadAcl }  from '@factivist/agent-acl/loader'

const index = await loadAcl(process.cwd())

const verdict = checkAcl(index, agentName, {
  path: relativeWorkspacePath,
  action: requestedAction,  // 'read' | 'write' | 'exec'
})

if (!verdict.ok) {
  await ruflo.memory.store('agent-acl-violation', { agent: agentName, ... })
  throw new Error(verdict.reason)
}
```

## Resolution order

For an `(agent, path, action)` triple:

1. **Deny rules** across every layer the agent appears in. First match wins.
2. **Coordinator shortcut**: if the agent is the declared coordinator,
   allow (deny has already been consulted).
3. **Allow rules** for the requested action, collected across layers in
   load order (root → packages/* → apps/*). First match wins.
4. Otherwise: deny with `no matching allow rule`.

The first-match-wins design keeps the policy debuggable — `acl check` always
reports which rule and which layer produced the verdict.

## Adding a new agent

1. Add it to the root `.agent-acl.yaml` with a narrow initial scope.
2. (Optional) Add an overlay in the package(s) the agent owns to extend
   its scope where needed.
3. Run `bun run acl explain <new-agent>` to confirm the effective scope.
4. Wire ruflo so workers spawned with `name: '<new-agent>'` consult the ACL
   in their pre-task hook.

## Adding a new bounded scope

If a package needs more granular per-agent rules, create
`packages/<x>/.agent-acl.yaml`. Always start with `version: 1`. The loader
discovers overlays automatically — no central registry to update.

## What this layer is NOT

- It does not block writes by humans editing locally. Humans go through
  git review; agents are scoped here so they can't reach outside their
  remit even if they want to.
- It does not stop a worker from *reading* files inside its allow scope.
  Read-side enforcement is by glob; symbol-level rules are out of scope
  for v1.
- It is not a replacement for the project's `env-file` /
  `secret-leak` guardrails. ACL gates intent; guardrails block commits.
