# Minimal Bun runtime image for apps/api.
#
# Build is performed in CI via `bun build --target=bun --outdir=dist`
# (see apps/api/package.json `build` script). This Dockerfile bakes in
# the bun runtime + the dist artifact + (optionally) the rapidsnark
# binary used by the server-side ZKP prover fallback.

# ─────────────────────────────────────────────────────────────────────
# Stage 1 — rapidsnark
#
# Downloads + SHA-256 verifies the rapidsnark binary from the iden3
# upstream release. Skipped entirely if `RAPIDSNARK_VERSION` is empty
# (the default), so dev images without server-side proving stay tiny.
#
# Build args (passed via `flyctl deploy --build-arg` or in CI):
#   RAPIDSNARK_VERSION  — e.g. v0.0.10 (no leading "release-" prefix)
#   RAPIDSNARK_PLATFORM — linux-x86_64 (default for Fly.io shared-cpu)
#                         or linux-arm64
#   RAPIDSNARK_SHA256   — hex digest of the published archive, mandatory
#                         when RAPIDSNARK_VERSION is set
# ─────────────────────────────────────────────────────────────────────
FROM alpine:3.20 AS rapidsnark
ARG RAPIDSNARK_VERSION=""
ARG RAPIDSNARK_PLATFORM="linux-x86_64"
ARG RAPIDSNARK_SHA256=""

WORKDIR /tmp/rapidsnark

RUN apk add --no-cache curl tar coreutils && \
    if [ -n "$RAPIDSNARK_VERSION" ]; then \
      if [ -z "$RAPIDSNARK_SHA256" ]; then \
        echo "ERROR: RAPIDSNARK_VERSION set without RAPIDSNARK_SHA256 — refusing to fetch an unsigned binary" >&2; \
        exit 1; \
      fi; \
      url="https://github.com/iden3/rapidsnark/releases/download/${RAPIDSNARK_VERSION}/rapidsnark-${RAPIDSNARK_PLATFORM}.tar.gz"; \
      echo "Fetching $url"; \
      curl -fsSL -o archive.tgz "$url"; \
      echo "${RAPIDSNARK_SHA256}  archive.tgz" | sha256sum -c -; \
      tar -xzf archive.tgz && rm archive.tgz; \
      test -x ./rapidsnark || (echo "rapidsnark binary not found in archive" >&2 && exit 1); \
      mkdir -p /opt/zkp && cp ./rapidsnark /opt/zkp/rapidsnark && chmod 0755 /opt/zkp/rapidsnark; \
    else \
      # No version pinned → ship a placeholder so the COPY in the next
      # stage succeeds and the runtime falls back to ProverNotConfigured.
      mkdir -p /opt/zkp; \
    fi

# ─────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# ─────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS runtime

WORKDIR /app

# Copy only what the runtime needs.
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/dist ./apps/api/dist

# Bun reads `bun.lock`; we install with --production to drop dev deps.
RUN bun install --production --frozen-lockfile || bun install --production

# Stage-1 either copies the rapidsnark binary or nothing — both cases are
# safe. The runtime probes FACTIVIST_ZKP_PROVER_BIN and falls back to
# 503 PROVER_NOT_CONFIGURED when the binary is absent.
COPY --from=rapidsnark /opt/zkp /opt/zkp
ENV FACTIVIST_ZKP_PROVER_BIN=/opt/zkp/rapidsnark

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# `dist/index.js` is the bundled Bun entry produced by CI.
CMD ["bun", "apps/api/dist/index.js"]
