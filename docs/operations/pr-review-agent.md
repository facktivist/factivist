# PR Reviewer Agent — Operations Runbook

> Production setup, gating model, skill loadout, and troubleshooting for the
> Claude-powered **`pr-reviewer`** agent that auto-reviews collaborator PRs.
>
> **Status:** advisory only — not a branch-protection gate. `ci.yml` remains
> the merge gate.

---

## 1. What it does

On every collaborator PR event, the agent:

1. Loads the project [knowledge graph](../knowledge-graph/pr-reviewer-kg.md).
2. Picks a skill loadout based on which files changed (see §5).
3. Runs **7 quality gates** (best practices, architecture, lint+tests,
   performance, dependencies, security, schema/queries).
4. Posts **one** structured PR review with a verdict —
   `APPROVE` / `COMMENT` / `REQUEST_CHANGES`.

Verdict is computed by bash from the agent's own review markdown, so the
LLM cannot game the gate counts.

## 2. Files

| Purpose | Path |
|---------|------|
| Workflow | `.github/workflows/pr-review-agent.yml` |
| Agent spec | `.claude/agents/github/pr-reviewer.md` |
| Knowledge graph | `docs/knowledge-graph/pr-reviewer-kg.md` |
| Run history | `docs/knowledge-graph/pr-reviewer-runs.jsonl` *(appended by the agent)* |
| KG drift guard workflow | `.github/workflows/kg-drift-guard.yml` |
| KG drift guard script | `scripts/ci/kg-drift-guard.sh` |
| This runbook | `docs/operations/pr-review-agent.md` |

## 3. Gating model (who gets reviewed)

Two-layer defense in depth — both must pass before any LLM call.

### Layer 1 — workflow `gate` job (cheap, no secrets)

| Condition | Action |
|-----------|--------|
| `author == 'dependabot[bot]'` | **skip** |
| `author` matches `*[bot]` | **skip** |
| `author_association ∉ {OWNER, MEMBER, COLLABORATOR}` | **skip** |
| `draft == true` | **skip** |
| otherwise | **proceed** |

`CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, and `NONE` are excluded by design —
forks from non-collaborators do not get an automated review.

### Layer 2 — agent abort

The agent re-checks `PR_AUTHOR` ends-with `[bot]` and aborts without
commenting. Belt-and-suspenders: if someone misconfigures the workflow
filter, the agent still won't review a bot PR.

### Why `pull_request_target`

The workflow uses `pull_request_target` because it needs the
`ANTHROPIC_API_KEY` secret. To avoid the TOCTOU window where a fork could
force-push between checkout and review, the checkout is **pinned to
`github.event.pull_request.head.sha`** (the SHA at PR-event time), not the
branch ref.

## 4. Setup checklist (one-time)

You'll need to do these manually — the agent never touches `.env` files,
secrets, or GitHub org settings.

- [ ] **Add repo secret `ANTHROPIC_API_KEY`**
      `Settings → Secrets and variables → Actions → New repository secret`
- [ ] **Enable workflow write permissions**
      `Settings → Actions → General → Workflow permissions → "Read and write permissions"`
- [ ] **(Optional) Allow the workflow on forks**
      `Settings → Actions → General → Fork pull request workflows`.
      Default ("Require approval for first-time contributors") is fine —
      gating in §3 will skip them anyway.
- [ ] **(Optional) Add to branch protection as a non-required check** if you
      want it visible on the PR but not blocking merge.

No env var needs to land in `.env` files. Everything is repo-secret scoped.

## 5. Skill routing (loaded per-diff)

Always loaded: `code-reviewer`, `pr-review-expert`.

| Diff touches | Skills loaded |
|--------------|---------------|
| `packages/db/**`, `*.sql`, migrations | `drizzle-best-practices` · `supabase-postgres-best-practices` · `senior-data-engineer` |
| `apps/web/**` | `next-best-practices` · `vercel-react-best-practices` · `senior-frontend` |
| `apps/mobile/**` | `react-native-best-practices` · `senior-frontend` |
| `apps/api/**` | `senior-backend` · `senior-fullstack` |
| Cross-package, `tooling/**`, `turbo.json` | `monorepo-navigator` · `senior-architect` |
| Tests, vitest config | `senior-qa` |
| `package.json`, `bun.lock` | `dependency-auditor` |
| Auth / ZKP / contracts / middleware | `senior-security` · `security-guidance` · `senior-secops` |
| Workflows / deploy / observability | `senior-secops` · `observability-designer` |
| Perf-sensitive paths | `performance-profiler` · `karpathy-coder` |
| Strategic concerns | `cto-advisor` |

After 25 accumulated runs the agent also loads `self-improving-agent` and
proposes a KG tuning **as a PR comment** — never auto-committed.

## 6. The seven gates (what makes a review fail)

| # | Gate | Hard-fail signal |
|---|------|------------------|
| 1 | Best practices | `: any`, `@ts-ignore`, `console.log`, raw SQL in changed files |
| 2 | Architecture | Cross-`apps/*` import; `apps/*` importing `@factivist/db`; new file > 500 LOC; bounded-context boundary crossed without API |
| 3 | Lint + tests + coverage | `bun run lint` or `bun run test:coverage` exits ≠ 0; coverage drops below 95/95/95/90 |
| 4 | Performance | `await` inside `.map`; DB query in a loop; new client component > 50 KB delta; missing index on new column used in `WHERE` |
| 5 | Dependencies | Critical/high CVE introduced; major-version bump without an ADR |
| 6 | Security | Secret pattern in diff; new route without auth middleware; **ADR-0010 (anonymity floor) violation on a moderator-facing surface** |
| 7 | Schema / queries | Missing migration; NOT NULL added without backfill; FK without index; new table without RLS policy |

Single-skill findings are downgraded `fail → warn` unless they directly
violate an ADR — cuts false positives.

## 7. Output contract

The agent posts exactly one review per run. The body is structured:

```markdown
## 🤖 pr-reviewer — verdict: REQUEST_CHANGES

> Grounded review against the project knowledge graph.
> Skills loaded: code-reviewer, pr-review-expert, drizzle-best-practices, ...
> Files changed: 12 · Hard fails: 2 · Warnings: 4

### Criteria
| # | Criterion | Verdict | Evidence |
| 1 | Best practices | fail | apps/api/src/routes/x.ts:42 |
...

### Hard fails (must fix before merge)
1. **Raw SQL in route** — apps/api/src/routes/x.ts:42 — cites: ADR-0001
   <explanation + suggested patch>

### Warnings (consider before merge)
- ...

### Approved
<one paragraph on what looks good>
```

Inline suggestions are capped at 10, highest severity first.

## 8. Running it manually (debug)

The workflow has no `workflow_dispatch` trigger by design — runs are PR-bound.
To test the agent locally against an arbitrary PR:

```bash
# 1. Export env vars the agent expects
export PR_NUMBER=123
export PR_HEAD_SHA=$(gh pr view 123 --json headRefOid -q .headRefOid)
export PR_BASE_REF=$(gh pr view 123 --json baseRefName -q .baseRefName)
export PR_AUTHOR=$(gh pr view 123 --json author -q .author.login)
export GH_REPO=raveracker/factivist

# 2. Run the agent locally (won't post — passes --dry-run via the body file)
claude --model claude-opus-4-7 \
  --allowed-tools "Bash(bun:*),Bash(git:*),Bash(gh:*),Read,Grep,Glob" \
  "$(cat .claude/agents/github/pr-reviewer.md)"

# 3. Inspect the generated review
cat .claude-pr-review.md
```

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Workflow runs the gate, then skips review | Author isn't a collaborator yet | `Settings → Collaborators → Add` (or accept the gate's skip) |
| `Error: ANTHROPIC_API_KEY is empty` | Secret missing or org-restricted | Add the secret per §4 |
| `gh: command not found` | Action base image without `gh` | The `claude-code-action@v1` runner ships with `gh` — pin a more recent action tag |
| Review never posts, no error | `--allowed-tools` denied `Bash(gh:*)` | Confirm the workflow's `claude_args` block still lists `Bash(gh:*)` |
| Verdict is `APPROVE` but hard-fails appear in the table | Should not happen — bash logic in step 6 overrides the LLM. File a bug if it does. |
| Run history file not updated | The agent uses Write on the JSONL append; ensure repo isn't read-only mounted | Re-run; if persistent, raise to `senior-secops` |

## 10. Keeping the KG in sync (drift guard)

The reviewer's KG is a *derived index* of `docs/architecture/**` + `docs/adr/**`.
If those source files change but the KG doesn't, the agent will cite stale
invariants. A CI guard prevents that.

**Workflow:** `.github/workflows/kg-drift-guard.yml`
**Script:** `scripts/ci/kg-drift-guard.sh`

### When it fires

Triggers on any PR that touches:

- `docs/architecture/**`
- `docs/adr/**`
- `docs/knowledge-graph/pr-reviewer-kg.md` *(so guard-only tweaks still run it)*

Fails the build if the architecture/ADR set changed and the KG file did not.

### Override label — `kg-drift-ok`

For changes that genuinely don't affect the KG (typos, formatting,
renumbering, internal-only sections), add the `kg-drift-ok` label to the PR.
The guard exits 0 with a `::notice` annotation.

Apply the label conservatively. Use it for "this doesn't change any rule the
reviewer cites"; do **not** use it to dodge KG maintenance when invariants
or ADR titles actually changed.

```bash
gh pr edit <PR_NUMBER> --add-label kg-drift-ok
```

### What to update in the KG

| Change in source | KG section to update |
|------------------|----------------------|
| New ADR file | §3 ADR index — add a row |
| ADR status change (accepted → superseded) | §3 ADR index — update row |
| Bounded context added/renamed | §2 bounded contexts table |
| Package added/moved/removed | §1 topology + dependency direction |
| New hard invariant | §2 invariants column + (if security) §5 hot paths |
| New skill added to loadout | §4 skill ↔ surface map |
| Coverage threshold change | §6 gate 3 row |

### Run locally

```bash
BASE_REF=main LABELS='[]' bash scripts/ci/kg-drift-guard.sh
# To test the override:
BASE_REF=main LABELS='["kg-drift-ok"]' bash scripts/ci/kg-drift-guard.sh
```

---

## 11. Removing the agent

```bash
git rm .github/workflows/pr-review-agent.yml \
       .github/workflows/kg-drift-guard.yml \
       scripts/ci/kg-drift-guard.sh \
       .claude/agents/github/pr-reviewer.md \
       docs/knowledge-graph/pr-reviewer-kg.md \
       docs/knowledge-graph/pr-reviewer-runs.jsonl \
       docs/operations/pr-review-agent.md
```

Then delete the `ANTHROPIC_API_KEY` repo secret if no other workflow uses it.

---

*See also:* [knowledge graph](../knowledge-graph/pr-reviewer-kg.md) ·
[deploy runbook](./deploy-runbook.md) ·
[ADR-0010 anonymity floor](../adr/0010-citizen-anonymity-floor.md)
