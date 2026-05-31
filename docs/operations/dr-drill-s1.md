# Disaster recovery drill — S1

**Phase 8 exit gate.** "Nuke Fly.io app, restore from main + Supabase
backup, in < 30 minutes." This document is both the **plan** and the
**evidence**: each run appends a results row at the bottom.

Cross-references:

- `docs/operations/deploy-runbook.md` — rollback procedures
- `docs/architecture/aggregates.md` — invariants that must hold after restore
- `docs/architecture/threat-model.md` §T-09 — restore-from-snapshot threats

---

## Scope

Three failure modes are covered by **one** drill:

1. **Fly.io app destroyed** (region outage, accidental `flyctl apps
   destroy`, credential compromise → forced rotate).
2. **Supabase point-in-time restore** (data corruption, accidental
   migration, malicious mutation).
3. **Vercel project rollback** (covered by `deploy-runbook.md`, included
   in this drill for completeness — usually < 60 s, not the bottleneck).

The drill **does NOT** cover Polygon contract loss (contracts are
immutable on-chain) or EAS app loss (re-publish is multi-hour Apple
review; tracked separately as a launch-blocker).

## Pre-conditions

- [ ] Maintainer has `flyctl auth whoami` working.
- [ ] Maintainer has `supabase login` working against the **production**
      project (or dashboard access with PITR enabled).
- [ ] Cloudflare API token in `~/.factivist/cf-token` with `Zone.DNS:Edit`.
- [ ] Latest `main` is green on `check.yml` (so the redeploy reuses the
      most recent prod-validator artifact).

## Drill timeline (target ≤ 30 minutes)

### T+0 — Destroy

```sh
flyctl apps destroy "$FLY_APP_NAME_PROD" -y
```

Record wall-clock at T+0.

### T+0:30 — Recreate app shell

```sh
flyctl apps create "$FLY_APP_NAME_PROD" --org "$FLY_ORG"
flyctl ips allocate-v4 --app "$FLY_APP_NAME_PROD"   # IPv4 + IPv6
flyctl ips allocate-v6 --app "$FLY_APP_NAME_PROD"
```

### T+2 — Restore secrets

```sh
# Re-apply all secrets from the local secret manifest (NEVER stored in repo).
# Maintainer's offline manifest: ~/.factivist/secrets/prod.env
flyctl secrets import --app "$FLY_APP_NAME_PROD" < ~/.factivist/secrets/prod.env
```

If the secret manifest is itself lost, the maintainer must rotate every
listed value (Supabase service-role, JWKS, session secret, EAS keystore).

### T+5 — Trigger a fresh prod deploy

Cut a tag pointing at the most recent green `main` commit (NOT just
re-running the last release — the audit-gate needs a fresh artifact):

```sh
git fetch origin main
git tag "dr-restore-$(date +%Y%m%d-%H%M)" origin/main
git push origin --tags
gh release create "dr-restore-$(date +%Y%m%d-%H%M)" \
  --title "DR restore" --notes "Disaster-recovery drill restore"
```

`.github/workflows/deploy-prod.yml` fires on the release. Maintainer
approves the `production` environment gate.

### T+15 — Supabase point-in-time restore (parallel track)

If the drill includes data restore:

```
Supabase Dashboard -> Settings -> Database -> Backups -> Restore
  Target: 1 hour before T+0
  Confirm with project ref
```

PITR returns a new connection string; update `DATABASE_URL_PROD`
secret in GitHub repo:

```sh
gh secret set DATABASE_URL_PROD --env production < ~/.factivist/secrets/db-restored.url
```

Then run `db-migrate.yml` manually to re-apply forward migrations from
`drizzle_meta` HEAD.

### T+25 — Verify

- [ ] `curl https://api.factivist.example/healthz` returns 200.
- [ ] `curl https://factivist.example/` returns 200 + serves the home
      page.
- [ ] One read query against Postgres (`SELECT count(*) FROM
      complaints`) matches pre-incident row count ± expected churn.
- [ ] `bun run check:anonymity` from a fresh clone passes (no PII
      leaked to logs).
- [ ] One synthetic write (`POST /complaints` with the maintainer's
      DR-only credential) lands in moderation queue.

### T+30 — Drill complete

Append a row to the **Drill log** at the bottom. Issue closed.

## Failure modes during the drill itself

| Symptom | Action |
|---------|--------|
| `flyctl apps create` rejects name (already in use cache) | Wait 60s; Fly recycles within 1 minute. |
| Deploy passes but `/healthz` 502s | Likely missing `DATABASE_URL_PROD`. Check `flyctl secrets list`. |
| Postgres PITR slow (> 15 min) | This is expected for > 100k row tables. Document; investigate Supabase Pro upgrade if S2 needs faster RTO. |
| GH Release approval blocked | Confirm `production` environment has at least one reviewer. |

## Drill log

| Date | Operator | Wall-clock | Notes |
|------|----------|------------|-------|
| _(awaiting first execution)_ | | | First drill scheduled before S1 launch. |

> Phase 8 exit gate requires **at least one** successful drill row
> above before the next phase's launch announcement is cut.
