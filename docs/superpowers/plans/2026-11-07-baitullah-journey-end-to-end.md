# Baitullah Journey End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Baitullah Journey product: dynamic public catalogue/content, inquiry leads with quota-on-confirm, admin + Content Manager CMS, env bootstrap admin, and cleaned consistent public UI — per the approved design.

**Architecture:** Three new Nest modules (`packages`, `content`, `inquiries`) registered in `modules/index.ts`; public unauthenticated read/create endpoints; admin CRUD behind RBAC; Next.js public routes + admin shell pages; home editorial blocks stay in code but are polished.

**Tech Stack:** NestJS, Drizzle/Postgres, Zod contracts in `@app/contracts`, Next.js App Router, existing auth/RBAC/settings/storage.

**Spec:** `docs/superpowers/specs/2026-11-07-baitullah-journey-end-to-end-design.md`

## Global Constraints

- Follow module contract: folder + manifest + one line in `apps/api/src/modules/index.ts`.
- No automated email/WhatsApp notifications.
- Quota changes only on inquiry status transitions into/out of `dikonfirmasi` as specified.
- Home hero/komitmen/FAQ stay code-backed; polish only.
- No full brand redesign; reuse landing visual language.
- Indonesian UI copy for public + domain admin.
- Do not commit unless the user explicitly asks (session rule).

## Review Focus

1. Concurrent confirm of two inquiries that together exceed quota — second must fail; first succeeds.
2. Reject after confirm restores quota and reopens `full` → `open` when seats remain.
3. Content Manager cannot hit users/roles/backup/audit routes (403).
4. Public catalogue never returns `draft`/`archived` packages or unpublished content.
5. Bootstrap admin does not overwrite an existing user's password on restart.

---

### Task 1: Contracts + env bootstrap keys

**Files:**
- Create: `packages/contracts/src/packages.ts`, `content.ts`, `inquiries.ts`, `public-site.ts`
- Modify: `packages/contracts/src/index.ts`, `packages/contracts/src/settings.ts`, `packages/core/src/config/env.ts`, `packages/core/src/config/env.test.ts`, `.env.example`

**Produces:** Zod schemas + TS types for packages/content/inquiries/public DTOs; `BOOTSTRAP_ADMIN_EMAIL|PASSWORD|NAME` optional env; extended `SiteSettings` contact fields (`tagline`, `whatsapp`, `phone`, `email`, `address`, `license`, `aboutHtml` as agreed builder fields — keep names stable).

- [x] Add contract modules and export them
- [x] Extend settings update/read schemas for contact/profil fields
- [x] Add bootstrap env vars (optional strings)
- [x] Verify: `pnpm --filter @app/contracts typecheck` and `pnpm --filter @app/core test` (env tests)

### Task 2: `packages` module (API)

**Files:**
- Create: `apps/api/src/modules/packages/**` (schema, manifest, module, services, controllers, migrations, tests)
- Modify: `apps/api/src/modules/index.ts`

**Produces:** Tables per design (§9.1) with `base_price`, `currency`, `price_override`. Admin CRUD + public GETs for categories/packages/departures/itineraries/facilities/accommodations. Permissions `packages.read|write`. Nav entries under Admin.

- [x] Schema + `pnpm --filter @app/api db:generate`
- [x] Admin + public controllers/services
- [x] Tests for published-only public listing
- [x] Register module in `index.ts`

### Task 3: `content` module (API)

**Files:**
- Create: `apps/api/src/modules/content/**`
- Modify: `apps/api/src/modules/index.ts`

**Produces:** articles, galleries (+ slug), gallery_images, testimonials. Admin CRUD + public GETs. Permissions `content.read|write`.

- [x] Schema + migrations
- [x] Admin + public APIs
- [x] Published-only public tests
- [x] Register module

### Task 4: `inquiries` module + quota logic

**Files:**
- Create: `apps/api/src/modules/inquiries/**`
- Modify: `apps/api/src/modules/index.ts`

**Produces:** `inquiries` table; `POST /api/public/inquiries`; admin list/get/status patch; transition matrix + quota rules from design; permissions `inquiries.read|write`.

- [x] Schema + migrations
- [x] Service with transactional status/quota updates
- [x] Tests: confirm decrements by pax; reject restores; insufficient quota fails; illegal transitions fail; concurrent overbook fails
- [x] Register module

### Task 5: Bootstrap admin + `content_manager` system role

**Files:**
- Modify: `apps/api/src/modules/rbac/rbac.service.ts` (`ensureSystemRoles`), auth bootstrap service/hook, settings schema/service/controller for new fields

**Produces:** System role `content_manager` with domain permissions only (packages/content/inquiries/settings.read|write as designed — not users/rbac/backup/audit). On boot, create admin user from env if missing. Settings stores contact fields.

- [x] Extend `ensureSystemRoles` for `content_manager` grants
- [x] BootstrapAdminService onApplicationBootstrap
- [x] Settings columns + migration + API
- [x] Tests: bootstrap create-once; content_manager grant set

### Task 6: Admin UI — domain pages

**Files:**
- Create: `apps/web/src/app/(shell)/admin/{categories,packages,departures,facilities,accommodations,articles,galleries,testimonials,inquiries}/**`
- Modify: admin dashboard `page.tsx` for summary counts

**Produces:** Working CRUD UIs following existing admin patterns (`PageHeader`, `apiFetch`, permission gates).

- [x] Packages/categories/departures/itineraries/facilities/accommodations pages
- [x] Content pages
- [x] Inquiries review + status actions
- [x] Smoke: pages load with mock/API when logged in as admin

### Task 7: Public site routes + inquiry form

**Files:**
- Create: `apps/web/src/app/{katalog,galeri,panduan,profil,pemesanan}/**`
- Modify: `apps/web/src/app/page.tsx`, landing components, `landing-content.ts` (shrink to editorial + helpers)

**Produces:** Full public routes wired to public APIs; `/pemesanan` form; home uses API for packages/departures/testimonials/settings.

- [x] Fetch helpers for public API
- [x] Katalog list + detail
- [x] Galeri, panduan, profil
- [x] Pemesanan form + thank-you
- [x] Home dynamic sections

### Task 8: UI consistency polish + seed data

**Files:**
- Modify: `apps/web/src/components/landing/**`, `globals.css` as needed
- Create: seed script or migration seed under packages module

**Produces:** Cleaner shared primitives; demo seed for local/docker so catalogue is non-empty.

- [x] Polish landing primitives (less noise, consistent spacing/type)
- [x] Seed 3 categories, 3 packages, departures, itineraries, 2 articles, 1 gallery, 2 testimonials
- [x] Document seed/bootstrap in README briefly if needed

### Task 9: End-to-end verification

**Files:** none (commands only)

- [x] `pnpm typecheck` (or per-package)
- [x] `pnpm --filter @app/api test` (quota + published filters + bootstrap)
- [x] `pnpm boundaries`
- [x] Rebuild/restart docker or `pnpm dev` path; hit `/`, `/katalog`, `/pemesanan`, `/admin`, health
- [x] Manual checklist against design success criteria

---

## Execution notes

- Preferred: parallel agents for Tasks 2–3 after Task 1; Task 4 after Task 2 schema exists; Tasks 6–7 after APIs land.
- User requested parallel execution through completion with verification.
