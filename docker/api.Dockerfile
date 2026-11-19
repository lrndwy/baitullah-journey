# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# API image: build the whole workspace, then keep only what production needs.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Dependencies are installed from the manifests alone, so editing source code
# does not invalidate the (slow) install layer.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# `...` includes each package's workspace dependencies, so core and contracts
# are built before the API that imports them.
RUN pnpm --filter @app/api... build
RUN pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./

# Neither image shells out to npm at runtime — both start `node` directly — and
# the npm copy bundled with the base image carries its own dependency tree
# (pacote, sigstore, brace-expansion, ip-address, picomatch). That tree is
# unscannable by our dependency tooling and unreachable by our code, so it is
# removed rather than excluded from the scan: the finding disappears because the
# package does. `corepack` stays, so pnpm is still available if you exec in.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# The official Node images ship an unprivileged `node` user (uid 1000). The API
# writes nothing to disk, so this is the whole hardening step.
USER node

# Every configuration value is read from the environment at start, so one image
# runs in any environment: `docker run -e DATABASE_URL=… -e REDIS_URL=…`.
ENV PORT=3000
EXPOSE 3000

# `--start-period` covers the migration run that happens before the port opens.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "apps/api/dist/main.js"]
