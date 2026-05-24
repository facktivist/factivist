# Deploy runbook (S1)

**Scope:** how the Factivist S1 deploy + migration workflows actually get
triggered, what secrets they need, and what to do when one fails.

Workflows live in `.github/workflows/`:

| File | Trigger | Target |
|------|---------|--------|
| `deploy-staging.yml` | push to `main` | Vercel + Fly.io + EAS internal |
| `deploy-prod.yml` | `release: published` | Vercel + Fly.io + EAS production (env-gated) |
| `db-migrate.yml` | manual `workflow_dispatch` | Supabase staging or production |
| `ruflo-learn.yml` | nightly (04:00 UTC) | Ruflo `ci-metrics` namespace |

## Required GitHub repository secrets

Configure under **Settings → Secrets and variables → Actions**.

### Staging (read by `deploy-staging.yml`)

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel personal token, deploy scope |
| `VERCEL_ORG_ID` | Vercel team/org id |
| `VERCEL_PROJECT_ID` | Vercel project id for `apps/web` |
| `FLY_API_TOKEN` | Fly.io org-scoped token |
| `FLY_APP_NAME` | Fly app slug, e.g. `factivist-api-staging` |
| `EXPO_TOKEN` | Expo access token |
| `EAS_PROJECT_ID` | EAS project id for `apps/mobile` |

Missing a triplet only **skips** that surface — staging deploy stays green
so the rest of CI is not blocked.

### Production (read by `deploy-prod.yml`)

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN_PROD` | Production-scoped Vercel token |
| `VERCEL_ORG_ID_PROD` | Vercel team/org id |
| `VERCEL_PROJECT_ID_PROD` | Vercel project id for `apps/web` prod |
| `FLY_API_TOKEN_PROD` | Production-scoped Fly token |
| `FLY_APP_NAME_PROD` | Fly app slug, e.g. `factivist-api-prod` |
| `EXPO_TOKEN_PROD` | Expo access token (prod) |
| `EAS_PROJECT_ID_PROD` | EAS project id for `apps/mobile` prod |

Missing any of these **fails** the prod deploy with a clear error.

### Database (read by `db-migrate.yml`)

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL_STAGING` | Supabase staging writable connection string |
| `DATABASE_URL_PROD` | Supabase production writable connection string |

## GitHub environment gates

Create one environment under **Settings → Environments**:

- **`production`** — required reviewers: **1** (S1 single-maintainer baseline;
  Phase 9 raises to 2). Used by `deploy-prod.yml` (all three jobs) and the
  `migrate-production` job in `db-migrate.yml`.

## Running a staging deploy (automatic)

1. Land a PR on `main`.
2. `deploy-staging.yml` fires automatically.
3. Each of the three jobs either deploys or logs a `::notice::` skip.
4. Deploy URLs appear in the job outputs and as `::notice::` lines in the
   run log.

## Running a production deploy

1. Cut a tag: `git tag v1.2.3 && git push --tags`.
2. Create a GitHub Release pointing at the tag.
3. `deploy-prod.yml` fires on the `release: published` event.
4. The `audit-gate` job downloads the `prod-validator` artifact from the
   latest green main run on `check.yml`. **Missing artifact → deploy
   aborts.** If a recent main build did not upload one, re-run the
   responsible workflow before cutting the release.
5. Each of the three deploy jobs is then gated by the `production`
   environment — required reviewer(s) approve in the Actions UI.
6. Deploy URLs surface in the job outputs.

## Running a database migration

1. Open the Actions tab → **`db-migrate`** workflow → **Run workflow**.
2. Pick environment: `staging` or `production`.
3. Type `YES MIGRATE` into the confirm input (literal string).
4. Click **Run workflow**.
5. **Production** path: the `migrate-production` job pauses for
   environment approval (second reviewer = the "two-key approval" called
   for in `s1-action-plan.md §7.3`).
6. The job logs **row counts before/after** for `audit_log` and lists
   every `.sql` file applied from `packages/db/drizzle/`.

Drizzle migrations are **forward-only**. If a migration fails:

- **Staging**: restore from Supabase point-in-time snapshot, file
  `risk:db` issue with the run URL.
- **Production**: STOP, do not retry, page on-call, restore from snapshot,
  file `incident:db` issue with the failing SQL captured.

## Rollback procedures

### Vercel (web)

```
vercel rollback <deployment-url> --token=$VERCEL_TOKEN_PROD --scope=$VERCEL_ORG_ID_PROD
```

Or in the Vercel dashboard: **Deployments → Promote to Production** on the
previous known-good build.

### Fly.io (api)

```
flyctl releases list --app $FLY_APP_NAME_PROD
flyctl releases rollback <version> --app $FLY_APP_NAME_PROD
```

`min_machines_running=1` (per `s1-action-plan.md §8.6`) so rollback brings
the previous image straight back up.

### EAS (mobile)

No auto-rollback. Options: `eas update --branch production
--rollback-to-embedded` for internal channels; cut a patch build + resubmit
for store-published. iOS expedited review ~24h.

### Supabase (db)

Forward-only Drizzle. To rewind: (1) set `MAINTENANCE_MODE=1` on Fly app,
(2) restore Supabase point-in-time snapshot, (3) reset `drizzle_meta` row
to target migration timestamp, (4) re-enable writes.

## On-call escalation

S1 single-maintainer (no rotation yet). On out-of-hours failure:

1. Tag maintainer in the Actions run conversation.
2. Open `incident:deploy` or `incident:db` issue with: failing run URL,
   last successful run URL, blast radius (users, region).
3. If user-visible (web/api 5xx, mobile crash-on-launch), flip Cloudflare
   "Under Attack" mode per `docs/operations/runbook-ddos.md`.

S2 multi-maintainer + PagerDuty deferred to Phase 9.

## Nightly learn

`ruflo-learn.yml` (04:00 UTC) pulls 24h of runs via `gh api`, writes
totals + per-workflow success rate + average duration to Ruflo
`ci-metrics` namespace. Failure-silent; a `ci-metrics-YYYY-MM-DD`
artifact is uploaded every run as fallback. `bunx ruflo@latest` is used;
pin in S2 if version drift becomes a concern.

## Cross-references

- ADR-0009 — Supabase custom domain (API origin)
- ADR-0001 — Drizzle-only DB access
- `docs/action-plans/season-1/s1-action-plan.md §7.3` — workflow spec
- `docs/action-plans/season-1/s1-action-plan.md §8` — deploy targets
- `docs/operations/runbook-ddos.md` — Cloudflare "Under Attack" toggle
