# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Web image. `NEXT_PUBLIC_*` is inlined into the client bundle at build time, so
# the API origin cannot be changed by a build argument. Instead the *server*
# reads `API_PUBLIC_URL` at start and injects it into the page (see
# `apps/web/src/lib/runtime-config.ts`), which makes one image portable across
# environments. `NEXT_PUBLIC_API_URL` here is only the fallback used when a
# container starts with no configuration at all.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm --filter @app/web... build
RUN pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# ponytail: ships the pruned workspace rather than a Next standalone bundle, so
# the image carries node_modules it never loads. Switch on `output: 'standalone'`
# in next.config.ts and copy `.next/standalone` when image size matters.
COPY --from=build /app ./

# Neither image shells out to npm at runtime — both start `node` directly — and
# the npm copy bundled with the base image carries its own dependency tree
# (pacote, sigstore, brace-expansion, ip-address, picomatch). That tree is
# unscannable by our dependency tooling and unreachable by our code, so it is
# removed rather than excluded from the scan: the finding disappears because the
# package does. `corepack` stays, so pnpm is still available if you exec in.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# `next start` writes to `.next/cache` for image optimisation, so that one
# directory is handed to the unprivileged user rather than chowning the whole
# tree — a recursive chown would duplicate every file's metadata in a new layer.
RUN chown -R node:node apps/web/.next
USER node

# A default, not a decision: `docker run -e PORT=8080` still wins.
ENV PORT=3001
EXPOSE 3001

# The browser-facing API origin is read at start, not baked in at build time.
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# `exec` matters: it replaces the shell, so `next` becomes PID 1 and receives
# `docker stop`'s SIGTERM directly. Going through `pnpm --filter … start` would
# put a shell and pnpm between the signal and the server, which is how a
# container ends up SIGKILLed after the grace period instead of draining.
WORKDIR /app/apps/web
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start -p \"$PORT\""]
