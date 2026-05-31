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

This directory pattern is for **local dev only**. Production ships the binary + zkey via one of the three paths below. As of commit `(phase-8 follow-up)` the **Docker-layer path is wired** in `apps/api/Dockerfile`; the S3 init-container and Lambda-layer paths remain available for future hosts.

### Path A — Docker layer (default; wired today)

`apps/api/Dockerfile` has a multi-stage `rapidsnark` stage that downloads + SHA-256 verifies the iden3 release archive at build time and copies the binary into `/opt/zkp/rapidsnark` inside the runtime image. The runtime image sets `FACTIVIST_ZKP_PROVER_BIN=/opt/zkp/rapidsnark` automatically.

Build args (set in `fly.toml` or CI):

| Arg | Required | Example | Notes |
|-----|----------|---------|-------|
| `RAPIDSNARK_VERSION` | only to enable server-prove | `v0.0.10` | Empty default → image ships without the binary; `/identity/prove` returns `503 PROVER_NOT_CONFIGURED`. |
| `RAPIDSNARK_PLATFORM` | optional | `linux-x86_64` | Defaults to `linux-x86_64`. Use `linux-arm64` if Fly switches to Graviton. |
| `RAPIDSNARK_SHA256` | **mandatory** when `RAPIDSNARK_VERSION` is set | `e3b0c44...` | The Dockerfile refuses to download an unsigned archive. Pull the digest from the iden3 release notes or compute locally and pin it. |

To enable on Fly:

```bash
flyctl deploy \
  --build-arg RAPIDSNARK_VERSION=v0.0.10 \
  --build-arg RAPIDSNARK_SHA256=<verified-from-release-page>
```

The same args work in `.github/workflows/deploy-{staging,prod}.yml`; add them to the workflow's `flyctl deploy` step once the maintainer has pinned a version.

The **zkey + wasm** still need to be supplied at runtime via `FACTIVIST_ZKP_ZKEY_PATH` / `FACTIVIST_ZKP_WASM_PATH`. Recommended pattern:

1. Upload `citizen.zkey` + `citizen.wasm` to the Supabase Storage `zkp-artifacts` bucket (private, signed-URL access only).
2. Fly init script downloads them on cold start to `/opt/zkp/` and sets the env vars.

This keeps the ~200MB zkey out of the Docker image (the image stays under ~120MB with just the binary).

### Path B — S3 init container

For Kubernetes / ECS deployments: an init container fetches `rapidsnark` + zkey + wasm from a versioned S3 prefix, verifies SHA-256 against an immutable manifest, and writes them to a shared `emptyDir` volume. Not implemented; kept available for future scale.

### Path C — Lambda layer

For a serverless cut: package the binary + zkey + wasm as a Lambda layer attached to the API function. Not implemented; the cold-start cost of unpacking ~200MB makes this a poor fit for S1.

Whichever path, the artifacts are NEVER fetched at request time — startup-time only, with integrity verification.

## Security

- The witness (Aadhaar number + seed + photo halves) is **never written to disk**. `zkp-prover.ts::zeroiseWitness` overwrites the in-memory buffers in a `finally` block.
- `rapidsnark` reads the witness from stdin (or a tmpfs-backed temp file the API immediately unlinks after the binary exits). No witness ever lands on a persistent volume.
- The zkey is read-only after install.
