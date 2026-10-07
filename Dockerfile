# syntax=docker/dockerfile:1
# Production image for Coolify, in the shape of the other apps on that server.

FROM node:24-slim AS base
# curl is for Coolify's health check, which runs inside the container.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openssl \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma7.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
# next build imports the server modules, which validate their environment on import
# (src/lib/env.ts). The real values exist only when the container runs, so the build gets
# obvious stand-ins; every page renders per request, so no build output keeps them.
# Turbopack's build cache does record the environment it saw; next start never reads
# it, so it is removed.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
  BETTER_AUTH_URL=http://localhost:3000 \
  BETTER_AUTH_SECRET=build-time-stand-in-never-used-at-runtime \
  pnpm build \
  && rm -rf .next/cache

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app ./
EXPOSE 3000
# Migrations run on start, against the real database, before the server takes traffic.
# The binaries are called directly: pnpm at runtime would make corepack download it on
# every boot. `next start` rather than the start script, which pins port 3100 for local
# work; exec so Next receives the stop signal and shuts down gracefully.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node_modules/.bin/next start"]
