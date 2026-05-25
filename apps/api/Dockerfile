# Minimal Bun runtime image for apps/api.
#
# Build is performed in CI via `bun build --target=bun --outdir=dist`
# (see apps/api/package.json `build` script). This Dockerfile only needs
# the bun runtime + the dist artifact; native bundling keeps the image
# under ~80MB.

FROM oven/bun:1.3-alpine AS runtime

WORKDIR /app

# Copy only what the runtime needs.
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/dist ./apps/api/dist

# Bun reads `bun.lock`; we install with --production to drop dev deps.
RUN bun install --production --frozen-lockfile || bun install --production

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# `dist/index.js` is the bundled Bun entry produced by CI.
CMD ["bun", "apps/api/dist/index.js"]
