# Factivist PR Reviewer — Knowledge Graph

> Synthesized, fast-loading project context for the `pr-reviewer` agent
> (`.claude/agents/github/pr-reviewer.md`).
>
> **Use this file as the index.** Drill into the linked source-of-truth docs
> only when a finding requires citation.
>
> Source documents (authoritative):
>
> - `CLAUDE.md` (root) — monorepo rules, dependency graph, testing thresholds
> - `docs/architecture/package-map.md` — context ↔ apps ↔ packages
> - `docs/architecture/bounded-contexts.md` — 7 contexts + ACLs
> - `docs/architecture/aggregates.md` — DDD aggregates + invariants
> - `docs/architecture/threat-model.md` — STRIDE + anonymity vectors
> - `docs/architecture/zkp-key-custody.md` — ZKP trust boundary
> - `docs/adr/0001..0021.md` — accepted architecture decisions
> - `packages/shared/__tests__/atid-registry.ts` — 36 testable assertions
>
> Regenerate when: an ADR is accepted, a bounded context is added/renamed, a
> package moves, a coverage threshold changes, or a new top-level skill enters
> the loadout.

---

## 1. Topology

```
apps/
  web/      Next.js 16 + HeroUI v3 + Tailwind v4.3   (Server Components default)
  api/      Hono on Bun (Fly.io BOM primary, SIN failover)
  mobile/   Expo SDK + Expo Router + HeroUI Native + Uniwind
packages/
  shared/      Zod schemas, types, constants, ATID registry  (zero deps except Zod)
  db/          Drizzle ORM schema + migrations + seed (Supabase Postgres)
  ui/theme/    oklch tokens (primitive + semantic)
  ui/web/      HeroUI v3 wrappers (compound API)
  ui/native/   HeroUI Native wrappers (compound API)
  contracts/   Solidity 0.8.x + Hardhat (CitizenVerifier.sol)
tooling/
  tsconfig/  tailwind-config/  vitest-config/  (95/95/95/90 thresholds)
```

**Hard dependency direction** — never violate:

```
tooling/* → packages/shared → packages/db → apps/api
                                          → packages/ui/* → apps/{web,mobile}
```

`apps/*` **MUST NOT** import from another `apps/*`. `packages/*` **MUST NOT**
import from `apps/*`. PRs that violate the graph are an automatic hard-fail
under criterion 2 (architecture).

---

## 2. Seven bounded contexts (review them at the seam)

| # | Context | Owns aggregates | Hard invariants (cite if violated) |
|---|---------|-----------------|------------------------------------|
| 1 | **identity** | Citizen | nullifier-unique; witness zeroisation server-side; ZKP key custody (`zkp-key-custody.md`) |
| 2 | **complaint** | Complaint, Photo | photo upload only via signed Storage webhook; FK to `geo` constituency |
| 3 | **moderation** | ModerationCase, Flag | citizen anonymity floor (ADR-0010) — never expose citizen id in moderator-facing surfaces |
| 4 | **discovery** | *(read-only)* | Postgres FTS only (ADR-0005); no Meilisearch/Elastic |
| 5 | **geo** | Constituency *(read-only)* | closed dataset (ADR-0007); slug PKs (ADR-0012); manual geo (ADR-0013) |
| 6 | **comment** | Comment | nullifier guard on write; auto-enqueue to moderation on flag |
| 7 | **admin** | Admin, FeatureFlag | operator-only; audit-logged |

Cross-context calls go through the API; **no direct DB import across context
boundaries**.

---

## 3. ADR index (cite by number in findings)

| Topic | ADR | One-line rule |
|-------|-----|---------------|
| DB access | 0001 | Drizzle-only — no raw SQL, no Prisma |
| Validation | 0002 | Zod in `packages/shared/`, used on both client + server |
| On-chain | 0003 | Single Solidity contract `CitizenVerifier`; verifier-only |
| Storage | 0004 | Supabase Storage; no IPFS |
| Search | 0005 | Postgres FTS — no Meilisearch/Elastic at S1 |
| Mod queue | 0006 | Postgres-backed moderation queue |
| Geo dataset | 0007 | Closed dataset (DataMeet + ECI + India Post PIN) |
| Mobile | 0008 | Expo single codebase, no separate iOS/Android repos |
| Net | 0009 | Supabase custom domain (India ISP mitigation) |
| Privacy | 0010 | **Citizen anonymity floor** — no citizen id in moderator surfaces |
| ZKP | 0011 | Hybrid proving — rapidsnark high-end + server-side fallback |
| Schema | 0012 | Slug PKs for geo reference tables |
| Geo UX | 0013 | Manual geo tagging at S1 |
| Legal | 0014 | Single Grievance Officer; 24h ack / 36h takedown |
| Logs | 0015 | CERT-In 180-day India logs |
| DPDP | 0016 | Minimisation — no new PII fields without §16 review |
| Picker | 0017 | Combobox + breadcrumb constituency picker |
| Proving | 0018 | rapidsnark iOS / snarkjs Android |
| Tab order | 0019 | Same tab order both platforms, no FAB |
| Flag UX | 0020 | `pii-leak` is a distinct flag reason |
| a11y | 0021 | axe-core WCAG 2.2 AA in CI |

---

## 4. Skill ↔ surface map (load the right skill for the diff)

| Diff touches | Load skill |
|--------------|------------|
| `packages/db/**`, migrations, `*.sql` | `drizzle-best-practices` + `supabase-postgres-best-practices` + `senior-data-engineer` |
| `apps/web/**` (React/Next) | `next-best-practices` + `vercel-react-best-practices` + `senior-frontend` |
| `apps/mobile/**` (Expo/RN) | `react-native-best-practices` + `senior-frontend` |
| `apps/api/**` (Hono routes) | `senior-backend` + `senior-fullstack` |
| Cross-package refactor, `tooling/**`, `turbo.json` | `monorepo-navigator` + `senior-architect` |
| `*.test.ts`, `__tests__/**`, `e2e/**`, vitest configs | `senior-qa` |
| `package.json`, `bun.lock` deltas | `dependency-auditor` |
| `apps/api/src/middleware/**`, auth, ZKP, `packages/contracts/**` | `senior-security` + `security-guidance` + `senior-secops` |
| `.github/workflows/**`, deploy scripts | `senior-secops` + `observability-designer` |
| Perf-sensitive paths (cold start, FTS, render lists) | `performance-profiler` + `karpathy-coder` |
| Strategic / scope-creep concerns | `cto-advisor` |

Always loaded baseline: `code-reviewer`, `pr-review-expert`.

---

## 5. Hot paths & risk-tagged files

These are change-magnets — flag any diff that touches them for extra scrutiny
(cite the file + criterion):

- `apps/api/src/middleware/auth.ts` — Supabase JWT verify (JWKS local)
- `apps/api/src/routes/identity/prove.ts` — server-side witness zeroisation
- `apps/api/src/routes/storage/finalize.ts` — HMAC-signed Storage webhook
- `scripts/anonymity-grep-guard.sh` — anonymity floor static rule
- `scripts/ci/aidefence-scan-diff.ts` — PII regex fallback
- `packages/db/src/schema/**` — schema changes need migration + seed update
- `packages/shared/__tests__/atid-registry.ts` — testable assertions registry
- `apps/web/src/app/admin/**` — operator surfaces (ADR-0010 critical)
- `apps/mobile/src/features/identity/**` — hybrid ZKP proving path

---

## 6. Quality gates (criteria → command → hard-fail signal)

| # | Criterion | Command (run in PR) | Hard-fail signal |
|---|-----------|---------------------|------------------|
| 1 | Best practices | grep for `any`, `@ts-ignore`, `console.log`, raw SQL | any occurrence in changed files |
| 2 | Architecture | inspect imports vs §1 dependency graph; bounded-context boundaries | cross-context DB import; `apps/*` → `apps/*` import; new God object |
| 3 | Lint + tests | `bun run lint` then `bun run test:coverage` | non-zero exit; coverage below 95/95/95/90 |
| 4 | Performance | look for N+1 queries, sync I/O in hot paths, missing indexes, oversized client bundles | added query inside a loop; `await` in `.map`; client component > 50KB delta |
| 5 | Dependencies | `bun outdated` + diff `bun.lock`; check ranges; CVE check | new dep with known critical CVE; major-version bump w/o ADR |
| 6 | Security | run `gh api repos/.../dependency-graph/...` advisories; scan diff for secrets; STRIDE per `threat-model.md` | secret pattern in diff; new endpoint without auth middleware; ADR-0010 violation |
| 7 | Schema / queries | Drizzle migration present? indexes added? RLS policy updated? query uses joins not loops? | new table without RLS; FK added without index; `.find()` over loop |

Soft findings (do NOT block merge): comment style, doc nits, optional refactors.

---

## 7. Output contract

The agent posts **one** PR review with:

- Verdict — `APPROVE` / `REQUEST_CHANGES` / `COMMENT`
- Per-criterion table — `pass | warn | fail` + evidence (file:line)
- Inline suggestions only for `fail` findings, max 10 per review
- Citation of ADRs / KG sections by `#section` for every `fail`

See the agent's "Output format" section for the exact markdown template.
