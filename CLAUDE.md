# Ruflo — Claude Code Configuration

<!-- intent-skills:start -->
## Skill Loading

Before substantial work:
- Skill check: run `bunx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Keep files under 500 lines
- Validate input at system boundaries

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config
- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

```bash
npx ruflo@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task | Agents | Topology |
|------|--------|----------|
| Bug Fix | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refactor | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Security | security-architect, auditor | hierarchical |

### When to Swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Haiku | Simple tasks, low complexity |
| 3 | Sonnet/Opus | Architecture, security, complex reasoning |

## Memory & Learning

### Before Any Task
```bash
npx ruflo@latest memory search --query "[task keywords]" --namespace patterns
npx ruflo@latest hooks route --task "[task description]"
```

### After Success
```bash
npx ruflo@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx ruflo@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category | Key Tools |
|----------|-----------|
| **Memory** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Bridge** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agents** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Security** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Background Workers

| Worker | When |
|--------|------|
| `audit` | After security changes |
| `optimize` | After performance work |
| `testgaps` | After adding features |
| `map` | Every 5+ file changes |
| `document` | After API changes |

```bash
npx ruflo@latest hooks worker dispatch --trigger audit
```

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
bun run build && bun run test
```

## CLI Quick Reference

```bash
npx ruflo@latest init --wizard           # Setup
npx ruflo@latest swarm init --v3-mode     # Start swarm
npx ruflo@latest memory search --query "" # Vector search
npx ruflo@latest hooks route --task ""    # Route to agent
npx ruflo@latest doctor --fix             # Diagnostics
npx ruflo@latest security scan            # Security scan
npx ruflo@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add ruflo -- npx -y ruflo@latest mcp start
npx ruflo@latest daemon start
npx ruflo@latest doctor --fix
```

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash.

---

# ─── PROJECT CONTEXT ───

## Monorepo Structure

```
apps/
  web/              → Next.js 16 + HeroUI v3 + Tailwind CSS v4.3
  api/              → Hono on Bun runtime
  mobile/           → Expo + HeroUI Native + Uniwind
packages/
  ui/theme/         → Primitive + semantic design tokens (oklch)
  ui/web/           → HeroUI v3 component wrappers
  ui/native/        → HeroUI Native component wrappers
  shared/           → Types, Zod validators, constants (zero deps except Zod)
  db/               → Drizzle ORM schema + Supabase Postgres
tooling/
  tsconfig/         → base.json, react.json, node.json
  tailwind-config/  → Shared Tailwind CSS v4.3 preset + HeroUI plugin
  vitest-config/    → base.ts, react.ts, node.ts (coverage thresholds)
```

Each app and package has its own CLAUDE.md with domain-specific skills and rules.
Full skills catalog: `.claude/skills/SKILLS_INDEX.md` (329 skills, never auto-loaded).

## Package Manager

Bun exclusively. Never use npm, yarn, or pnpm for install/run/add.
Exception: `npx` is acceptable for one-off CLI tools (e.g., `npx ruflo@latest`).

## Commands

| Action | Command |
|--------|---------|
| Install | `bun install` |
| Dev (all) | `bun run dev` |
| Build (all) | `bun run build` |
| Test | `bun run test` |
| Test + coverage | `bun run test:coverage` |
| Test E2E web | `cd apps/web && bun run test:e2e` |
| Test E2E mobile | `cd apps/mobile && bun run test:e2e:ios` |
| Lint | `bun run lint` |
| Format | `bunx @biomejs/biome format --write .` |
| Full check | `bun run check` (lint → test:coverage → build) |
| DB generate | `bun run db:generate` |
| DB migrate | `bun run db:migrate` |
| gh account check | `bun run gh:check` |

## GitHub Identity

This repo MUST push and call the GitHub API as the **`facktivist`** gh account. The user's global default is `raveracker`, so a per-repo override is required.

**Mechanism: direnv + `GH_TOKEN`.** A gitignored `.envrc` at repo root exports `GH_TOKEN=$(gh auth token -u facktivist)` on `cd` into the repo. `GH_TOKEN` takes precedence over gh's global active account, so `gh` and `git push` both speak as `facktivist` inside this directory and revert to the global default outside it.

**One-time setup (per developer machine):**
```sh
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc   # or bash/fish equivalent
cd <repo>
direnv allow                                   # approves .envrc
bun run gh:check                               # should print exit 0
```

**Guards in place:**
- `git push` → lefthook `pre-push.gh-account` aborts if active gh ≠ `facktivist`.
- Manual verification → `bun run gh:check`.
- Emergency bypass → `BYPASS_GH_ACCOUNT_CHECK=1 <command>` (audited intent only).

If direnv isn't installed, fall back to running `gh auth switch -u facktivist` manually when entering the repo — the guards will still catch a forgotten switch.

## Testing — ENFORCED

| Metric | Threshold |
|--------|-----------|
| Lines | ≥ 95% |
| Functions | ≥ 95% |
| Statements | ≥ 95% |
| Branches | ≥ 90% |

- **Vitest** for unit + integration. **Playwright** for web E2E. **Detox** for mobile E2E.
- Test files: `*.test.ts` in `__tests__/`. E2E files: `*.spec.ts` in `e2e/`.
- Every new feature MUST include tests. CI fails below threshold.

## Code Style

- TypeScript strict mode. No `any`. No `@ts-ignore`.
- Biome for linting + formatting. Conventional Commits.
- Feature-based file structure inside apps, not type-based.

## Architecture Rules

- Zod schemas in `packages/shared/` — validate on client and server
- Drizzle ORM only. No raw SQL. No Prisma.
- TanStack Query for server state. Zustand for client state. React Hook Form + Zod for forms.
- HeroUI compound components (dot notation). Semantic variants only. oklch tokens.
- Server Components by default in Next.js. `"use client"` only when needed.
- Supabase custom domains REQUIRED for all API endpoints (India ISP mitigation)
- All packages use `"exports"` field for multi-bundler resolution

## Agent Routing for This Project

| Task | Agents | Notes |
|------|--------|-------|
| New feature | architect → coder → tester → reviewer | Full pipeline |
| New API route | coder → tester | Include `app.request()` integration test |
| New component | coder → tester | Include Testing Library render test |
| Schema change | architect → coder → tester | Must include migration + seed update |
| Refactor | architect → coder → reviewer | Must maintain 95% coverage |
| Cross-package | architect → coder → tester → reviewer | Fan-out if independent |

## Core Skills (always loaded)

@skills/bun
@skills/turborepo
@skills/hono
@skills/drizzle-best-practices
@skills/supabase-postgres-best-practices
@skills/supabase
@skills/zod
@skills/biome-developer
@skills/tailwind-4-docs
@skills/monorepo-navigator
@skills/tdd-guide
@skills/coverage

Domain-specific skills are declared in each package's CLAUDE.md.
For skill discovery, consult `.claude/skills/SKILLS_INDEX.md`.

## Dependency Graph

```
tooling/* ─────────────────┐
packages/shared ───────────┤
                           ▼
                    packages/db
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          apps/api    packages/ui   (parallel)
              │            │
              ▼            ▼
          apps/web ◄── packages/ui/web
          apps/mobile ◄── packages/ui/native
```

Agents MUST respect this graph. Never import from apps/ into packages/. Never import from one app into another.