# Phase 5 — Identity Contract (Pipeline A)

> Build-time contract for the **identity** bounded context. Source ADRs:
> [[ADR-001]] (Drizzle), [[ADR-002]] (Zod in shared), [[ADR-003]] (verifier only),
> [[ADR-010]] (anonymity floor), [[ADR-011]] (hybrid proving),
> [[ADR-018]] (proving stack per platform). Domain authority:
> `docs/architecture/bounded-contexts.md` §identity, `docs/architecture/aggregates.md` §Citizen.
>
> Derived by `id-coder` from the ratified Phase 4 artefacts. Pipeline A wave 1.

---

## 1. Wire shape

### `POST /identity/verify`

Request body (Zod: `VerifyProofRequest`):

```ts
{
  proof: {
    pi_a: [string, string, string],
    pi_b: [[string, string], [string, string], [string, string]],
    pi_c: [string, string, string],
    protocol: 'groth16',
    curve: 'bn128'
  },
  publicSignals: [
    /* [0] */ nullifier      : Hex<32>,  // 0x + 64 hex chars
    /* [1] */ epoch          : string,    // decimal stringified uint32
    /* [2] */ stateCode      : string,    // ECI 2-char (e.g. "KA")
    /* [3] */ districtCode   : string     // <state>-<seq>, e.g. "KA-09"
  ],
  sessionNonce: string  // single-use challenge from POST /identity/nonce
}
```

Responses:

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{ verified: true, handle, citizen: { handle, stateCode, districtCode, joinedAt } }` | First-time success — citizen row inserted |
| `200` | `{ verified: true, handle, citizen: {...}, idempotent: true }` | Same nullifier already present (replay of same proof) — idempotent insert |
| `409` | `{ error: 'nullifier_already_used', code: 'NULLIFIER_REPLAY' }` | Different session/device tried to reuse a known nullifier |
| `400` | `{ error: 'invalid_proof', code: 'PROOF_MALFORMED' }` | Zod validation failed (shape) |
| `400` | `{ error: 'invalid_proof', code: 'PROOF_REJECTED' }` | snarkjs `verify()` returned false (signature shape ok, proof bad) |
| `503` | `{ error: 'feature_disabled', code: 'S1_COMPLAINT_SUBMIT_OFF' }` | Feature flag `S1_COMPLAINT_SUBMIT=false` — write paths gated |
| `503` | `{ error: 'db_down' }` | DATABASE_URL unset / db unreachable |

### `GET /identity/session`

Returns the verification status for the bearer of the session cookie / header
`x-factivist-session`. No body. (Mirrors `GET /identity/me` from bounded-contexts.md
but renamed per Phase 5 spec to avoid implying we surface PII.)

```ts
// 200
{
  verified: boolean,
  handle: string | null,
  stateCode: string | null,
  districtCode: string | null
}
```

---

## 2. Drizzle schema — `citizens`

Per [[ADR-010]] + aggregate §Citizen, the row contains exactly:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text PK` | prefix `cit_<uuid>` |
| `nullifier` | `text NOT NULL` | `0x` + 64 hex chars; **unique index** |
| `state_code` | `text NOT NULL` | ECI code |
| `district_code` | `text NOT NULL` | `<state>-<seq>` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

No name, Aadhaar, email, phone, photo, device id, IP, user-agent.
**Adding any other column requires an ADR.**

### `feature_flags`

| Column | Type | Notes |
|--------|------|-------|
| `key` | `text PK` | enum: `S1_PUBLIC_BROWSE` \| `S1_COMPLAINT_SUBMIT` (seeded `false`) |
| `enabled` | `boolean NOT NULL DEFAULT false` | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | `$onUpdate(() => new Date())` |

Per aggregate §FeatureFlag I-FF-1, admin auth + audit-log are S2-ish — for
Phase 5 wave 1 we ship the table + read helpers; the admin write surface is a
later wave (see Pipeline E).

---

## 3. Zod schemas in `packages/shared/src/validators/identity`

- `nullifierSchema` — branded `Hex<32>` (regex `/^0x[0-9a-f]{64}$/i`, lowercased).
- `groth16ProofSchema` — exact shape above.
- `verifyProofRequestSchema` — wraps proof + publicSignals + sessionNonce.
- `verifyProofResponseSchema` — discriminated union by `verified` / `error`.
- `sessionStatusSchema` — `GET /identity/session` response.

Types re-exported via `packages/shared/src/types/identity.ts`.

---

## 4. `@factivist/zkp-client` package

A new workspace package. Exports a single async function:

```ts
verifyProofOnDevice(
  proof: Groth16Proof,
  publicSignals: readonly string[]
): Promise<boolean>
```

Implementation selects the prover backend per ADR-0018:

- **iOS** → rapidsnark (resolved lazily via dynamic import of the RN native module).
- **Web + Android** → snarkjs (`groth16.verify`).
- **Server-side fallback** — out of scope for Phase 5 wave 1; documented as a
  TODO in the package README.

The package is dependency-light and ESM-pure so Expo/Next/Bun can all import it.
Verification key path is configurable via `setVerificationKey(vKey)`; in Phase 5
the actual vKey ships in a follow-up wave with the deployed `CitizenVerifier.sol`.
For now we expose a stub vKey loader that throws a clear "not configured" error
when neither `setVerificationKey` nor the env-var `FACTIVIST_ZKP_VKEY_URL` is set.

---

## 5. Hono routes — `apps/api/src/routes/identity.ts`

- Mount via `app.route('/identity', identityRoute)`.
- `POST /verify` reads `S1_COMPLAINT_SUBMIT` from `feature_flags`. If false → 503.
- Nullifier dedupe → `409` on conflict (Drizzle `onConflictDoNothing` + read-back).
- `GET /session` is unauthenticated — surfaces "unverified" for callers without a
  session cookie. For Phase 5 wave 1 we accept the header `x-factivist-nullifier`
  as a stand-in (full session-cookie wiring is Pipeline F).
- Every route is wrapped with `@hono/zod-validator` against the shared Zod schemas.

---

## 6. Apps

- **apps/web/src/features/identity** — Server Component shell + client `<VerifyForm>`
  that calls into `@factivist/zkp-client` then `POST /identity/verify`.
- **apps/mobile/src/features/identity** — Expo screen wrapping the HeroUI Native
  `Onboarding.*` compounds. Same client-side flow as web; rapidsnark resolved at
  runtime when `Platform.OS === 'ios'`.

Both surfaces are **stubs** — they wire the contract, render the compound, and
talk to the API. Full UI polish + a11y sweeps land in later waves.

---

## 7. Env / secrets

No `.env` writes from this agent. New env vars (documented in
`apps/api/.env.example` only):

- `FACTIVIST_ZKP_VKEY_URL` — optional URL to the Groth16 verification key JSON.
  Default behaviour without it: `verifyProofOnDevice` throws a typed
  `ZkpNotConfiguredError`, the API route returns `503 zkp_not_configured`. This
  is acceptable for Phase 5 wave 1; Pipeline E will set this in CI/CD.

---

## 8. Test surface (id-tester takes over from here)

- Drizzle schema column set + unique index (vitest + schema introspection).
- Zod schema accept/reject golden tests.
- Hono route integration tests via `app.request()`:
  - happy path → 200
  - replay → 409
  - flag off → 503
  - malformed proof → 400
- `zkp-client` runtime selection — mocked rapidsnark on iOS path; mocked snarkjs
  on web path.
- Apps render smoke tests (Testing Library + Detox stubs).

---

## 9. Files this contract authorises `id-coder` to create / modify

1. `packages/db/src/schema/citizens.ts` (new)
2. `packages/db/src/schema/feature_flags.ts` (new)
3. `packages/db/src/schema/index.ts` (export new modules)
4. `packages/db/src/seed/feature_flags.ts` (new — idempotent seed)
5. `packages/shared/src/validators/identity.ts` (new)
6. `packages/shared/src/validators/index.ts` (export)
7. `packages/shared/src/types/identity.ts` (new)
8. `packages/shared/src/types/index.ts` (export)
9. `packages/zkp-client/*` (new package)
10. `apps/api/src/routes/identity.ts` (new)
11. `apps/api/src/app.ts` (mount the route)
12. `apps/api/src/lib/flags.ts` (new — request-scoped flag reader)
13. `apps/api/.env.example` (document `FACTIVIST_ZKP_VKEY_URL`)
14. `apps/web/src/features/identity/*` (new)
15. `apps/mobile/src/features/identity/*` (new)
