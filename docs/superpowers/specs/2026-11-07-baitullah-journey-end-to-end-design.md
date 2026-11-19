# Baitullah Journey — End-to-End Product Design

**Date:** 2026-11-07  
**Status:** Approved 2026-11-07  
**Stack:** Existing monorepo (Next.js web, NestJS API, Postgres, Redis, pnpm/Turborepo)

## 1. Intent and why

Baitullah Journey must work as a real product, not a static marketing shell: public visitors browse published travel information and submit interest forms; internal staff manage catalogue and content in admin; admins follow up leads manually by email or WhatsApp.

Today the landing is largely hard-coded in `apps/web/src/lib/landing-content.ts`, public routes beyond home are incomplete, and admin only covers the template modules (users, roles, settings, files, backups, audit) — not Haji/Umroh domain data. Docs (`docs/PRD.md`, `docs/MVP.md`, `docs/SCHEMA.md`) already describe the CMS; this design brings that to life and **adds inquiry/lead booking**, which those docs had deferred.

## 2. Goals

1. Public site end-to-end: home, katalog, detail paket (fasilitas, akomodasi, jadwal, itinerary), galeri, panduan (artikel), profil, and pemesanan form.
2. Catalogue, articles, galleries, testimonials, departures, inquiries, and contact/brand settings come from the API (or settings). Editorial marketing blocks on the home page (hero copy, komitmen/why-us, FAQ, and similar) may remain in code for this release but must be cleaned for consistency — not a second CMS.
3. Admin CRUD for domain data, with **Administrator** and **Content Manager** roles.
4. Bootstrap a default Administrator from environment variables.
5. Inquiry form → stored lead → admin review/status → manual contact; **no** automated email/WhatsApp notifications.
6. Quota decreases only when a lead is set to **dikonfirmasi**, by **jumlah jamaah**; reversing to **ditolak** restores quota.
7. Visual work: keep the existing brand language; make components more consistent, cleaner, and less “AI slop” — no full redesign.

## 3. Non-goals

- Payment, invoice, refund, or online checkout.
- Automated notifications (email, WhatsApp API, SMS).
- Passport/visa document workflows or field operations.
- Multi-branch, multi-tenant, or multi-language.
- Full brand redesign or new visual direction.
- CMS for home editorial blocks (hero, komitmen, FAQ, etc.) — polish in code only this release.
- Replacing the template’s auth/RBAC/storage/settings kernels.

## 4. Anti-goals

- Shipping another static marketing page that still needs code edits for content.
- Auto-decrementing quota on form submit (over-promises seats).
- Mega-module that dumps all domain tables into one Nest module and bypasses the module contract.
- Decorative UI clutter (pill clusters, fake stats, generic AI gradients) on new pages.

## 5. Constraints

- Follow existing module contract: folder + manifest + one line in `apps/api/src/modules/index.ts`.
- Reuse existing auth, RBAC permissions, admin shell (`apps/web/src/app/(shell)/admin`), settings, and storage upload patterns.
- Public reads are unauthenticated; writes for catalogue/content/inquiries admin paths require auth + permissions.
- Server-side authorization on every protected operation.
- Design: extend current landing tokens/components; polish for consistency and cleanliness.
- Prefer Indonesian UI copy for public and admin domain screens.

## 6. Approaches considered

| Approach | Summary | Tradeoff |
| -------- | ------- | -------- |
| **A — Domain modules (chosen)** | Separate Nest modules: `packages`, `content`, `inquiries`; public Next routes; admin CRUD in existing shell; bootstrap admin from env; polish UI in place | More modules up front; matches template and RBAC |
| B — One `journey` mega-module | All domain tables in one module | Faster first merge; weak boundaries vs module contract |
| C — JSON/settings-only CMS | Store catalogue as blobs | Too weak for relations, quota, Content Manager |

**Decision:** Approach A.

## 7. Actors and permissions

### 7.1 Pengunjung

No login. Can view published content and submit inquiries.

### 7.2 Administrator

Full access: users, roles, settings, storage, backup, audit, and all domain modules including inquiry status changes that affect quota.

### 7.3 Content Manager

May manage: categories, packages, departures, itineraries, facilities, accommodations, articles, galleries, testimonials, and inquiry review (including status changes that affect quota).

May **not** manage: users, roles, security-sensitive settings, backups, or audit.

**Builder call:** Map each capability to concrete permission keys in module manifests (e.g. `packages.read`, `packages.write`, `inquiries.write`) and seed a `content_manager` role with that grant set. Keep `administrator` as the existing full-access role (or equivalent).

## 8. Bootstrap admin (env)

New env vars (names exact):

- `BOOTSTRAP_ADMIN_EMAIL` (required to enable bootstrap)
- `BOOTSTRAP_ADMIN_PASSWORD` (required when email set)
- `BOOTSTRAP_ADMIN_NAME` (optional; default `Administrator`)

**Behaviour:** On API startup, if email/password are set and no user with that email exists, create an active Administrator with a hashed password. If the user already exists, **do not** overwrite password or roles. Missing vars → skip bootstrap (dev may still use existing auth paths). Document in `.env.example`.

**Builder call:** Prefer a dedicated bootstrap hook in auth/users startup rather than a one-off script only, so Docker and local share the same path.

## 9. Domain modules and data

Align with `docs/SCHEMA.md`, with the additions below.

### 9.1 Module `packages`

Owns: `categories`, `packages`, `departures`, `itineraries`, `facilities`, `package_facilities`, `accommodations`, `package_accommodations`.

**Additions vs SCHEMA:**

- `packages.base_price` — integer (IDR minor units or whole rupiah; **builder call:** store whole rupiah as `integer`, consistent with landing `formatRupiah`).
- `packages.currency` — default `IDR`.
- `departures.price_override` — nullable integer; when set, public price for that departure uses override; else package `base_price`.

**Publication:** packages and departures have status enums. Public APIs return only publishable rows.

**Builder call — status enums:**

- Package: `draft` | `published` | `archived`
- Departure: `open` | `full` | `closed` | `cancelled`
- When `available_quota` hits 0 on confirm, set departure to `full` if it was `open`.

### 9.2 Module `content`

Owns: `articles`, `galleries`, `gallery_images`, `testimonials`.

- Articles power **/panduan** (list + detail by slug).
- Galleries power **/galeri**.
- Testimonials feed home + optional section on profil/home.
- Profil page: company copy and contact from **settings** (extend settings keys), not a separate CMS entity unless needed.

**Builder call:** Article statuses `draft` | `published` | `archived`; galleries/testimonials use `is_published` as in SCHEMA.

### 9.3 Module `inquiries`

Owns: `inquiries` (new table; not in original SCHEMA).

Suggested columns:

| Column | Notes |
| ------ | ----- |
| `id` | UUID |
| `package_id` | FK packages |
| `departure_id` | FK departures, required |
| `customer_name` | required |
| `email` | required |
| `phone` | required (WhatsApp-capable number expected) |
| `pax_count` | int > 0 |
| `notes` | optional |
| `preferred_contact` | `email` \| `whatsapp` |
| `status` | see workflow |
| `admin_notes` | optional, internal |
| `quota_applied` | bool — whether this inquiry currently holds decremented quota |
| `created_at`, `updated_at` | |

**Status workflow (agreed path):**

`baru` → `dihubungi` → `dikonfirmasi` → `selesai`, plus `ditolak`.

**Allowed transitions (design call after builder-check):**

| From | To |
| ---- | -- |
| `baru` | `dihubungi`, `ditolak` |
| `dihubungi` | `dikonfirmasi`, `ditolak` |
| `dikonfirmasi` | `selesai`, `ditolak` |
| `selesai` | _(terminal)_ |
| `ditolak` | _(terminal)_ |

Skipping `dihubungi` (e.g. `baru` → `dikonfirmasi`) is **not** allowed — keeps a clear “sudah dihubungi” trail. Reopening from `selesai` / `ditolak` is out of scope; admin creates a new inquiry if needed.

**Quota rules (agreed):**

1. Create inquiry: status `baru`; **do not** change `available_quota`.
2. Transition **into** `dikonfirmasi`: if `!quota_applied`, require `available_quota >= pax_count`, then decrement by `pax_count`, set `quota_applied = true`. Fail with a clear error if insufficient. If `available_quota` becomes 0 and departure was `open`, set departure status to `full`.
3. Transition **from** `dikonfirmasi` **to** `ditolak`: if `quota_applied`, restore `pax_count`, set `quota_applied = false`; if departure was `full` and `available_quota > 0` after restore, set departure status back to `open`.
4. Other transitions do not change quota.
5. Leaving `dikonfirmasi` is only allowed to `selesai` or `ditolak`.
6. Use a DB transaction when mutating inquiry status + departure quota.

**Builder call:** Reject new inquiries against departures that are not `open`, or packages not `published`.

## 10. Public website

### 10.1 Routes

| Route | Source |
| ----- | ------ |
| `/` | Dynamic sections (featured packages, departures, testimonials, contact) from API + settings; editorial blocks (hero, komitmen, FAQ, etc.) stay in code but cleaned |
| `/katalog` | Published packages, filter by category |
| `/katalog/[slug]` | Package detail + departures + facilities + accommodations + itinerary per departure |
| `/galeri` | Published galleries |
| `/galeri/[id]` or slug | Gallery detail + images (**builder call:** add `slug` to galleries if missing, else use id) |
| `/panduan` | Published articles |
| `/panduan/[slug]` | Article detail |
| `/profil` | About + contact from settings |
| `/pemesanan` | Inquiry form; query params may preselect `package` / `departure` |

### 10.2 Form pemesanan

Fields: nama, email, telepon/WA, jumlah jamaah, preferred contact, paket, keberangkatan, catatan. Submit → `POST` public inquiries endpoint → thank-you state. No account required.

### 10.3 Visual direction

- Reuse header/footer, typography, color tokens, and motion patterns from current landing.
- Clean up shared primitives for consistency; remove noisy/decorative patterns that read as generic AI UI.
- New pages: one job per section; brand-first where promotional; no card-heavy hero clutter.
- Keep mobile and desktop usable.

**Left to builder:** Exact component refactors file-by-file, as long as public surfaces share one visual system.

## 11. Admin surfaces

Extend `apps/web/src/app/(shell)/admin` with navigation from module manifests:

- Categories, Packages, Departures (nested or linked), Itineraries, Facilities, Accommodations
- Articles, Galleries, Testimonials
- Inquiries (list, detail, status actions, admin notes)
- Existing: users, roles, settings, files, backups, audit (Administrator-only where already gated)

Dashboard home: light summary counts (packages, open departures, new inquiries) — **builder call:** keep minimal; no vanity charts.

## 12. Settings keys (public)

Extend site settings for profil/contact/brand strings currently hard-coded (site name, tagline, WhatsApp, phone, email, address, license text, social links, about body). Landing and profil read these. Content Manager may edit non-security settings; Administrator edits all. Exact key list left to builder from current `BRAND` / profil needs.

## 13. API shape (outline)

- Public `GET` under e.g. `/api/public/...` for published catalogue/content and `POST /api/public/inquiries`.
- Admin CRUD under `/api/packages/...`, `/api/content/...`, `/api/inquiries/...` (exact prefixes follow existing module style).
- List endpoints: pagination consistent with users module patterns.
- Images: reuse storage upload handshake where thumbnails/gallery images are uploaded.

## 14. Migration from static content

1. Introduce modules + migrations.
2. Seed a small demo dataset (or import from current `landing-content.ts` once) so the site is non-empty in development.
3. Switch home sections to fetch API; delete or shrink static fixtures to types/helpers only (`formatRupiah`, etc.).
4. Ship remaining public routes and admin UIs.

**Builder call:** One-time seed script or migration seed is fine; do not require production to re-seed on every boot (unlike bootstrap admin).

## 15. Success criteria

- Visitor can browse published packages and content without login.
- Visitor can submit an inquiry with pax count; admin sees it as `baru`.
- Confirming an inquiry reduces `available_quota` by pax; rejecting after confirm restores it.
- Content Manager can edit domain content but cannot manage users/roles/backups/audit.
- `BOOTSTRAP_ADMIN_*` creates the first admin when absent.
- Public pages no longer depend on hard-coded package/testimonial/catalogue data; home editorial blocks may stay in code if cleaned.
- Visual language is consistent and cleaner across old and new public pages.

## 16. What’s left to the builder

- Exact Drizzle/SQL column types, indexes, and migration file layout per module.
- Exact REST paths, DTO validation, and OpenAPI if any.
- Permission key strings and role seed contents.
- Component-level cleanup on landing primitives.
- Whether galleries use slug or UUID in URLs.
- Minimal admin dashboard widgets.
- Test coverage strategy following repo norms (unit for quota transitions; API tests for public vs admin access).

## 17. Open questions for product owner

None. Home editorial blocks (hero, komitmen/why-us, FAQ, etc.) stay in code and are polished only — agreed 2026-11-07.
