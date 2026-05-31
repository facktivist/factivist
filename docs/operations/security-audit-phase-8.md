# Phase 8 §8.6 security audit — S1

Audit pass executed 2026-05-25 by `sec-auditor` (system-architect role
acting as security auditor in single-maintainer S1). One row per §8.6
checklist item, with the evidence file/path used to confirm, current
status, and the action a maintainer needs to take user-side.

Legend:

- **CODE** — enforced in this repo (file path included).
- **OPS** — enforced by dashboard config the maintainer must apply.
- **PASS** — verified.
- **PENDING-OPS** — code is correct; waiting on dashboard / external
  account configuration.

---

| # | §8.6 item | Status | Evidence / action |
|---|-----------|--------|-------------------|
| 1 | Supabase custom domain for all API endpoints | PENDING-OPS | ADR-0009 documents the intent. Maintainer must enable a Supabase custom domain (`api.factivist.example`) in dashboard → Settings → API → Custom domains. India ISP-block mitigation depends on this; do not launch without it. |
| 2 | Supabase row-level security ON every citizens table | PASS (CODE) | `packages/db/drizzle/0004_enable_rls.sql` — RLS enabled on `citizens`, `users`, `audit_log`, `complaints`, `complaint_flags`, `moderation_queue`, `feature_flags`, all reference tables, and `dev_metrics.*`. Default-deny stance; explicit `anon SELECT` only on reference data + published complaints. |
| 3 | Service-role key never reaches the client | PASS (CODE) | Grep audit `apps/web/src` — only `NEXT_PUBLIC_SUPABASE_ANON_KEY` is ever referenced from web. Service-role used exclusively in `apps/api/src/lib/{upload,supabase-auth,supabase-jwks}.ts`. |
| 4 | `complaint-photos` bucket private + signed URLs only | PASS (CODE) | `supabase/config.toml` declares `public = false`. `apps/api/src/lib/upload.ts` uses `createSignedUploadUrl` for client `PUT` + server-side EXIF strip in `acceptUpload` before the public URL is issued. |
| 5 | Server-side EXIF strip before write | PASS (CODE) | `apps/api/src/lib/exif-strip.ts` + integration via `acceptUpload`. Failure → 422; raw upload GC'd by bucket lifecycle. |
| 6 | Cloudflare proxy ON + "Under Attack" toggle | PENDING-OPS / PASS (CODE-DOCS) | Runbook shipped at `docs/operations/runbook-ddos.md`. Maintainer must enable Cloudflare proxy (orange-cloud) on every DNS record. |
| 7 | Fly.io: 256MB RAM, 1 shared-cpu, region bom + sin failover, `min_machines_running=1` | PASS (CODE) | `apps/api/fly.toml` — `[[vm]] cpu_kind = "shared" cpus = 1 memory_mb = 256`, `[[regions]] primary = "bom" backup = ["sin"]`, `min_machines_running = 1`. |
| 8 | Vercel: locked to apps/web + preview branch protection | PASS (CODE) | `apps/web/vercel.json` — `"git": {"deploymentEnabled": {"main": true}}` + framework + outputDirectory pinned. Maintainer must enable "Preview Branch Protection" in Vercel dashboard → Settings → Git → preview branches. |
| 9 | EAS: Android internal track + iOS TestFlight only in S1 | PASS (CODE) | `apps/mobile/eas.json` — `submit.preview.android.track = "internal"`, `releaseStatus = "draft"`. Public store listing requires manual track promotion (deferred to S2 per cost-scenarios.md). |
| 10 | Polygon: deploy from a multisig (3/5 Safe), never an EOA | PENDING-OPS | No code artifact required — this is the Safe-deploy step. Maintainer must set up a 3/5 Safe on Polygon PoS, fund it from a hot key, and deploy `CitizenVerifier.sol` via Safe → Transactions → New transaction → contract interaction. Do not let any EOA hold the `owner` role. |
| 11 | Sentry free tier on web + api + mobile with PII scrub | PASS (CODE) | `packages/shared/src/observability/sentry-scrub.ts` — `beforeSend` hook redacts Aadhaar, email, Indian phone, and `complaint-photos/*` paths. Maintainer must create Sentry projects + paste DSNs into Vercel, Fly secrets, EAS secrets. |
| 12 | `.env` discipline — never edited by Claude | PASS (POLICY) | Documented in `feedback_env_file_hands_off` memory; enforced by the assistant-side rule. New env vars for Phase 8 surfaced in the runbook + this audit's user-side list, never written by tooling. |
| 13 | Bypass guardrails policy | PASS (POLICY) | Documented in `reference_guardrail_bypass_env_vars`. No bypass invocations were used in Phase 8. |

## Findings & corrections

### Critical (none open)

No critical findings.

### High

**H-01 — RLS was OFF in production schema until this migration.** Phase 8
adds `0004_enable_rls.sql`. **Action:** apply via `db-migrate.yml` →
production env → `YES MIGRATE`. Until applied, anon-key consumers
could SELECT every row in every public table.

### Medium

**M-01 — Custom domain not yet provisioned.** ADR-0009 calls for
`api.factivist.example` to sit behind Cloudflare proxy as the
exclusive API origin. Without it, India ISP blocks reach the raw Fly
hostname. **Action:** maintainer provisions Supabase custom domain +
points Cloudflare DNS at the Fly anycast edge before launch.

**M-02 — Polygon contract not yet behind a multisig.** No deployment
exists yet (per `reference_s1_zkp_findings`). **Action:** when the
audited `CitizenVerifier.sol` is ready to deploy, do so exclusively
from a 3/5 Safe; the audit engagement is a pre-condition.

### Low

**L-01 — Sentry DSNs not configured.** Code is ready; DSNs are user-
side ops. Until configured, errors silently drop. **Action:** create
three Sentry projects (web / api / mobile), paste DSNs into the
respective deploy targets.

**L-02 — Cloudflare API token not stored anywhere maintainer-portable.**
The `runbook-ddos.md` calls for a `~/.factivist/cf-token` file.
Maintainer must place it there before an incident; cannot be created
mid-attack.

## Sentry init reference (per app)

Each app must call `Sentry.init` at module load with the shared
`beforeSend`:

```ts
// apps/web/src/lib/sentry.ts (server + client share this; Next.js
// auto-splits)
import * as Sentry from '@sentry/nextjs'
import { beforeSend, dropBreadcrumbCategories } from '@factivist/shared/observability'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend,
  beforeBreadcrumb(crumb) {
    if (dropBreadcrumbCategories.includes(crumb.category as 'console')) return null
    return crumb
  },
})
```

```ts
// apps/api/src/lib/sentry.ts
import * as Sentry from '@sentry/bun'
import { beforeSend } from '@factivist/shared/observability'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend,
})
```

```ts
// apps/mobile/src/lib/sentry.ts
import * as Sentry from '@sentry/react-native'
import { beforeSend } from '@factivist/shared/observability'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  beforeSend,
})
```

Wiring the actual `@sentry/*` packages is deferred to user-side ops —
the apps install them only after the maintainer has created the
projects (no point pulling 100kB of bundle when DSNs are absent).
