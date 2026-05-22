# AnonCitizen v1 → v2 Migration Runbook

**Purpose:** Pre-written, executable plan for migrating AnonCitizen consumers from v1 to a remediated v2 contract.
**When to execute:** triggered by (a) a critical/high finding from the post-launch audit, (b) a valid bug bounty submission against the deployed v1, or (c) a UIDAI key rotation that v1 cannot accommodate.
**Document version:** 1.0
**Date:** 2026-05-23
**Decision owner:** Allan

---

## 1. When to Trigger a Migration

Execute this runbook when **any** of the following is true:

| Trigger | Severity | Action |
|---|---|---|
| Audit finds Critical / High Solidity bug | 🔴 P0 | Immediate migration (within 48h) |
| Audit finds Critical / High Circom bug | 🔴 P0 | Immediate migration (within 48h) |
| Bug bounty Critical accepted | 🔴 P0 | Immediate migration (within 48h) |
| Trusted setup ceremony found compromised | 🔴 P0 | Immediate migration (within 24h) |
| Audit finds Medium that affects correctness | 🟡 P1 | Migration within 2 weeks |
| UIDAI changes Aadhaar XML format / RSA key length | 🟡 P1 | Migration within 4 weeks |
| Multiple Low findings → cumulative drift | 🟢 P2 | Migration on next planned release |
| Successful audit, no findings | — | No migration; promote v0.1.0 → v1.0.0 |

---

## 2. Pre-Migration Checklist

Complete before deploying v2.

- [ ] Bug confirmed and reproduced in a test case
- [ ] Fix written, peer-reviewed, and merged to `main`
- [ ] Fix covered by an explicit regression test
- [ ] Circuit changes (if any) re-compiled, new `.zkey` generated
- [ ] **New trusted setup ceremony executed** (if circuit changed) — DO NOT reuse v1 `.zkey`
- [ ] New ceremony attestation published
- [ ] New `Groth16Verifier.sol` regenerated via snarkjs from new `.zkey`
- [ ] v2 contract addresses reserved (deployer wallet ready, gas funded)
- [ ] npm package versions bumped: `@anoncitizen/contracts`, `@anoncitizen/core`, `@anoncitizen/react`
- [ ] Migration communication drafted (see §6)
- [ ] Rollback plan documented (§8)

---

## 3. Deployment Sequence

### Step 3.1 — Deploy v2 contracts

```bash
# 1. Deploy new Groth16Verifier (auto-gen from new .zkey)
cd packages/contracts
forge create contracts/Groth16Verifier.sol:Groth16Verifier \
  --rpc-url $POLYGON_RPC \
  --private-key $DEPLOYER_KEY

# Record: VERIFIER_V2_ADDRESS

# 2. Deploy new AnonCitizen wrapper pointing at VERIFIER_V2_ADDRESS
forge create contracts/AnonCitizen.sol:AnonCitizen \
  --rpc-url $POLYGON_RPC \
  --private-key $DEPLOYER_KEY \
  --constructor-args $VERIFIER_V2_ADDRESS

# Record: ANONCITIZEN_V2_ADDRESS
```

### Step 3.2 — Verify on Polygonscan

```bash
forge verify-contract $VERIFIER_V2_ADDRESS Groth16Verifier --chain 137
forge verify-contract $ANONCITIZEN_V2_ADDRESS AnonCitizen --chain 137 \
  --constructor-args $(cast abi-encode "constructor(address)" $VERIFIER_V2_ADDRESS)
```

### Step 3.3 — Seed trusted UIDAI public keys

```bash
# For each known UIDAI pubkey hash:
cast send $ANONCITIZEN_V2_ADDRESS \
  "addTrustedPubKeyHash(uint256)" \
  $UIDAI_PUBKEY_HASH \
  --rpc-url $POLYGON_RPC \
  --private-key $DEPLOYER_KEY
```

### Step 3.4 — Smoke test on mainnet

- Generate a proof against v2 from a known-good Aadhaar QR (test wallet)
- Call `verifyAndRecord` on v2
- Confirm `ProofVerified` event emitted
- Confirm `isNullifierUsed(nullifier) == true` after the call
- Confirm replay reverts with `NullifierAlreadyUsed`

### Step 3.5 — Update package addresses

In `packages/contracts/src/addresses.ts`:

```ts
export const ADDRESSES = {
  137: {
    anonCitizenV1: "0x...",        // keep for read-only queries
    anonCitizenV2: "0x...",        // new write target
    verifierV2:    "0x...",
  },
} as const;
```

### Step 3.6 — Publish new package versions

```bash
# Semver: any v1 bug = breaking change (proof format may differ if circuit changed)
cd packages/contracts && npm version major && npm publish
cd packages/core       && npm version major && npm publish
cd packages/react      && npm version major && npm publish
```

---

## 4. Consumer Migration

### 4.1 Web / Node.js consumers

Consumers update via npm:

```bash
npm install @anoncitizen/core@latest @anoncitizen/react@latest @anoncitizen/contracts@latest
```

Code change required if circuit changed (new wasm/zkey URLs):

```diff
<AnonCitizenProvider
-  config={{ wasmUrl: "/v1/circuit.wasm", zkeyUrl: "/v1/circuit.zkey" }}
+  config={{ wasmUrl: "/v2/circuit.wasm", zkeyUrl: "/v2/circuit.zkey" }}
  publicKey={uidaiPublicKey}
>
```

If only Solidity changed (not the circuit), users do NOT need to re-prove — they can re-submit existing proofs to the new contract.

### 4.2 Direct on-chain integrators

Any dapp calling AnonCitizen v1 directly must update its stored contract address. Provide them with:

- New address (`ANONCITIZEN_V2_ADDRESS`)
- Diff summary (what changed in the ABI, if anything)
- Deprecation timeline for v1 (§5)
- Migration support channel (Discord / email / GitHub Issues)

---

## 5. v1 Deprecation Timeline

| Day | Action |
|---|---|
| **T+0** | v2 deployed. Announce migration. Both v1 and v2 live. |
| **T+7** | npm packages publish v2. v1 packages flagged deprecated (`npm deprecate`). |
| **T+14** | Frontend / docs default examples point at v2. |
| **T+30** | v1 contract marked deprecated on Polygonscan (add tag, link to migration notice). |
| **T+60** | First reminder to remaining v1 consumers. |
| **T+90** | Final reminder. Document that v1 will be considered "abandoned" past this date. |
| **T+90+** | v1 contract remains on-chain (immutable, cannot be destroyed) but is officially unsupported. |

**Note:** v1 cannot be destroyed — Solidity contracts on Polygon PoS are immutable. The only "deprecation" available is social: communication, docs, npm flags. Plan accordingly.

---

## 6. Communication Plan

### 6.1 Channels

| Channel | Purpose | Owner |
|---|---|---|
| GitHub Release notes on `anoncitizen` repo | Authoritative changelog | Allan |
| README banner on all three packages | First-touch warning | Allan |
| Twitter / Farcaster post | Reach hobbyist users | Allan |
| Direct email to known integrators | Compliance / enterprise users | Allan |
| Discord announcement (if/when channel exists) | Community | Allan |

### 6.2 Message template

```
🔄 AnonCitizen v2 deployed — please migrate

Why: [audit finding / bug bounty / UIDAI change] required a contract update.
Severity: [Critical / High / Medium]
Impact on existing proofs: [must re-prove / can re-submit to v2 / no action needed]

New contract address: 0x...
New npm versions: @anoncitizen/contracts@2.x, @anoncitizen/core@2.x, @anoncitizen/react@2.x

v1 deprecation timeline: T+90 days from this notice (see runbook §5).

Migration guide: [link to docs]
Questions: [GitHub issue / email]
```

### 6.3 Disclosure approach for security bugs

| Severity | Disclosure timing |
|---|---|
| Critical | Coordinated: deploy v2 FIRST, then disclose bug + migration simultaneously |
| High | Same as Critical |
| Medium | Disclose with migration notice |
| Low | Disclose in changelog, no special notice |

**Never disclose an unpatched Critical/High publicly.** Always patch (v2 live) before naming the bug.

---

## 7. State Migration Considerations

AnonCitizen v1 stores two pieces of state that DO NOT transfer to v2:

### 7.1 `nullifierUsed[]` mapping

- v1's used-nullifier set is NOT copied to v2
- Risk: a user could re-prove against v2 using the same nullifier seed as in v1
- Mitigation A (recommended): include a `version` byte in the nullifier seed convention so v1 and v2 nullifiers are incompatible by construction
- Mitigation B: have consuming dapps query BOTH v1 and v2 `isNullifierUsed()` during the transition window
- Mitigation C: ignore — accept that users get one "free re-prove" at the migration boundary. Often acceptable for low-stakes use cases.

**Decide which mitigation applies before deploying v2. Document it in the migration release notes.**

### 7.2 `trustedPubKeyHash[]` mapping

- v2 starts with an empty trusted pubkey set
- Must be re-seeded by the owner (§3.3)
- Make sure §3.3 runs BEFORE smoke tests in §3.4

---

## 8. Rollback Plan

If v2 deployment goes wrong:

| Failure mode | Rollback action |
|---|---|
| v2 deploy fails on-chain | Re-deploy. Polygon PoS deploy is cheap (~$2). |
| v2 verifies invalid proofs | **STOP all promotion.** Tell users to continue using v1. Investigate. Deploy v3 when fixed. |
| v2 fails to verify valid proofs | Same as above. v1 stays primary. |
| npm publish broken | Unpublish within 72h (npm window), re-publish. Update addresses file. |
| Wrong UIDAI pubkey seeded | Call `removeTrustedPubKeyHash`, then `addTrustedPubKeyHash` with correct value. |

**v1 contract remains live throughout migration.** It is the rollback target by default. Do not encourage users to abandon v1 until v2 has run successfully for at least 7 days.

---

## 9. Post-Migration Verification

T+7 checklist:

- [ ] v2 has processed ≥ 10 successful proofs
- [ ] Zero `InvalidProof` reverts (other than expected attacker noise)
- [ ] All npm packages report v2 as `latest`
- [ ] Polygonscan v1 page links to v2
- [ ] No new bug reports against v2
- [ ] If circuit changed: new `.zkey` ceremony attestation published and linked

T+30 checklist:

- [ ] > 50% of v1 traffic migrated to v2
- [ ] All known direct integrators acknowledged migration
- [ ] v1 npm packages deprecated
- [ ] Migration retrospective written and saved as `docs/product/anoncitizen-v2-migration-retro.md`

---

## 10. Quick Reference

**v1 contract:** `[fill in after deploy]`
**v2 contract:** `[fill in after deploy]`
**Owner key wallet:** `[fill in — store in 1Password]`
**Deployer key wallet:** `[fill in — store in 1Password]`
**Polygon RPC:** `https://polygon-rpc.com` (or Alchemy)
**Migration support email:** `procurement@theprocedure.in`

---

## 11. Related Documents

- `docs/product/anoncitizen-audit.md` — Audit scope, options, and cost plan
- `https://github.com/raveracker/anoncitizen` — Source repository
