# Baitullah Journey

A modular, production-oriented fullstack starter. Next.js web + NestJS API +
Postgres + Redis, in a pnpm/Turborepo monorepo, shipped in Docker.

The point of this template is the **module contract**: every feature is a
self-contained module that can be added or removed without touching the core.

---

## Quick start

```bash
cp .env.example .env          # defaults work for local development
pnpm install
pnpm --filter @app/core db:generate   # only after changing the schema
docker compose -f docker/docker-compose.yml up --build
```

| Service  | URL                            |
| -------- | ------------------------------ |
| Web      | http://localhost:3001          |
| API      | http://localhost:3000          |
| Health   | http://localhost:3000/health   |
| Ready    | http://localhost:3000/ready    |

Sign in at `/login` with email and password. Set `BOOTSTRAP_ADMIN_EMAIL` +
`BOOTSTRAP_ADMIN_PASSWORD` to seed a default administrator on first boot
(existing users are never overwritten).

Public catalogue, content, and inquiry forms are driven by the `packages`,
`content`, and `inquiries` modules. In development an empty database is seeded
with demo packages automatically.

### Running without Docker

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
cp .env.example .env
pnpm db:migrate
pnpm dev                      # turbo: watches core, contracts, api and web
```

---

## What's in the box

| Requirement            | Where it lives                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| Auth with Google       | `apps/api/src/modules/auth` — OAuth code hand-off, rotating refresh tokens |
| RBAC                   | `apps/api/src/modules/rbac` + kernel guards in `platform/security`     |
| Email + password       | same module — plus reset-by-code (`docs/AUTH.md`)                      |
| Password policy        | `packages/contracts/src/password.ts` — strength, lockout, rotation (`docs/PASSWORD-POLICY.md`) |
| Audit log              | Recorder in `platform/audit`, viewer in `modules/audit`                |
| High-traffic readiness | Stateless API, pooled Postgres, Redis rate limiting, keyset pagination |
| Heavy CRUD             | `modules/users` — the reference implementation                         |
| User profiles          | `modules/profile` — self-service, with photo upload                    |
| Branding               | `modules/settings` — site name, logo, favicon (`docs/BRANDING.md`)     |
| File storage           | `modules/storage` + kernel `ObjectStore` (S3-compatible)               |
| Backup & restore       | `modules/backup` — replace and merge modes                             |
| Module isolation       | `modules/index.ts` + the `boundaries` gate                             |
| Admin dashboard        | `apps/web/src/app/admin` — navigation is built from the API            |
| UI components          | shadcn/ui (Radix) in `apps/web/src/components/ui`, themed by CSS vars  |
| Docker images in CI    | `.github/workflows/release.yml` — multi-arch, pushed to GHCR           |

### Documentation

| Document | Covers |
|---|---|
| [`docs/AUTH.md`](docs/AUTH.md) | authentication vs authorization, the flows, the three credential types |
| [`docs/PASSWORD-POLICY.md`](docs/PASSWORD-POLICY.md) | strength levels, account lockout, password rotation, and the database-side equivalents |
| [`docs/STORAGE-AND-BACKUP.md`](docs/STORAGE-AND-BACKUP.md) | S3-compatible storage, presigned transfers, backup semantics |
| [`docs/BRANDING.md`](docs/BRANDING.md) | the upload handshake, avatars, site branding, uploading a backup |
| [`docs/DEPLOY-DOKPLOY.md`](docs/DEPLOY-DOKPLOY.md) | deploying the published images: registry credentials, per-service environment, domains, first sign-in |

---

## The module contract

A module is **not a plugin**. There is no dynamic loading and no runtime
registry mutation — that machinery is where modular systems go to die. A module
is a folder plus one line in a list.

```
apps/api/src/modules/<name>/
├── <name>.manifest.ts    # what the module contributes (declarative)
├── <name>.service.ts
├── <name>.controller.ts
├── <name>.module.ts      # Nest wiring
└── migrations/           # optional: this module's own .sql files
```

And it is registered in exactly one place:

```ts
// apps/api/src/modules/index.ts
export const moduleDescriptors: ModuleDescriptor[] = [
  { manifest: authManifest,    implementation: AuthModule },
  { manifest: rbacManifest,    implementation: RbacModule },
  { manifest: auditManifest,   implementation: AuditModule },
  { manifest: usersManifest,   implementation: UsersModule },
  { manifest: profileManifest, implementation: ProfileModule },
  { manifest: storageManifest, implementation: StorageModule },
  { manifest: backupManifest,  implementation: BackupModule },
]
```

| Module | Core | Owns |
|---|---|---|
| `auth` | ✅ | Google OAuth, email + password, reset codes, sessions |
| `rbac` | ✅ | roles, permissions, grants |
| `audit` | – | the audit viewer (recording is kernel infrastructure) |
| `users` | – | the reference CRUD module |
| `profile` | – | per-user profile details |
| `storage` | – | S3-compatible file metadata |
| `backup` | – | export/import of declared data and files, including uploaded archives |
| `settings` | – | site name, logo and favicon |

Bulk operations take an explicit **id list**, not a filter:

```
POST /api/users/bulk-delete          { ids: [...] }
POST /api/storage/files/bulk-delete  { ids: [...] }
```

A filter-based bulk delete turns one confused click into "deleted everything
matching this search", which is not a recoverable mistake. Capped at 200 ids per
call. There is deliberately **no** bulk delete for the audit log: the trail is
append-only, and its retention belongs to a scheduled job rather than to whoever
is holding the mouse.

### What a manifest declares

| Field         | Effect                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `name`        | Unique key; also the HTTP prefix `/api/<name>` and the audit attribution |
| `core`        | `true` modules can never be disabled — the platform depends on them     |
| `permissions` | Contributed to the RBAC catalogue; the **kernel** enforces them         |
| `adminNav`    | Sidebar entries, filtered by the caller's permissions                   |
| `emits` / `listens` | Domain events — how modules talk without importing each other     |
| `tables`      | Drizzle tables this module owns, in dependency order. Backup **only** touches declared tables — which is what keeps sessions and the audit trail out of an archive |

### Adding a module

1. `cp -r apps/api/src/modules/users apps/api/src/modules/billing` (or start
   from scratch).
2. Give it a unique `name` and its own permissions in the manifest.
3. Append one entry to `moduleDescriptors`.
4. `pnpm --filter @app/api boundaries` — the gate will tell you if you reached
   into another module.

Nothing in `apps/api/src/platform/` changes.

### Removing a module

Delete the folder and its line in `moduleDescriptors`. Its routes disappear,
its permissions are pruned from the catalogue on next boot, and its sidebar
entry vanishes. If it owned a Postgres schema, drop it:

```sql
DROP SCHEMA billing CASCADE;
```

### Disabling a module without deleting it

```bash
MODULES_DISABLED=billing,reports     # deny-list
MODULES_ENABLED=billing              # allow-list; wins over the deny-list
```

The dev compose file forwards both, so this works in a running stack too:

```bash
MODULES_DISABLED=users docker compose -f docker/docker-compose.yml up -d api
```

A disabled module is never instantiated, so its controllers are never mounted
(`/api/billing` returns 404) and the frontend never sees it.

### The rules the build enforces

`pnpm boundaries` (also a CI gate) fails the build if:

1. a module imports another module's internals — use `@app/core` or an event;
2. the kernel imports a module anywhere except `modules/index.ts`.

Conventions nobody checks erode in about three months. This one is a red build.

---

## Architecture

```
apps/api/src/
├── platform/            # the kernel — knows nothing about installed modules
│   ├── security/        # auth guard, permission guard, rate limiter, tokens
│   ├── audit/           # recorder + interceptor (recording is infrastructure)
│   ├── registry/        # ModuleRegistry: the manifest source of truth
│   ├── meta/            # GET /api/_meta/{modules,navigation,permissions}
│   └── http/            # exception filter, request context
└── modules/             # features — the only thing you touch day to day

packages/core            # kernel library: config, logger, db, cache, contracts
packages/contracts       # Zod schemas + types shared by API and web

apps/web/src/
├── app/                 # Next.js App Router: landing, /login, /auth/callback
│   ├── (shell)/         # route group: the signed-in chrome (sidebar + header)
│   │   ├── admin/       # dashboard shell + one page per module surface
│   │   └── profile/     # the self-service page, at /profile — not under /admin
│   └── …                # login, forgot-password, reset-password (no chrome)
├── components/ui/       # shadcn/ui — source you own
├── components/admin/    # sidebar, page header, theme toggle
└── lib/                 # api client (token refresh), session provider
```

### UI (shadcn/ui)

Every surface is built from **shadcn/ui** components, copied into the repo under
`apps/web/src/components/ui`. They are source you own, not a dependency you
inherit — restyle them, or delete the ones you do not want.

```bash
cd apps/web
pnpm dlx shadcn@latest add table dialog select tabs   # add more
```

- Base: **Radix** primitives (`radix-ui`), style preset `radix-nova`, Lucide icons.
- Theming: CSS variables in `globals.css` under `:root` / `.dark`, driven by
  `next-themes` (`attribute="class"`). A toggle lives in the admin header.
- Shared admin pieces live in `components/admin/` — the sidebar reads its menu
  from `GET /api/_meta/navigation`, so a new module appears without a frontend
  change.
- Toasts go through `sonner`; `lib/api.ts` throws `ApiError`, pages turn that
  into a toast.

Because the design tokens are CSS variables, a rebrand is a token edit rather
than a find-and-replace across components.

### Admin UI conventions

Four rules every table and page follows, so the admin behaves the same way
wherever you are:

| Convention | Where it lives |
|---|---|
| **Tooltips** on every icon-only or consequential action | `components/admin/icon-action.tsx` (`IconAction`, `Tip`) |
| **Pagination** with rows-per-page, range, page count and first/prev/next | `components/admin/data-pagination.tsx` + `lib/pagination.ts` |
| **Breadcrumbs** derived from the path, with detail pages naming themselves | `lib/breadcrumbs.ts` + `components/admin/breadcrumb-context.tsx` |
| **Gradient stat cards** with per-tone light/dark palettes | `components/admin/gradient-stat-card.tsx` |

Two hooks back the paginator, because some lists are server-paged and others are
already complete in memory:

```ts
usePaginated<T>({ path, params })   // cursor + total from the API
useClientPaginated<T>(all)          // slices an array it is handed
```

Both return the same shape, so `<DataPagination />` renders either one.

**Bulk destructive actions take an id list, never a filter**, and clear the
selection on success — a banner that still says "3 selected" after the rows are
gone is a lie the next click acts on. The audit log has no bulk delete at all:
the trail is append-only, and its retention belongs to a scheduled job.

**Guards run in this order:** rate limit → authentication → permissions. Every
route is protected unless it is explicitly `@Public()`.

**Modules contribute, the kernel enforces.** A module declares
`users.delete`; the permission guard is the only thing that decides. No module
re-implements authorisation.

**Audit recording is infrastructure, viewing is a feature.** The trail is
written by a kernel interceptor even if the audit *viewer* module is disabled —
which is what you want from a compliance trail. Failed requests record **why**
they failed (`code`, `message`, `status`) in the same metadata, so the detail
dialog answers "what went wrong" instead of only "something did".

**Postgres schemas are per bounded context** (`auth`, `rbac`, `audit`). Dropping
a module means dropping its schema, and no module can reach into another's
tables by accident.

---

## Data and pagination

Every list endpoint uses **keyset pagination** on `(created_at, id)`:

```
GET /api/users?limit=25&cursor=<opaque>
→ { items, total, nextCursor, hasMore }
```

`OFFSET` degrades as tables grow and skips rows under concurrent writes.
`hasMore` comes from fetching `limit + 1` rows, so the page itself needs no
`COUNT(*)`.

`total` is a second, cheap query over the same filters — it exists so the admin
tables can show "page 3 of 12" and a rows-per-page control. It is the one thing
keyset paging cannot derive from its own scan.

### Why the admin paginator has no "jump to page"

The API pages by cursor, so it can only serve the next page and (via the
cursors already held) the previous one. The admin UI keeps the cursors it has
visited, which is what makes **first / previous / next** and real page numbers
work.

Jumping straight to page 7 of an unvisited range would require `OFFSET` — the
exact thing this design avoids. If your admin genuinely needs random page
access, add an offset mode to the list endpoints; the cost is that rows can be
skipped when data changes mid-navigation.

---

## Authentication

- **Access token** — short-lived JWT (15 min), held in memory in the browser.
  Verified without a database round trip.
- **Refresh token** — opaque 256-bit random value, stored **hashed** in
  Postgres, delivered in an `httpOnly` cookie scoped to `/api/auth`, and
  **rotated on every use**.
- **Google sign-in** — the callback redirects with a single-use code (TTL 120 s,
  in Redis) rather than tokens, because tokens in a URL end up in history, logs
  and referrers.

Sessions are revoked immediately when a user is deleted.

---

## Scripts

| Command                              | Purpose                                     |
| ------------------------------------ | ------------------------------------------- |
| `pnpm dev`                           | Watch all packages                          |
| `pnpm build`                         | Build all packages                          |
| `pnpm typecheck`                     | Typecheck everything                        |
| `pnpm test`                          | Unit tests                                  |
| `pnpm boundaries`                    | Enforce module isolation                    |
| `pnpm db:generate`                   | Generate SQL from the Drizzle schemas (core + one folder per module) |
| `pnpm db:migrate`                    | Apply core and module migrations (the API also does this on boot) |
| `pnpm docker:dev` / `pnpm docker:prod` | Compose shortcuts                         |
| `node scripts/smoke-restore.mjs`     | Proves replace/merge restore against a running stack |
| `node scripts/smoke-security.mjs`    | Proves auth, headers and the production dev-login refusal against a running API |

---

## Production notes

```bash
cp .env.example .env      # then set real secrets and POSTGRES_PASSWORD
docker compose -f docker/docker-compose.prod.yml up --build -d
# scale the stateless API:
docker compose -f docker/docker-compose.prod.yml up --scale api=3
```

Before going live:

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — `openssl rand -base64 48`.
- [ ] `AUTH_DEV_LOGIN=false` (it is ignored in production regardless).
- [ ] `WEB_ORIGIN` and the Google OAuth redirect URI set to your real domain.
- [ ] `SMTP_URL` set, or password resets are only written to the log.
- [ ] `S3_ENDPOINT` (in-cluster) **and** `S3_PUBLIC_ENDPOINT` (browser-reachable)
      both set. Presigned URLs are signed against the public one; getting this
      wrong makes every upload fail in the browser and nowhere else.
- [ ] `API_PUBLIC_URL` set to the browser-reachable API origin, and
      `API_INTERNAL_URL` to the in-cluster one. Both are read at container
      start, so the published image is configured, not rebuilt.
- [ ] Copy backups off the object bucket. A backup on the disk that failed is
      not a backup.
- [ ] Terminate TLS in front of `web` and `api` (Caddy, Traefik, an ALB).
- [ ] Back up Postgres, and decide the audit-log retention job.
- [ ] Grant the application role `SELECT, INSERT` only on `audit.audit_logs` —
      the trail is append-only by intent, so make it append-only by grant.

### Configuring the published images

The images are environment-agnostic: every setting is read from the environment
at container start, so one tag runs in staging and production unchanged.

| Variable | Read by | Why it is not a build argument |
|---|---|---|
| `API_PUBLIC_URL` | the Next server, per request | injected into the page for the browser; `NEXT_PUBLIC_*` would freeze it at build time |
| `API_INTERNAL_URL` | the Next server | server-side fetches use the in-cluster service name, which the browser cannot resolve |
| `PORT` | both images | the default is baked in; the environment overrides it |
| everything else | the API | validated once at boot by `packages/core/src/config/env.ts` |

`NEXT_PUBLIC_API_URL` still exists, but only as the fallback for a container
started with no configuration at all. It is never what decides where a deployed
browser sends its requests.

```bash
docker run -p 3001:3001 \
  -e API_PUBLIC_URL=https://api.example.com \
  -e API_INTERNAL_URL=http://api:3000 \
  ghcr.io/<owner>/<repo>-web:latest
```

### Continuous delivery

`.github/workflows/release.yml` is the pipeline whose output is the images:

- `ci.yml` runs first (`workflow_call`), so a red build never produces an image;
- the published image carries a **provenance attestation** and an **SBOM**, so a
  consumer can verify how it was built and what is inside it;
- both images are built for `linux/amd64` **and** `linux/arm64`, pushed to GHCR
  as `<repo>-api` and `<repo>-web`;
- tags: `edge` on `main`, plus an immutable `sha-<short>` on every build. A
  `v1.2.3` tag also produces `1.2.3`, `1.2` and `latest`;
- the API origin is **not** a build argument: the web image reads
  `API_PUBLIC_URL` at container start and injects it into the page, so the
  published tag is configured rather than rebuilt (see above).

```bash
docker pull ghcr.io/<owner>/<repo>-api:edge
```

`:edge` moves on every push to `main`; a deployment should pin the immutable
`sha-<short>` tag instead. [`docs/DEPLOY-DOKPLOY.md`](docs/DEPLOY-DOKPLOY.md)
walks through running those images as separate services.

### Deliberate ceilings

Each is marked `ponytail:` at the point of the trade-off, with its upgrade path:

- the event bus is in-process, so listeners must run in the same replica;
- rate limiting fails open when Redis is unreachable;
- permissions resolve per request rather than from a cache — a cached permission
  set keeps a revoked role effective until the TTL expires, which is a security
  bug, not a performance win;
- `lint` is `tsc --noEmit` everywhere. ESLint is not wired up because
  `typescript-eslint` cannot parse TypeScript 7 yet; `eslint-config-next` pulls
  it in even for the React-only preset. Re-add an `eslint.config.mjs` once it
  supports TS 7 — the trade-off is a note here, not a silently broken script;
- `ObjectStore.get()` buffers an object in memory, so restoring multi-gigabyte
  files would need streaming (`@aws-sdk/lib-storage`);
- backups are assembled in a temp directory and uploaded as one buffer — move to
  streaming tar when archives outgrow memory;
- without `SMTP_URL`, mail is written to the API log. Deliberate locally (reset
  codes are readable there) and never how production should run;
- both images install pnpm with `corepack enable`. Node 25 removed corepack
  from the base image, so that line fails the build there — replacing it with a
  direct pnpm install is the migration, and Dependabot is configured not to
  propose the major on its own.

---

## The gates a change has to pass

```
ci.yml        boundaries → typecheck → test → build → migrations → container smoke
security.yml  CodeQL (SAST) → dependency audit + review → gitleaks → hadolint + actionlint → trivy
release.yml   ci.yml → buildx (amd64 + arm64) → push → scan → SBOM + provenance
```

| Gate | Catches | Where |
|---|---|---|
| `boundaries` | a module reaching into another module's internals | `scripts/check-module-boundaries.mjs` |
| route exposure | a route that lost its `@Public()`/`@RequirePermissions` decision | `route-exposure.test.ts` |
| token + password tests | a weakened signature check or a hash that fails open | `token.service.test.ts`, `password.test.ts` |
| container smoke | a guard that is registered but never wired in; dev sign-in surviving into production | `scripts/smoke-security.mjs` |
| CodeQL | a value flowing from user input to a dangerous sink | `.github/workflows/security.yml` |
| `pnpm audit --prod` | an advisory in a package that ships inside the image | `.github/workflows/security.yml` |
| dependency review | a vulnerable or licence-incompatible dependency entering a PR | `.github/workflows/security.yml` |
| gitleaks | a credential in the tree or in history | `.github/workflows/security.yml` |
| hadolint / actionlint | a Dockerfile that runs as root, an unpinned action | `.github/workflows/security.yml` |
| trivy | a CVE in the OS packages or language dependencies inside the built image | `.github/workflows/security.yml` |
| SARIF threshold | a high or critical finding reaching a green build | `scripts/check-sarif.mjs` |

Dev-only advisories are reported but do not fail the build: they do not ship, and
an advisory with no patched release would otherwise pin the gate red forever.
Dependabot groups security updates into their own PRs so they are not queued
behind routine version bumps.

**Two gates need Advanced Security.** CodeQL's SARIF upload and
`dependency-review-action` are both Advanced Security features, which a private
repository only has on a paid plan. Without it the first fails on upload and the
second refuses to run at all, so both are gated on the `CODE_SCANNING_ENABLED`
repository variable.

Neither gate is decorative when it is switched off:

- CodeQL still runs the analysis (`upload:false`) and `check-sarif.mjs` fails the
  build on anything at or above CVSS 7; the report is attached as an artifact
  instead of reaching the Security tab.
- the advisory half of dependency review is covered by `pnpm audit --prod`, which
  runs everywhere and fails on a high or critical advisory in a package that
  actually ships. What is lost without Advanced Security is the licence check
  and the in-PR summary.

Set `CODE_SCANNING_ENABLED=true` once Advanced Security is on and both return to
their full behaviour.

**Why npm is removed from the runtime images.** The `node` base image bundles
npm, and npm bundles its own dependency tree — pacote, sigstore,
brace-expansion, ip-address, picomatch. Those copies are invisible to
`pnpm audit` and `dependency-review`, cannot be patched without waiting for a new
base image, and are unreachable by our code, because neither image shells out to
npm: both start `node` directly. They were the only trivy findings in the API
image. Deleting them makes the finding disappear because the package does, which
is more honest than an allowlist entry. `corepack` stays, so `pnpm` is still
available inside a container.

## What this template does not do

- **No event sourcing, no CQRS, no microservices.** A modular monolith is the
  right default; the module contract lets you extract a service later if you
  ever actually need one.
- **No plugin runtime.** Modules are folders and a list.
- **No `OFFSET` pagination.** See above.
