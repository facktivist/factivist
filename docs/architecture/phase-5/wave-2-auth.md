# Phase 5, Wave 2 — Supabase Auth Wiring

Status: shipped 2026-05-24 (commit on `feat/season-1-orchestration`).
Owner: backend-dev / c12-supabase-auth.
References: ADR-0010, ADR-0014, ADR-0015, ADR-0016, ADR-0023.
Supersedes: the base64-cookie envelope path in `apps/web/src/lib/auth/server.ts` that wave 1 shipped.

## Summary

Wave 1 shipped Pipeline C's admin RBAC layer (`apps/api/src/lib/rbac.ts`,
`apps/web/src/lib/auth/server.ts`) behind a hard-gated test-only escape
hatch: header injection via `FACTIVIST_TRUSTED_HEADER_AUTH=1`. The flag
was the #1 wave-2 follow-up — production with the flag UNSET was safe
but no real operator could log in. Wave 2 replaces that path with
Supabase Auth on both surfaces and tightens the escape hatch to fire
only under `NODE_ENV === 'test'`.

## What Factivist consumes from Supabase Auth

A standard Supabase Auth user. The only Factivist-specific claim is a
single string under either:

  - `user.app_metadata.role` (PREFERRED — server-set, immutable from
    the client SDK), OR
  - `user.user_metadata.role` (mutable from the client; useful in dev).

Permitted values: `"admin"` or `"moderator"`. Anything else — including
the absence of the claim — resolves to `null` on the web side and
falls through to the `public` actor on the API side; the admin layout
then redirects to `/`. **Citizens never carry a `role` claim.**

The web resolver checks `app_metadata.role` first; the API middleware
does the same. This matches Supabase's own guidance — `app_metadata`
is the trustworthy claim because the user cannot self-edit it.

## How to mint operators (user-side ops, NEVER automated by this app)

Either path is acceptable; the SQL path is what we recommend for
operator onboarding scripts.

**Path A — Dashboard**

1. Supabase Dashboard → Authentication → Users → pick an operator.
2. "Raw User Meta Data" or "Raw App Meta Data" → set
   `{"role": "admin"}` or `{"role": "moderator"}`.
3. Save. The operator's next login picks up the new claim on the JWT.

**Path B — Service-role SQL (preferred for automation)**

```sql
update auth.users
   set raw_app_meta_data = jsonb_set(
     coalesce(raw_app_meta_data, '{}'::jsonb),
     '{role}', '"admin"'
   )
 where id = '<uuid>';
```

Run this against the project's Postgres via the dashboard SQL editor
or `psql` over the service-role connection string. The app NEVER
mutates `auth.users` itself.

## Cookie flow (Next.js SSR)

`apps/web/src/lib/auth/server.ts` uses `@supabase/ssr`'s
`createServerClient` with `next/headers`' `cookies()` reader. The
Supabase auth callback route (built-in to `@supabase/ssr`'s
documentation, not shipped in this wave — see Open Items) writes the
session cookie; this resolver only READS it.

For Server Components, the resolver provides a `setAll` no-op because
Server Components cannot mutate cookies. Token refresh happens on the
client / in route handlers, not here.

Order of resolution inside `getServerSession()`:

  1. Real Supabase session (Branch A). Wins over everything else.
  2. Test-mode escape-hatch headers (Branch B). Only when
     `FACTIVIST_TRUSTED_HEADER_AUTH=1` AND `NODE_ENV=test`.
  3. `null`. The admin layout redirects to `/`.

## Bearer flow (Hono API)

`apps/api/src/lib/supabase-auth.ts` ships
`supabaseAuthMiddleware()`. It runs globally before any route
(`apps/api/src/app.ts`). Per request it:

  1. Reads `Authorization: Bearer <jwt>`.
  2. Calls `supabase.auth.getUser(token)` against
     `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. This issues a
     verification HTTP call to Supabase. For S1 traffic (≤1 RPS on
     admin routes) this is the cheapest reliable path. Wave 3 may
     swap to a local JWKS verifier.
  3. Reads `app_metadata.role` → `user_metadata.role`.
  4. Publishes `c.set('factivist.actor', { id, role })` and
     `c.set('factivist.token', token)`.

`rbac.ts` then reads `factivist.actor` exactly as it did in wave 1 —
no admin route handler changed.

The middleware NEVER 401s on its own. A missing or invalid bearer is
indistinguishable from a public request — `requireAdmin` /
`requireModerator` decide whether absence is fatal. This preserves the
"no role enumeration" invariant from ADR-0010.

## The `NODE_ENV === 'test'` gate

Both surfaces hard-gate the trusted-header escape hatch behind:

```
FACTIVIST_TRUSTED_HEADER_AUTH === '1'  AND  NODE_ENV === 'test'
```

If the env flag is set but `NODE_ENV` is not `"test"`, a one-shot
`console.warn` fires (per process), the headers are IGNORED, and the
caller falls through to the public path. A misconfigured production
deploy stays locked down instead of silently trusting forged headers.

The integration test suites (`apps/api/src/lib/__tests__/rbac.test.ts`,
`apps/api/src/routes/admin/__tests__/*.test.ts`,
`apps/web/src/lib/auth/__tests__/server.test.ts`) all run under
Vitest, which sets `NODE_ENV=test` automatically.

## Required environment

**`apps/web` (`.env.local` — never committed)**

  - `NEXT_PUBLIC_SUPABASE_URL` — project URL (or custom-domain per ADR-0009).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon JWT, browser-safe.

**`apps/api` (`.env` — never committed)**

  - `SUPABASE_URL` — same project URL.
  - `SUPABASE_SERVICE_ROLE_KEY` — service-role JWT (already declared
    for the Storage finalize webhook; the same value powers both).

Both `.env.example` files document the exact shape and the dashboard
SQL for setting the role claim.

## RBAC test-matrix delta

| Surface | Tests added | What they cover |
|---|---|---|
| `rbac.ts` | 4 new | Header ignored under NODE_ENV=production/development; one-shot warning; upstream Supabase actor wins in any NODE_ENV. |
| `supabase-auth.ts` | 14 new | Env gate, bearer extraction (missing, non-Bearer, lowercase header), role resolution (app_metadata, user_metadata, both, neither, unknown string), error fall-through, client singleton. |
| `web/auth/server.ts` | 12 rewritten | Supabase branch (admin, moderator, fallback, preference, citizen, error, unknown string); env gate; resolution order (Supabase wins over header; falls through when no role); null fallback. |
| Existing admin route tests | 0 changed | They keep working because they set `FACTIVIST_TRUSTED_HEADER_AUTH=1` under Vitest's default `NODE_ENV=test`. |

## Threat-model implications

  - **Citizen JWT cannot satisfy `requireAdmin`** — citizens have no
    `role` claim. Verified by the "no admin role" tests on both surfaces.
  - **Leaked admin JWT** — limited by Supabase's default 1h JWT TTL.
    Wave 3 follow-up: cookie + JWT rotation cadence.
  - **Forged `x-factivist-role` header in production** — ignored, and
    a startup warning fires once. The header is only a wedge under
    `NODE_ENV=test`.
  - **Service-role key exposure** — the API holds the service-role
    key purely to call `auth.getUser(token)`. It NEVER ships to the
    web app. The web app holds the anon key only.

## Wave 3A — Auth callback + login page (shipped 2026-05-24)

Wave 2C / Open Item **A3** is now closed. The repo carries:

  - `apps/web/src/app/auth/callback/route.ts` — Next.js Route Handler at
    `GET /auth/callback?code=<pkce>[&next=<safe-path>]`. Exchanges the
    PKCE code via `@supabase/ssr`'s `exchangeCodeForSession`, which
    persists the SSR session cookie through the cookie bridge
    (`cookieStore.set` for each entry returned in `setAll`).
  - `apps/web/src/app/login/page.tsx` — Server Component magic-link
    surface. Reads `?error=<code>` query params and renders one of four
    banners (`invalid_code`, `auth_failed`, `misconfigured`, `expired`).
  - `apps/web/src/features/auth/loginActions.ts` — Server Action
    `sendMagicLink(formData)` calling `signInWithOtp({ email, options:
    { emailRedirectTo: getAuthCallbackUrl() } })`.
  - `apps/web/src/features/auth/LoginForm.tsx` — client island with a
    labelled email input, named submit button, and `role="alert"` /
    `role="status"` feedback regions.
  - `apps/web/src/lib/config.ts` — `getSiteUrl()` / `getAuthCallbackUrl()`
    centralising the canonical origin (env: `NEXT_PUBLIC_SITE_URL`).

### End-to-end login flow

```
┌──────────────┐
│ Operator     │
│ visits       │
│ /login       │
└──────┬───────┘
       │ types email, submits
       ▼
┌──────────────────────────────┐    (1) POST  /login   (RSC action)
│  sendMagicLink(formData)     │  ───────────────────────────────►
│  apps/web/.../loginActions   │                  ┌──────────────┐
│                              │  signInWithOtp() │ Supabase     │
│                              │ ───────────────► │ Auth         │
│                              │ ◄─────────────── │ (sends mail) │
└──────┬───────────────────────┘   { error: null} └──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ "Check your inbox" banner    │
└──────────────────────────────┘

       Operator clicks the link in the email:
       https://factivist.app/auth/callback?code=<pkce>

┌──────────────────────────────────────────────────────────────┐
│ GET /auth/callback?code=…&next=/admin/moderation             │
│   apps/web/.../auth/callback/route.ts                        │
│                                                              │
│   1. validate `next` is a safe relative path                 │
│   2. createServerClient(SUPABASE_URL, ANON_KEY, cookies)     │
│   3. supabase.auth.exchangeCodeForSession(code)              │
│        ↳ sets `sb-…-auth-token` cookie via setAll bridge     │
│   4. 307 → next (or `/login?error=…` on failure)             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐  (RSC request carries the cookie)
│ /admin/moderation            │
│   admin layout calls         │
│   getServerSession()         │
│   → reads cookie via         │
│     @supabase/ssr            │
└──────────────────────────────┘
```

### Callback URL contract

  - The callback URL MUST be allow-listed in the Supabase Dashboard:
    Authentication → URL Configuration → Redirect URLs.
  - For local dev: `http://localhost:3000/auth/callback`.
  - For staging / production: `https://<canonical-host>/auth/callback`,
    where `<canonical-host>` matches `NEXT_PUBLIC_SITE_URL` (ADR-0009 /
    ADR-0023 require the custom-domain origin in production).
  - The Server Action and the Route Handler read the host from
    `getSiteUrl()` so the dashboard config + the redirect target are
    kept in lockstep.

### Open-redirect defence

The `next` query param on `/auth/callback` is operator-controllable. The
route enforces:

  - `next` must start with exactly one `/`.
  - `next` must not start with `//` (protocol-relative).
  - `next` must not start with `/\` (backslash-bypass).
  - Anything else falls back to `/`.

Verified by `apps/web/src/app/auth/callback/__tests__/route.test.ts` —
absolute URLs (`https://evil.com`), protocol-relative URLs (`//evil.com`),
backslash-prefixed URLs (`/\evil.com`), and empty strings are all
silently coerced to `/`.

### Secrets discipline

The route handler and Server Action both follow the same rules:

  - The PKCE `code` is NEVER logged on any console channel.
  - Supabase response bodies are NEVER logged — only `error.message`.
  - The resulting `session.access_token` never appears in logs.

The callback test suite spies on `console.log/info/warn/error/debug` and
asserts the code value is absent from every captured argument.

## Wave 3B — JWKS local verifier (shipped 2026-05-24)

Wave-2's `supabase.auth.getUser(token)` round-trip is replaced with a
local JWKS-based verifier. Admin traffic now verifies bearers against
Supabase's published JWKS in process memory — zero network on the hot
path.

### What changed

  - **New module:** `apps/api/src/lib/supabase-jwks.ts`
    - `getJWKS()` — singleton `createRemoteJWKSet(new URL('/auth/v1/keys', SUPABASE_URL))`.
      `jose` honours the upstream `Cache-Control` (Supabase serves 1h
      TTL) and re-fetches transparently on key rotation (unknown `kid`
      arrival triggers refresh).
    - `verifyAccessToken(token)` — calls `jwtVerify(token, getJWKS(), {
      issuer: SUPABASE_URL, audience: 'authenticated' })`. Reads role
      from `app_metadata.role` first, falling back to
      `user_metadata.role`. Returns `null` on ANY failure (signature,
      expiry, audience, issuer, malformed, missing `sub`, JWKS fetch
      error). Pins `aud: 'authenticated'` so service-role JWTs cannot
      masquerade as admins.

  - **Refactored:** `apps/api/src/lib/supabase-auth.ts`
    - `@supabase/supabase-js` import removed.
    - The middleware now calls `verifyAccessToken(token)` and publishes
      `{ id: verified.sub, role: verified.role }` exactly as before.
    - Env gate now keys on `SUPABASE_URL` alone (the JWKS endpoint is
      public — no service-role key needed). `SUPABASE_SERVICE_ROLE_KEY`
      remains required for `upload.ts` (Storage signed-URL issuance)
      and is documented in `apps/api/.env.example` for that purpose.
    - Contract for downstream consumers (`rbac.ts`, all admin routes)
      is unchanged — `c.set('factivist.actor', …)` and
      `c.set('factivist.token', token)` happen exactly as in wave 2.

  - **Dependency:** `jose@^6.2.3` added to `apps/api/package.json`.
    `@supabase/supabase-js` removed from `apps/api/package.json` (no
    remaining consumer in `apps/api/src/`; `upload.ts` uses Bun's
    native `fetch` against Storage's REST surface).

### Performance characteristic

  - **First request after process boot:** one HTTP fetch of the JWKS
    (~20-40ms cold from `ap-south-1`). Cached for the upstream TTL.
  - **Every subsequent request within the JWKS TTL:** zero network.
    `jose`'s WebCrypto verify is sub-millisecond on ES256/RS256 for
    typical Supabase claim sizes.
  - **Key rotation:** transparent — `jose` re-fetches when a JWT signed
    by an unknown `kid` arrives. No manual cache invalidation.
  - **Net effect at S1 scale:** admin actions verify locally. At ~10
    RPS the saving is ~9 round-trips per second; at S1's actual ~few
    admin actions per day the saving is qualitative (no Supabase
    rate-limit exposure on the admin queue).

### Threat-model implications

  - **Service-role JWT cannot masquerade as admin user.** `aud:
    'service_role'` fails the pinned `audience: 'authenticated'` check.
  - **Issuer pinning** — a JWT signed with a different Supabase
    project's keys (i.e. a leaked dev-project JWT presented to a prod
    deploy) fails the `iss !== SUPABASE_URL` check.
  - **Revoked admin survives until JWT expiry.** This is the same
    posture as wave 2 in practice (Supabase's `getUser` does NOT check
    a revocation list either — it only verifies the JWT). Defense:
    keep the default 1h JWT TTL, rotate signing keys on
    hostile-departure incidents (Supabase Dashboard → Auth → JWT keys
    → rotate).
  - **JWKS endpoint compromise** would let an attacker swap public
    keys. Mitigation lives at the TLS layer (Supabase serves the JWKS
    over HTTPS with HSTS) and at ADR-0009 (custom-domain pinning).

### Test seam

`supabase-jwks.ts` ships two private hooks:

  - `__resetJWKSForTests()` clears the singleton between cases.
  - `__setJWKSForTests(url, getKey)` injects a deterministic key
    resolver so the unit test signs JWTs with a local ES256 pair and
    verifies them without touching the network.

The middleware's unit test (`supabase-auth.test.ts`) mocks
`./supabase-jwks.ts` at the module boundary — the verifier itself is
stubbed, and the 14-case contract from wave 2 is preserved (env gate,
bearer extraction, role resolution, error fall-through).

### Open items still tracked

  - **A1 — Server-side prove path.** The admin shell fetch wrapper that
    forwards `session.token` to the Hono API as
    `Authorization: Bearer <token>` is still wave-1's `x-factivist-token`
    header. Wire it to real `Authorization` once the fetch wrapper lands.
  - **JWKS cache TTL override.** `jose` honours the upstream
    `Cache-Control`; there is no exposed knob today. If Supabase ever
    sets a too-aggressive max-age we can swap to
    `createRemoteJWKSet(url, { cacheMaxAge: …, cooldownDuration: … })`.

## Wave 3B — Dev-metrics observability for `/identity/prove` (ATID-IDENT-004)

The wave-2C low-tier server fallback (`POST /identity/prove`) now writes one
`dev_metrics.zkp_route_events` row per proving attempt — success OR failure —
so the cost-analyst scorecard tracks the server-fallback rate and feeds it
into [[s1-cost-drift]].

### Table

`dev_metrics.zkp_route_events` (Postgres schema `dev_metrics`, NOT `public`):

| Column       | Type                          | Notes                                                |
|--------------|-------------------------------|------------------------------------------------------|
| `id`         | `uuid PK gen_random_uuid()`   | Server-generated.                                    |
| `purpose`    | `text NOT NULL`               | Currently `'zkp_route'`. New families extend.        |
| `route`      | `text NOT NULL`               | `'server'` (API) or `'client'` (wave-4 beacon).      |
| `platform`   | `text NOT NULL`               | `'ios' \| 'android' \| 'web'` — from header hint.    |
| `outcome`    | `text NOT NULL`               | `'success' \| 'failed'`.                             |
| `durationMs` | `integer`                     | Nullable; omitted on pre-prover rejects.             |
| `metadata`   | `jsonb`                       | Strict-shape via Zod (`{ complaintFlagOn?: bool }`). |
| `ts`         | `timestamp with time zone`    | `DEFAULT now()`.                                     |

Indices: `(purpose, ts)`, `(outcome, ts)`. Both non-unique.

Migration: `packages/db/drizzle/0003_redundant_silver_fox.sql`.

### Event shape (Zod source of truth)

```ts
import { recordDevMetric } from '@/lib/dev-metrics'

await recordDevMetric(db, {
  purpose: 'zkp_route',
  route: 'server',
  platform: 'ios' | 'android' | 'web',
  outcome: 'success' | 'failed',
  durationMs: 1234,                   // optional non-negative integer ≤ 5min
  metadata: { complaintFlagOn: true } // optional, strict-shape
})
```

Validators live at `packages/shared/src/validators/dev-metrics.ts`:
`zkpRouteEventInsertSchema` (single event) and `devMetricEventSchema`
(discriminated union root over every dev-metrics family).

### Anonymity invariant (zkp-key-custody.md §Server-side fallback rule #6)

The row MUST NOT carry:

  - the nullifier, the Aadhaar number, the witness, the seed, the photo
    halves, the prover's public signals, any prover error message;
  - the source IP, the User-Agent, the session id, the cookie.

The platform hint comes from the explicit `x-factivist-platform` request
header. We deliberately DO NOT parse User-Agent — UA strings can identify
a specific device model and break the I-MOD-3 anonymity floor. Unknown or
missing values resolve to `'web'`.

The Zod validator and the test suite both check the column keyspace.
Adding a new metadata key requires editing the strict-shape Zod schema —
`.strict()` mode rejects anything else.

### Fire-and-forget contract

The route calls `void recordDevMetric(...)` — the citizen's response MUST
NOT block on observability. `recordDevMetric` parses through the Zod
schema first (programmer-bug paths throw synchronously, but `void` swallows
them at the route call site) and catches every DB write failure with a
single `console.warn` (the operator log captures it; a separate ops alarm
tracks the rate of these warnings).

### What does NOT emit a metric

Three pre-prover reject paths intentionally skip the dev-metrics write
because the prover was never invoked — counting them would skew the
server-fallback rate:

  - `429 RATE_LIMITED` — the token-bucket rejected the request.
  - `503 S1_COMPLAINT_SUBMIT_OFF` — the feature flag is disabled.
  - `503 PROVER_NOT_CONFIGURED` raised before the prover (DATABASE_URL
    missing) — the route returns this before the try/catch ever runs.

Every path that reaches `proveServerSide(witness)` — including the typed
`CircuitConstraintError`, `ProvingFailedError`, and generic `throw` paths —
is covered by the integration tests in
`apps/api/src/routes/__tests__/identity.test.ts` §"dev_metrics observability".

### Cost-analyst hookup

The scorecard query (tracked in `pattern_s1_phase_2_done.md`'s recurring
issue #116) joins:

```sql
select
  date_trunc('day', ts) as day,
  count(*) filter (where outcome = 'success') as ok_count,
  count(*) filter (where outcome = 'failed')  as fail_count,
  percentile_cont(0.5) within group (order by duration_ms) as p50_ms,
  percentile_cont(0.95) within group (order by duration_ms) as p95_ms
from dev_metrics.zkp_route_events
where purpose = 'zkp_route'
  and route = 'server'
  and ts > now() - interval '7 days'
group by day
order by day;
```

A spike in `fail_count / (ok_count + fail_count)` or in `p95_ms`
correlates with a Polygon-side cost drift signal — see [[s1-cost-drift]].

**TODO (lead):** the [[s1-cost-drift]] memory note (`reference_s1_cost_drift.md`)
should reference this table so the next cost-analyst review picks it up.
The memory file lives outside the repo (`~/.claude/projects/...`) and is
edited by the user, not by sub-agents.

**Automation status (2026-05-26):** the query is now thread-automated via
`scripts/cost/zkp-route-events-weekly.ts` + `.github/workflows/zkp-cost-scorecard.yml`
(weekly Sunday 07:00 UTC cron). Output lands as a comment on issue
`#${ZKP_COST_SCORECARD_ISSUE}` (default 116) so the cost-analyst
scorecard refreshes without human intervention. Tests live at
`scripts/cost/__tests__/zkp-route-events-weekly.test.ts`.

## Open items (wave 3 and beyond)

  - **A1 — Server-side prove path.** The admin shell fetch wrapper that
    forwards `session.token` to the Hono API as
    `Authorization: Bearer <token>` is still wave-1's `x-factivist-token`
    header. Wire it to real `Authorization` once the fetch wrapper lands.
  - **~~JWKS local verifier.~~** Shipped in Wave 3B — see section above.
  - **Audit-log integration.** Every admin Hono route already writes
    `audit_log` with `actor = factivist.actor.id`. Once real Supabase
    user IDs land in production, confirm the audit-log sweep
    (`scripts/audit-log-sweep.ts`) treats them as the canonical actor.
  - **Expired-link UX.** The callback currently maps every
    `exchangeCodeForSession` error to `auth_failed`. A follow-up can
    parse the message and route the `expired` banner separately so the
    operator sees actionable copy.
  - **OAuth providers.** Out of scope for S1 (operator-only). If the ops
    team ever wants Google sign-in for moderators, add a second branch
    to `LoginForm` and a matching `signInWithOAuth` Server Action.
