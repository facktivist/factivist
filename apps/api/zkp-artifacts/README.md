# ZKP Prover Artifacts (local-only, gitignored)

This directory holds the **rapidsnark binary** + **AnonCitizen zkey** the server-side prover invokes when a low-tier mobile device falls back to server proving via `POST /identity/prove` (ADR-0011 hybrid stack, identity-wiring.md §5.2).

**Nothing in this directory is committed.** `.gitignore` excludes everything except this README + `.gitkeep`.

## What goes here

| File | Source | Approx size |
|---|---|---|
| `rapidsnark` (binary) | https://github.com/iden3/rapidsnark/releases | ~12 MB per platform |
| `citizen.zkey` (proving key) | AnonCitizen ceremony output | ~50–200 MB |
| `citizen.wasm` (circuit) | AnonCitizen circuit compile output | ~5 MB |

`citizen.zkey` SHA-256 must match the constant exported from `packages/shared/src/constants/zkp.ts` (when that file lands — see Phase 9 deferred doc). Until then the prover trusts the on-disk file.

## Local setup

```bash
# 1. Download rapidsnark for your platform
cd apps/api/zkp-artifacts/
curl -L -o rapidsnark.tar.gz https://github.com/iden3/rapidsnark/releases/latest/download/rapidsnark-darwin-arm64.tar.gz
#   ↑ swap for linux-x64 / darwin-x64 as needed
tar -xzf rapidsnark.tar.gz && rm rapidsnark.tar.gz
chmod +x rapidsnark

# 2. Obtain the AnonCitizen zkey + circuit wasm
#    AnonCitizen is upstream of Factivist; coordinate with the AnonCitizen
#    project for the canonical ceremony output. For local dev you can use
#    the test fixtures the AnonCitizen repo ships with.
#    (Specific download URL pending Phase 9 — track in docs/phase-9-deferred.md)

# 3. Point the API at the artifacts
cat >> apps/api/.env.local <<EOF
FACTIVIST_ZKP_PROVER_BIN=$(pwd)/rapidsnark
FACTIVIST_ZKP_ZKEY_PATH=$(pwd)/citizen.zkey
FACTIVIST_ZKP_WASM_PATH=$(pwd)/citizen.wasm
EOF
```

## How the API consumes these

`apps/api/src/lib/zkp-prover.ts` reads the three env vars on first call to `proveServerSide()` and registers a `Bun.spawn`-backed `ProverBackend` in the `__prover.backend` slot. If any env var is unset, the prover throws `ProverNotConfiguredError` → route returns `503 PROVER_NOT_CONFIGURED` (mobile clients then surface the "device proving only" notice).

## Production deployment

This directory pattern is for **local dev only**. Production (Phase 9) ships the binary + zkey via:
- Docker layer baked at build time, OR
- S3-backed init container that fetches with SHA-256 verification, OR
- Lambda layer if the API moves to serverless.

Whichever path, the artifacts are NEVER fetched at request time — startup-time only, with integrity verification.

## Security

- The witness (Aadhaar number + seed + photo halves) is **never written to disk**. `zkp-prover.ts::zeroiseWitness` overwrites the in-memory buffers in a `finally` block.
- `rapidsnark` reads the witness from stdin (or a tmpfs-backed temp file the API immediately unlinks after the binary exits). No witness ever lands on a persistent volume.
- The zkey is read-only after install.
