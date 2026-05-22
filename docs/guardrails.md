# Guardrails

`@factivist/guardrails` is a small set of project-policy checks that run
from git hooks, CI, and (eventually) agent pre-task hooks. Every check is a
pure function over a `GuardrailContext`; bypass is explicit, audited to
ruflo memory, and time-boxed.

## The five built-in guardrails

| Name | What it checks | Bypass classes | Notes |
|------|----------------|----------------|-------|
| **`env-file`** | No `.env` (or `.env.<flavor>`) file is staged. `.env.example` is allowed. | _none_ | Categorical. Never bypassable, including by `sudo`. |
| **`secret-leak`** | Staged file *contents* — AWS / GitHub / Stripe / OpenAI / Anthropic keys, JWTs, PEM private key blocks. | `sudo` | Splitting `.env` out into `env-file` lets `sudo` waive content false positives without softening the hard rule on env files. |
| **`cross-app-import`** | No `apps/*` imports another `apps/*`; no `packages/*` imports `apps/*`. | `experiment`, `sudo` | Codifies the rule already stated in the root `CLAUDE.md`. |
| **`migration-port`** | `DATABASE_URL` does not point at Supabase's pooled endpoint (port 6543). | `local`, `sudo` | pgBouncer in transaction mode rejects DDL — migrations must use the direct (5432) URL. |
| **`age-ddl-outside-migration`** | Apache AGE DDL (`create_graph`, `create_vlabel`, `create_elabel`, `LOAD 'age'`) only appears in `packages/db/drizzle/age/*.sql`. | _none_ | Structural. AGE schema changes go through migration review. |

## Bypass classes

A bypass is requested via environment variables visible in shell history and
CI logs:

```bash
BYPASS_GUARDRAILS=<class> BYPASS_REASON="<why>" [BYPASS_INCIDENT_ID=<id>] <command>
```

| Class | Required extras | Best for | Audit retention |
|-------|-----------------|----------|-----------------|
| `hotfix` | `BYPASS_INCIDENT_ID` | Production incident response (typically read-only or schema-safe changes). | Permanent. Linked to the incident ticket. |
| `experiment` | branch must match `experiment/*` | Throwaway research branches that will never merge. | Until branch deletion. |
| `local` | none | Local-only dev (e.g., Postgres listening on 6543 on a laptop). | Logged but not surfaced in CI dashboards. |
| `sudo` | none | Daily senior-dev override for noisy false-positive guardrails. **Does not bypass `env-file` or `age-ddl-outside-migration`.** | Reviewed weekly; high frequency triggers a guardrail-tuning task. |

### What `sudo` cannot do

- Stage a `.env` (or `.env.production`, `.env.local`, …) file. The
  `env-file` guardrail is unbypassable by every class, including `sudo`.
- Add AGE DDL (`create_graph`, etc.) outside the migration directory. The
  `age-ddl-outside-migration` guardrail is similarly unbypassable.
- Force-push to `main` or skip code review. Those are branch-protection
  rules at the git/GitHub layer, not guardrails.

### Audit trail

Every bypass — and every check, pass or fail — is written to ruflo memory
under the `guardrail-bypass` namespace with this shape:

```json
{
  "guardrail": "cross-app-import",
  "outcome": "bypassed",
  "ts": "2026-05-22T10:14:33.412Z",
  "reason": "1 cross-app import(s) detected",
  "bypass": { "class": "sudo", "reason": "prototype only" },
  "details": ["apps/web/src/api.ts: apps/web may not import from @factivist/api"],
  "branch": "feat/cross-cut",
  "actor": "allan"
}
```

Search the audit log:

```bash
npx ruflo@latest memory search --namespace guardrail-bypass --query "sudo"
```

## Worked examples

### Daily override (sudo)

You're prototyping a quick cross-cut and don't want to plumb a new package.

```bash
BYPASS_GUARDRAILS=sudo BYPASS_REASON="prototype, will refactor in #421" \
  git commit -m "draft: temporary apps/web → @factivist/api shortcut"
```

`cross-app-import` records a `bypassed` audit entry. `env-file` and
`age-ddl-outside-migration` would still block — sudo is not a magic wand.

### Production incident (hotfix)

```bash
BYPASS_GUARDRAILS=hotfix BYPASS_REASON="DB CPU at 100%" \
  BYPASS_INCIDENT_ID=INC-4521 \
  bun run db:migrate
```

`migration-port` is one of the few guardrails this targets; the incident ID
is mandatory so the audit entry links back to the ticket.

### Experiment branch

```bash
git checkout -b experiment/cors-overhaul
BYPASS_GUARDRAILS=experiment BYPASS_REASON="proving the new flow" \
  bunx lefthook run pre-commit
```

The `experiment/*` branch prefix is enforced — using this class on `main`
or a `feat/*` branch fails with a clear message.

### Local-only dev

```bash
BYPASS_GUARDRAILS=local BYPASS_REASON="local docker on 6543" \
  bun run db:migrate
```

Only `migration-port` accepts `local` — everything else still blocks.

## Adding a new guardrail

1. Create `packages/guardrails/src/registry/<name>.ts` exporting a
   `Guardrail` object. Keep `run()` a pure function.
2. Add it to the `ALL` array in `packages/guardrails/src/registry/index.ts`.
3. Write unit tests in `packages/guardrails/src/__tests__/registry.test.ts`.
4. If the guardrail belongs in a git hook, add a stanza to `lefthook.yml`.
5. Update this doc and the table at the top.

## Running guardrails manually

```bash
# List every registered guardrail
cd packages/guardrails && bun run src/cli.ts list

# Run one against the current staged files
bun run src/cli.ts check secret-leak

# Run everything
bun run src/cli.ts check-all

# Run against an explicit file list (used by lefthook)
bun run src/cli.ts check cross-app-import --staged-files apps/web/src/x.ts

# Attribute to an agent (used when invoked from ruflo workers)
bun run src/cli.ts check secret-leak --actor security-auditor
```

Exit codes: `0` for pass / bypassed, `1` for fail, `2` for misuse.
