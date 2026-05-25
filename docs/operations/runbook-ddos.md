# Runbook — DDoS / India ISP-block response (S1)

**Owner:** maintainer (S1 single-on-call).
**Scope:** Cloudflare-proxied traffic to all three Factivist surfaces
(web, api, mobile manifest endpoints). Triggered by sustained 5xx
rate, latency spikes, or India-side ISP-level blocking.

Cross-references:

- ADR-0009 — Supabase custom domain + Cloudflare proxy
- `docs/operations/deploy-runbook.md` — rollback procedures
- `docs/architecture/threat-model.md` §T-08 — DDoS surface
- Phase 8 §8.6 — Cloudflare proxy ON, "Under Attack" toggle

---

## Decision tree

```
suspected attack / sustained 5xx
            │
            ▼
   1. Confirm scope (web/api/both)
            │
            ▼
   2. Flip Cloudflare "Under Attack" mode
            │
            ▼
   3. Snapshot logs + capture IPs
            │
            ▼
   4. Tighten rate limits
            │
            ▼
   5. Post-incident: open `incident:ddos` issue + post-mortem
```

## Step 1 — Confirm scope (5 minutes)

| Signal | Surface | Check |
|--------|---------|-------|
| Cloudflare analytics > 10× baseline RPS | edge | `dash.cloudflare.com -> Analytics & Logs` |
| Vercel function 5xx > 1% for 5 min | web | `vercel logs <project> --follow` |
| Fly.io `<app>.fly.dev` 5xx > 1% | api | `flyctl logs --app $FLY_APP_NAME_PROD` |
| Supabase request rate > 50/s | db | `dash.supabase.com -> Reports -> API` |
| India-only access regression | edge | Test from a known-IN IP / VPN; see ADR-0009. |

If only one surface, scope mitigation to that surface; otherwise treat
as full-edge event.

## Step 2 — Flip "Under Attack" mode (1 minute)

Cloudflare dashboard:

1. `Security -> Settings -> Security Level`
2. Set **"I'm Under Attack"** for the zone (`factivist.example`).
3. Confirm change. Cloudflare issues an interstitial JS challenge to
   every visitor until disabled.

CLI alternative (Cloudflare Wrangler not required — uses the API):

```sh
curl -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/settings/security_level" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"under_attack"}'
```

**Cost note:** "Under Attack" mode is free-tier. The JS challenge
breaks API-only consumers (mobile app uploads, The Graph subgraph) —
so only the **web** zone gets "Under Attack". The API zone uses
"Bot Fight Mode" + tighter rate-limits instead (step 4).

## Step 3 — Snapshot logs and capture IPs (5 minutes)

```sh
# Cloudflare — last 30 minutes of edge logs
curl "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/logs/received" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  --output ./incident-$(date +%Y%m%d-%H%M).log

# Fly.io — api logs
flyctl logs --app "$FLY_APP_NAME_PROD" > fly-incident-$(date +%Y%m%d-%H%M).log

# Vercel — web logs
vercel logs "$VERCEL_PROJECT_ID_PROD" --since=1h > vercel-incident-$(date +%Y%m%d-%H%M).log
```

Store under `~/factivist/incidents/<incident-id>/`. **Do not commit
to the repo** — logs may contain user IPs which are PII under DPDP.

## Step 4 — Tighten rate-limits (5 minutes)

Cloudflare WAF rate-limiting rules (free tier ships 1 rule; S1 uses
that single budget for `/api/identity/prove`).

```
Rule: identity-prove-burst
  When incoming requests match:
    URI Path contains "/identity/prove"
  AND:
    Request rate > 5 requests per 10 seconds per IP
  Then:
    Block (HTTP 429) for 60 seconds
```

Fly.io app-level: temporarily set `MAINTENANCE_MODE=1` to short-circuit
non-essential routes (returns 503 on `/comments/*`, `/complaints/flag`,
keeps `/healthz` + `/identity/prove`):

```sh
flyctl secrets set MAINTENANCE_MODE=1 --app "$FLY_APP_NAME_PROD"
```

Unset after the attack:

```sh
flyctl secrets unset MAINTENANCE_MODE --app "$FLY_APP_NAME_PROD"
```

## Step 5 — Open the incident + post-mortem

1. File `incident:ddos` issue with:
   - Failing run / dashboard URLs
   - First-detected and mitigated timestamps
   - Peak RPS observed
   - Affected surfaces
   - Mitigations applied (which steps)
2. Once mitigations have held for **30 minutes**, drop Cloudflare back
   to "Medium" security level.
3. Cancel `MAINTENANCE_MODE` and confirm rate-limit rule scoped down.
4. Post-mortem within 72 hours per `docs/operations/post-mortem.md`
   (Phase 9). Single-maintainer S1 = self-review acceptable.

## What NOT to do

- **Never** delete Cloudflare DNS records during an attack — DNS TTL
  is 5 minutes; removing a record locks you out for those minutes.
- **Never** rotate the Supabase service-role key during an attack —
  the api needs that key to keep responding. Rotate after.
- **Never** touch the Polygon multisig during an attack. Contracts
  are immutable; nothing on-chain needs urgent mitigation.

## Authorisation matrix (S1)

| Action | Who |
|--------|-----|
| Toggle Cloudflare security level | Maintainer (S1) |
| Set MAINTENANCE_MODE | Maintainer (S1) |
| Rotate service-role key | Maintainer (S1), only after attack ends |
| Open incident issue | Maintainer or any contributor |
| Communicate publicly | Maintainer only (single voice) |
