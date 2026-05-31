# Phase 5 — Identity & ZKP Wiring Spec (AnonCitizen on Polygon PoS)

> **Author**: `id-researcher` (Phase 5, pipeline A).
> **Audience**: `id-architect` (next in chain), then `id-coder`, `id-tester`, `id-reviewer`.
> **Status**: Draft for architect review.
>
> Canonical inputs read for this spec:
> - `docs/action-plans/season-1/s1-action-plan.md` §5.1 (lines 340–364)
> - `docs/architecture/zkp-key-custody.md`
> - `docs/architecture/aggregates.md` §1 `Citizen` aggregate
> - `docs/architecture/threat-model.md` TB-4, TB-5, container §6, CC-1
> - ADRs 0003, 0010, 0011, 0018
> - Memory `reference_s1_zkp_findings.md` (canonical nullifier formula)
> - `packages/shared/src/data/atid-registry.ts` — `ATID-IDENT-001..007`, `ATID-COMPL-006`
>
> This document is a **wiring spec**. It contains no code. It enumerates
> contracts, columns, route shapes, schema names, gas/cost envelopes, and
> ATIDs. The architect turns this into a build-ready design; the coder
> implements; the tester verifies every ATID listed in §8.

---

## 1. ZKP proving flow per platform

Per [[ADR-0011]] (hybrid proving) and [[ADR-0018]] (per-platform stack lock).
Selection is performed by the mobile prover router
(`apps/mobile/src/features/identity/proving.ts`) and the web bootstrap
(`apps/web/src/features/identity/proving.ts`). The server fallback lives at
`apps/api/src/routes/identity/prove`.

| Platform | Prover | Default for | Where inputs live | Where they go |
|----------|--------|-------------|-------------------|---------------|
| **Web** | snarkjs WASM in a dedicated Web Worker | All modern browsers | Browser memory, worker scope | Cleared on tab close; only the resulting `(proof, publicSignals)` posts to `/identity/verify` |
| **iOS A13+ (iPhone 11+)** | rapidsnark via React Native native module (Expo dev client) | Default for iOS | Native heap inside the prover module | Zeroed on completion; proof + publicSignals passes back to JS via the module bridge |
| **iOS pre-A13** | Server-side fallback (consent required) | Opt-in | Device → TLS → API memory | Inputs zeroed in `apps/api` after one round trip |
| **Android (mid + high tier, ≥ 4 GB RAM)** | snarkjs JS on Hermes | Default for Android | Device memory | Cleared on app background |
| **Android (low tier, < 3 GB RAM)** | Server-side fallback (consent required) | Opt-in | Device → TLS → API memory | Same as iOS fallback |

**Routing decision**: `RouteProving(deviceClass) → 'on-device' | 'server-fallback'`
(per `Citizen` aggregate commands, `aggregates.md` §1, satisfies `ATID-IDENT-004`).
The decision is recorded in `dev_metrics.llm_calls` with `purpose='zkp_route'`
and **no PII** (per `ATID-IDENT-004`).

**Consent gate (server fallback)**: client MUST set
`X-Consent-Acknowledged: 1` on every call to `/identity/prove`.
The route rejects with `400 missing_consent` otherwise. Consent UI copy
is owned by Phase 3 D2 work; the route only enforces the header.

---

## 2. Nullifier derivation — canonical formula

Source: anon-aadhaar `helpers/nullifier.circom` via Phase 1 research wiki.

```
photoHashA = Poseidon(photo[0..15])
photoHashB = Poseidon(photo[16..31])
nullifier  = Poseidon(nullifierSeed, photoHashA, photoHashB)
```

Where:

- `nullifierSeed` — a Factivist-fixed 254-bit field-element constant
  named `FACTIVIST_NULLIFIER_SEED_V1`. Pinned in
  `packages/shared/src/constants/zkp.ts` (file to be created in Phase 5).
- `photo[0..31]` — 32 bytes from a deterministic crop of the citizen's
  Aadhaar QR photo. The full photo is **never** a circuit input and is
  **never** transmitted in the on-device path.

**Three rules the architect MUST enforce**:

1. The Aadhaar number is **NOT** a circuit input. The vision doc §3.3
   wording is wrong and is parked for correction as `zkp-key-custody.md`
   Q-4.
2. `nullifierSeed` is a single global constant for S1 — not per-user,
   not per-epoch. Epoch binding is handled inside the circuit's public
   signals, not the seed.
3. The handle in `packages/shared/src/handle.ts` (per `ATID-IDENT-006`)
   takes `nullifier` as input; it MUST NOT take any UIDAI-derived field.

---

## 3. Drizzle `citizens` table — exact column list

Per [[ADR-0010]] (anonymity floor) and `aggregates.md` invariant I-CIT-1.
The table contains **exactly these columns and no others**:

| Column | Type | Constraints | Source |
|--------|------|-------------|--------|
| `nullifier` | `bytea` (32 B) | **PRIMARY KEY**, NOT NULL | Public signal returned by circuit |
| `state_code` | `text` | NOT NULL, FK → `states.code` | Public signal (constituency binding) |
| `district_code` | `text` | NOT NULL, FK → `districts.code` | Public signal |
| `created_at` | `timestamptz` | NOT NULL, **bucketed to 5-min granularity** (`date_trunc('minute', now()) - (extract(minute from now())::int % 5) * interval '1 minute'`) | Server clock at insert |

> A surrogate `citizen_id` UUID (per `aggregates.md` §1) is **not** an
> extra column — it is the `nullifier` re-encoded for FK convenience.
> The architect MUST decide whether to (a) keep `nullifier` as PK and
> use it directly as FK on `complaints.author_id`, or (b) derive a
> stable UUIDv5 from the nullifier and use that as FK. Phase 5
> architect must answer **OQ-1**.

**Banned columns** (any of these failing in code review is a hard block,
per `ATID-IDENT-003` + the `ATID-P5C6` adversarial test):
`name`, `aadhaar`, `aadhaar_hash`, `dob`, `gender`, `photo`, `photo_bytes`,
`pin`, `pincode`, `gps`, `lat`, `lon`, `ip`, `ip_hash`, `email`,
`phone`, `user_agent`, `device_id`, `device_fingerprint`,
`session_cookie`, `recovery_email`.

**Migration file**: `packages/db/src/migrations/00xx_citizens.sql`
(numbering decided at coder stage). Seed: none. RLS: deny anonymous,
allow `apps/api` service-role only.

---

## 4. Verifier contract calling convention

Per [[ADR-0003]] (single contract) and `zkp-key-custody.md` §On-chain
verifier custody.

| Aspect | Value |
|--------|-------|
| Contract | `CitizenVerifier.sol` (UUPS proxy, multisig-owned) |
| Network | **Polygon PoS mainnet** (chainId 137) at S1 launch; **Amoy** (chainId 80002) for staging |
| Primary RPC | TBD by Phase 5 ops (target: 2 providers + 1 fallback) |
| Read methods used by API | `nullifierUsed(bytes32) view returns (bool)` and `verifyAndRecord(uint[2] a, uint[2][2] b, uint[2] c, uint[9] publicSignals) returns (bool)` |
| Write method gas budget | **~487k gas / verify** (post-Chicago hardfork, per memory `reference_s2_polygon_gas.md`); ~$0.0144 standard, $0.00075 off-peak |
| Pre-Chicago number (deprecated) | 265–285k gas / $0.0070 — do **not** use for budgeting |
| Public signals count | 9 (verifier ABI) |
| Verify failure → API response | `400 invalid_proof` |
| `nullifierUsed[n] == true` before insert | `409 nullifier_already_used` (per `ATID-IDENT-002`) |
| RPC tolerance | API must tolerate 30 s RPC latency before user-visible failure (threat-model.md container §6 DoS row) |
| The Graph subgraph | Cache-only / freshness signal; **never** authoritative (threat-model.md container §7 T row) |
| Indexer ID pinning | Subgraph ID pinned in env + verified at boot |

**Read-then-write contract semantics**: per `aggregates.md` invariant
I-CIT-2 + `ATID-IDENT-002`, on every `VerifyCitizen` command the API
MUST:

1. Call `nullifierUsed(nullifier)` on Polygon RPC.
2. If `true`, short-circuit `409`.
3. If `false`, call `verifyAndRecord(...)` on-chain (this is the
   gas-spending write). The contract is the **only** writer of the
   nullifier set; the local Postgres row is a cache populated **after**
   the on-chain write confirms.
4. After receipt confirms (1 confirmation is sufficient at S1 scale —
   Polygon PoS finality is fast; architect should validate), insert
   the local `citizens` row.
5. Issue HMAC-signed session cookie binding `(nullifier, epoch,
   ua_class)` per `zkp-key-custody.md` K-10.

**Out of scope for S1**: deploy of `CitizenVerifier.sol` itself —
contract code, multisig setup, and trusted-setup verification are
covered by `zkp-key-custody.md`. This spec only describes how the
**API** talks to the deployed contract.

---

## 5. `apps/api/src/routes/identity` route shape

The identity context owns three routes. All under
`apps/api/src/routes/identity/`. Hono router, mounted at `/identity`.

### 5.1 `POST /identity/verify`

The critical path. Satisfies `ATID-IDENT-001`, `ATID-IDENT-002`,
`ATID-IDENT-003`, `ATID-IDENT-005`, `ATID-IDENT-007`.

**Request body** (validated by `VerifyProofRequest` Zod schema):

```
{
  proof: {
    a: [Hex, Hex],
    b: [[Hex, Hex], [Hex, Hex]],
    c: [Hex, Hex]
  },
  publicSignals: [Hex, ...] // length exactly 9
}
```

**Headers required**: none. Cloudflare strips IP; no auth header (this
is the first authenticating call).

**Server-side flow**:

1. Zod-parse body (reject `400 invalid_shape`).
2. Sanity-check `publicSignals` against the local `.vkey.json` cached
   from `packages/contracts/src/verifier/vkey.json`.
3. Read `nullifierUsed(nullifier)` on Polygon RPC.
   - `true` → `409 { error: "nullifier_already_used" }`.
4. Call `verifyAndRecord(...)` on-chain via signer.
   - Revert → `400 { error: "invalid_proof" }`.
5. On confirmation, INSERT `citizens` row with 5-min bucketed
   `created_at`.
6. Mint HMAC session cookie (`session=<base64>`, `HttpOnly`, `Secure`,
   `SameSite=Lax`, `Path=/`, `Max-Age` = epoch end).
7. Return `200 { citizen: { handle, state, district, joined_at } }`.
   - Handle derived deterministically via `packages/shared/src/handle.ts`.
   - **No `nullifier`, no `citizen_id`, no IP, no email** in the
     response (`ATID-IDENT-007`).

**Audit log row**: `audit_log.insert({ actor: 'system', action:
'citizen_verified', target_kind: 'citizen', target_id: nullifier,
payload_hash: sha256(publicSignals), ts })`. Per `zkp-key-custody.md`
§Server-side fallback rule #3, no proof inputs are ever logged.

**Sentry scrub**: a `beforeSend` hook drops any breadcrumb whose
payload references `proof` or `publicSignals` field names.

### 5.2 `POST /identity/prove` (server-side fallback)

Only invoked from a device the routing logic classified as low-tier.
Satisfies `ATID-IDENT-004` (the routing event) and `zkp-key-custody.md`
§Server-side fallback rules 1–6.

**Headers required**: `X-Consent-Acknowledged: 1` (`400 missing_consent`
otherwise).

**Request body** (`ProveRequest` Zod schema):

```
{
  witness: {
    nullifierSeed: Hex<32>,       // ephemeral, on-device
    photoSlice: Hex<32>,          // 32 bytes from Aadhaar QR photo crop
    publicSignals: [Hex, ...]     // length exactly 9
  }
}
```

**Rules of custody** (must be enforced by the route):

- Witness is **never** written to Postgres, Storage, or disk.
- Hono request logger is configured with an explicit allowlist that
  excludes the body of this route.
- After proof generation, the witness buffer is overwritten before
  reply (architect to confirm Bun's `Buffer.fill(0)` is sufficient).
- Rate limit: 1 attempt / device-fingerprint / hour (where
  fingerprint = ephemeral, non-PII client header set by the mobile
  prover router).
- `audit_log` records `{ outcome ∈ {ok, fail}, latency_ms,
  nullifier_if_ok }` — **never** the inputs.

**Response**: `200 { proof, publicSignals }` (same `Proof` shape as in
§5.1). The client then calls `/identity/verify` separately. The
**two-step shape is deliberate** so the trust surface is minimal and the
verify route's contract is identical for on-device and fallback paths.

### 5.3 `GET /citizens/:handle` (public read)

Satisfies `ATID-IDENT-005`, `ATID-IDENT-007`.

**Auth**: none (public).

**Response**: `200 { handle, state, district, complaint_count, joined_at }`
or `404`. **No** `citizen_id`, `nullifier`, `name`, `email`, `ip`.

A JSON-schema test (Vitest + ajv) MUST assert response shape contains
no field outside the whitelist (`ATID-IDENT-007`).

---

## 6. Zod schemas — to land in `packages/shared`

> Project convention places Zod schemas under
> `packages/shared/src/validators/` (not `schema/`). See existing
> `validators/dev-metrics.ts`, `validators/pagination.ts`,
> `validators/primitives.ts`. **OQ-2**: confirm with architect that we
> keep the `validators/` directory and do not introduce a new
> `schema/` sibling.

New files to add:

| Path | Exported schemas | Notes |
|------|------------------|-------|
| `packages/shared/src/validators/zkp.ts` | `ProofShape`, `PublicSignals` (length-9 tuple), `NullifierHex` (32-byte hex), `HandleString` (Base32, length 10) | Foundational primitives reused by routes + DB layer |
| `packages/shared/src/validators/identity.ts` | `VerifyProofRequest`, `VerifyProofResponse`, `ProveRequest`, `ProveResponse`, `CitizenPublicView` | Route I/O |
| `packages/shared/src/constants/zkp.ts` | `FACTIVIST_NULLIFIER_SEED_V1` (`Hex<32>`), `ZKEY_SHA256`, `VKEY_SHA256`, `VERIFIER_CONTRACT_ADDRESS`, `POLYGON_CHAIN_ID`, `PUBLIC_SIGNALS_COUNT = 9` | All pinned constants |

Every schema MUST be re-exported from
`packages/shared/src/validators/index.ts`. Type inference
(`z.infer<typeof X>`) is the canonical TS type — **no parallel
hand-written `types/identity.ts`** (project rule: no `any`, single
source of truth).

**Validation strictness**: `z.object(...).strict()` everywhere — the
threat model treats extra fields as tampering (`Tampering` row,
container §3).

---

## 7. ATIDs to be satisfied

The tester pipeline (Phase 5 step `id-tester`) must produce one
executable assertion per row.

| ATID | Surface | Acceptance signal |
|------|---------|-------------------|
| `ATID-IDENT-001` | `POST /identity/verify` happy path | Row in `citizens` with exact 4-column shape; session cookie set; no PII anywhere |
| `ATID-IDENT-002` | `POST /identity/verify` duplicate | `409 nullifier_already_used`; on-chain `nullifierUsed[]` is the authority |
| `ATID-IDENT-003` | All logs + DB inspection | No banned field appears in any log line, span, or column |
| `ATID-IDENT-004` | Mobile prover routing | Low-tier device → `dev_metrics.llm_calls` with `purpose='zkp_route'` and zero PII |
| `ATID-IDENT-005` | `GET /citizens/:handle` | Only public fields returned; handle deterministic |
| `ATID-IDENT-006` | `packages/shared/src/handle.ts` | Golden test passes across web + mobile; 50-bit decoding |
| `ATID-IDENT-007` | `GET /citizens/:handle` JSON schema | Response whitelist enforced |
| `ATID-COMPL-006` | (downstream) `complaints.author_id` | Raw nullifier never appears outside `citizens` row |

---

## 8. Open questions for the architect

| # | Question | Why parked | Suggested resolution path |
|---|----------|-----------|---------------------------|
| OQ-1 | `complaints.author_id` FK: raw nullifier (`bytea`) vs UUIDv5 derived from nullifier? | `aggregates.md` §1 mentions surrogate UUID but does not commit. `ATID-COMPL-006` says raw nullifier MUST NOT appear outside `citizens`. Implies UUIDv5 derivation. | Architect ratifies UUIDv5 in §3 table + adds a derivation function spec; coder implements `nullifierToUuid()` in `packages/shared`. |
| OQ-2 | Zod schemas land in `validators/` (project convention) — confirm we do NOT introduce a parallel `schema/` directory. | Action-plan §5.1 wording said `schema/`; project filesystem says `validators/`. | Architect ratifies `validators/`; coder follows. |
| OQ-3 | Confirmation depth for `verifyAndRecord` write before issuing session cookie. | Polygon PoS finality is probabilistic; 1 confirmation is fast but reorg-vulnerable; 5 is safer but slower UX. | Architect chooses based on reorg-depth posture; default proposal: **2 confirmations** with optimistic UI ("verified, finalising…"). |
| OQ-4 | Server-fallback witness zeroisation primitive on Bun. | `zkp-key-custody.md` says "overwrites the buffer before reply"; Bun's `Buffer.fill(0)` + explicit deref needs review against V8/JSC retention. | Architect picks a primitive and writes a tester-verifiable assertion. |
| OQ-5 | RPC provider selection + secondary/tertiary fallback order. | `zkp-key-custody.md` says "Primary RPC + 2 fallbacks" but does not name providers. | Phase 5 ops decision; this spec only requires that the API expose a `RPC_URLS` array and rotate on RPC failure. |
| OQ-6 | Epoch boundary mechanics for K-10 session HMAC. | `zkp-key-custody.md` §Key rotation says "Per epoch (matches nullifier epoch)" — but the circuit public signals don't expose epoch length explicitly in this spec. | Architect ratifies epoch length (proposal: **30 days**) and documents it in `packages/shared/src/constants/zkp.ts`. |
| OQ-7 | Rate-limit dimension for `/identity/prove` server-fallback. | `zkp-key-custody.md` says "device-fingerprint" but [[ADR-0010]] forbids device fingerprints. The constraint is "non-PII ephemeral client header". | Architect specifies what header (e.g., a per-session UUID generated client-side and discarded after first use) and whether the rate-limit uses Cloudflare KV or in-process. |
| OQ-8 | Whether `verifyAndRecord` is called from `apps/api` via a hot signer (key in Fly.io secret) or via a relayer (Biconomy / Gelato). | Hot signer simplifies S1; relayer reduces operational key surface. `zkp-key-custody.md` doesn't lock this in. | Architect picks; sec-architect signs off. Default proposal: **hot signer, scoped to verify-only**, with quarterly rotation. |

---

## 9. Hand-off

Once the architect ratifies the table in §3, picks resolutions for
OQ-1..OQ-8, and confirms the route shapes in §5, `id-coder` can
begin in this order:

1. `packages/shared/src/constants/zkp.ts` + `validators/zkp.ts`
2. `packages/shared/src/validators/identity.ts`
3. `packages/db` migration for `citizens` (4 columns, RLS)
4. `apps/api/src/routes/identity/{verify,prove}.ts` + Hono mount
5. `apps/api/src/routes/citizens/[handle].ts` (public read)
6. `apps/web/src/features/identity/proving.ts` (snarkjs worker)
7. `apps/mobile/src/features/identity/proving.ts` (router + native modules)

The tester then writes one executable assertion per ATID in §7.

---

## 10. References

- [`zkp-key-custody.md`](../zkp-key-custody.md)
- [`aggregates.md`](../aggregates.md) §1
- [`threat-model.md`](../threat-model.md) §TB-4, §TB-5, container §6, CC-1
- [[ADR-0003]] [[ADR-0010]] [[ADR-0011]] [[ADR-0018]]
- Wiki — [Research-Anoncitizen-ZKP](https://github.com/facktivist/factivist/wiki/Research-Anoncitizen-ZKP)
- Memory: `reference_s1_zkp_findings.md`, `reference_s2_polygon_gas.md`
