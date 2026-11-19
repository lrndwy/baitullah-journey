# Public Elegant Calm Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all Baitullah Journey public pages into a calm Split sacred depth system — shared primitives first, then home and every public route — without changing product scope or admin UI.

**Architecture:** Extend the existing `apps/web/src/components/landing/*` layer with `SplitHero`, a quieter `PageHero`, and section chrome (`QuietSection` / spacing / motion). Re-skin home sections and public route pages onto those primitives. Keep shadcn for interactive controls; keep `TextLink` for plain links; keep emerald/gold tokens.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4 + brand CSS variables, shadcn UI, Vitest (logic-only tests; no RTL in this package).

**Spec:** `docs/superpowers/specs/2026-11-07-public-elegant-calm-redesign-design.md`

## Global Constraints

- Visual direction is **C Split sacred depth**; implementation order is **1 visual system first**, then pages.
- Redesign **all public** routes: `/`, `/katalog`, `/katalog/[slug]`, `/pemesanan`, `/galeri`, `/galeri/[slug]`, `/panduan`, `/panduan/[slug]`, `/profil`.
- Do **not** redesign login or admin shell.
- No new features, routes, CMS fields, or palette swap (emerald `#004533` / gold family stay).
- Home section order is **mandatory live order**: `Hero → TrustStrip → WhyUs → Packages → Departures → Testimonials → Faq → FinalCta`.
- First viewport / `SplitHero` may only contain: eyebrow, brand/title, one sentence, CTA group, visual pane — **no** `HERO.trustSeals` cards/pills/chips.
- Seal meaning (PIHK & PPIU, Direct Flight, Mutawwif Bersanad) must reappear as **quiet text** in `TrustStrip` and/or `WhyUs`, not deleted.
- Text links stay `TextLink` / `brandLink` — never Button chrome for inline links.
- Cards only when they hold interaction or listing navigation; prefer soft panels elsewhere.
- Ship 2–3 intentional motions (hero enter, section reveal, CTA hover) — no continuous noise.
- Prefer layout/presentation changes; reuse `landing-content.ts` copy unless a heading must shrink for hierarchy.
- Do **not** git commit unless the human partner explicitly asks (session rule).
- Verification for UI tasks: `pnpm --filter @app/web typecheck` plus the task’s Vitest file when one exists; visual check listed routes in browser when available.

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/src/app/globals.css` | Spacing rhythm utilities, soft surfaces, optional motion keyframes; no second palette |
| `apps/web/src/components/landing/brand.ts` | Existing `brandBtn` / `brandLink` / `brandField`; add motion/hover helpers if needed |
| `apps/web/src/components/landing/quiet-section.tsx` | Create: calm section wrapper + optional hairline gold separator |
| `apps/web/src/components/landing/split-hero.tsx` | Create: two-column first-viewport hero primitive |
| `apps/web/src/components/landing/public-shell.tsx` | Keep `PublicShell`; rewrite `PageHero` to match split language (compressed) |
| `apps/web/src/components/landing/hero.tsx` | Home hero = `SplitHero` + HERO copy; no seals |
| `apps/web/src/components/landing/trust-strip.tsx` | License + optional quiet seal line(s) |
| `apps/web/src/components/landing/seal-copy.ts` | Create: pure helper mapping `HERO.trustSeals` → display strings |
| `apps/web/src/components/landing/why-us.tsx` | Calm layout; may absorb remaining seal meaning |
| `apps/web/src/components/landing/{packages,departures,testimonials,faq,final-cta}.tsx` | Quiet section chrome; thinner card chrome |
| `apps/web/src/components/landing/{site-header,site-footer}.tsx` | Shared calm nav/footer polish |
| `apps/web/src/app/page.tsx` | Keep section order; only wiring if props change |
| `apps/web/src/app/{katalog,pemesanan,galeri,panduan,profil}/**` | Apply `PageHero` + quieter lists/details |
| `apps/web/src/components/landing/seal-copy.test.ts` | Vitest for seal string helper |
| `apps/web/src/components/landing/split-hero-budget.test.ts` | Vitest asserting seal labels are not part of hero budget helper / exported hero content contract |

## Review Focus

1. Narrow mobile viewport — SplitHero visual pane stays substantial (not a tiny thumbnail); stack order readable.
2. Missing CMS/hero image — gradient/atmosphere pane still looks intentional (no broken `<img>`).
3. Empty packages / testimonials / galleries — empty states stay calm dashed panels, not error chrome.
4. Keyboard focus on CTAs and `TextLink` — visible focus, links still not boxed like buttons.
5. Seal copy still present somewhere below the fold when hero no longer shows cards — visitor can still see izin / direct / mutawwif meaning.

---

### Task 1: Tokens, QuietSection, motion helpers

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/landing/brand.ts` (only if adding named motion/hover class strings)
- Create: `apps/web/src/components/landing/quiet-section.tsx`
- Modify: `apps/web/src/components/landing/primitives.tsx` only if `Section` / `SectionHeading` need denser/airier defaults aligned with QuietSection (prefer QuietSection as the new default for redesigned sections)

**Interfaces:**
- Consumes: existing CSS vars `--brand-emerald`, `--brand-gold-*`, `--brand-surface`, `--brand-blue-mist`
- Produces:
  - `QuietSection({ id?: string, className?: string, tone?: 'plain' | 'mist' | 'white', children: ReactNode })`
  - Optional utility classes in CSS e.g. `.brand-reveal` / `.brand-hero-enter` (names locked in implementation; plan expects **exactly two named motion classes** plus CTA hover already on `brandBtn`)

- [ ] **Step 1: Add QuietSection**

Export `QuietSection` with generous vertical padding (`py-20 sm:py-28` class of spacing), optional `tone` background, optional top hairline using gold-soft.

- [ ] **Step 2: Add two motion utilities in `globals.css`**

One for hero enter (short fade/slide once), one for section reveal (subtle fade-up). Prefer `prefers-reduced-motion: reduce` to disable transforms.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 2: SplitHero + PageHero primitives

**Files:**
- Create: `apps/web/src/components/landing/split-hero.tsx`
- Modify: `apps/web/src/components/landing/public-shell.tsx` (`PageHero` only; keep `PublicShell` API)
- Create: `apps/web/src/components/landing/split-hero-budget.test.ts`

**Interfaces:**
- Consumes: `brandBtn`, motion class from Task 1, `Button` from shadcn
- Produces:
  ```ts
  type SplitHeroProps = {
    eyebrow: string
    title: string
    description: string
    primaryCta: { href: string; label: string }
    secondaryCta?: { href: string; label: string }
    visual?: ReactNode // default: deep emerald/gold atmosphere pane
  }
  export function SplitHero(props: SplitHeroProps): JSX.Element

  // PageHero signature stays:
  export function PageHero(props: {
    eyebrow?: string
    title: string
    description?: string
  }): JSX.Element
  ```
- `PageHero` must visually rhyme with SplitHero (compressed split or quiet band + thin visual accent) — not the old flat emerald bar alone.

- [ ] **Step 1: Write failing budget test**

In `split-hero-budget.test.ts`, assert a small exported constant or helper documents the hero budget:

```ts
import { describe, expect, it } from 'vitest'
import { SPLIT_HERO_ALLOWED_SLOTS } from './split-hero'

describe('SplitHero budget', () => {
  it('allows only eyebrow, title, description, ctas, visual', () => {
    expect(SPLIT_HERO_ALLOWED_SLOTS).toEqual([
      'eyebrow',
      'title',
      'description',
      'primaryCta',
      'secondaryCta',
      'visual',
    ])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL** (module/export missing)

Run: `pnpm --filter @app/web exec vitest run src/components/landing/split-hero-budget.test.ts`

- [ ] **Step 3: Implement `SplitHero` + export `SPLIT_HERO_ALLOWED_SLOTS`**

Two-column layout on `lg+`; stacked on mobile with visual still large. No props for seals/stats. Default visual = deep gradient pane with optional thin gold frame accent (CSS only).

- [ ] **Step 4: Rewrite `PageHero`** to the same language (shorter).

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm --filter @app/web exec vitest run src/components/landing/split-hero-budget.test.ts`  
Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 3: Seal copy helper + TrustStrip / WhyUs / Hero wiring

**Files:**
- Create: `apps/web/src/components/landing/seal-copy.ts`
- Create: `apps/web/src/components/landing/seal-copy.test.ts`
- Modify: `apps/web/src/components/landing/hero.tsx`
- Modify: `apps/web/src/components/landing/trust-strip.tsx`
- Modify: `apps/web/src/components/landing/why-us.tsx`
- Modify: `apps/web/src/app/page.tsx` only if TrustStrip needs seals prop (prefer importing `HERO.trustSeals` inside TrustStrip/WhyUs to avoid page churn)

**Interfaces:**
- Consumes: `HERO` from `@/lib/landing-content`, `SplitHero` from Task 2
- Produces:
  ```ts
  export type SealLine = { label: string; sub: string }
  export function sealLinesFromHero(
    seals?: ReadonlyArray<{ label: string; sub: string }>,
  ): SealLine[]
  // default: HERO.trustSeals; normalize whitespace in `sub` (join newlines with space)
  ```

- [ ] **Step 1: Write failing tests for `sealLinesFromHero`**

```ts
it('maps the three HERO seals preserving label and flattening sub newlines', () => {
  const lines = sealLinesFromHero([
    { label: 'PIHK & PPIU', sub: 'Resmi Berizin Kemenag' },
    { label: 'Direct Flight', sub: 'Garuda & Saudia\nLangsung' },
    { label: 'Mutawwif Bersanad', sub: 'Alumni Madinah & Kairo' },
  ])
  expect(lines).toEqual([
    { label: 'PIHK & PPIU', sub: 'Resmi Berizin Kemenag' },
    { label: 'Direct Flight', sub: 'Garuda & Saudia Langsung' },
    { label: 'Mutawwif Bersanad', sub: 'Alumni Madinah & Kairo' },
  ])
})

it('returns empty array for empty input', () => {
  expect(sealLinesFromHero([])).toEqual([])
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm --filter @app/web exec vitest run src/components/landing/seal-copy.test.ts`

- [ ] **Step 3: Implement helper; rewrite Hero to SplitHero without seals**

Hero uses `HERO.overlineAccent.text`, heading (newlines → space), description, CTAs `/katalog` + `/pemesanan`. **No** Card seal grid.

- [ ] **Step 4: Put seal meaning into TrustStrip and/or WhyUs as quiet text**

No card chrome for seals. Prefer TrustStrip secondary row of three short phrases separated by hairlines; if too crowded, put one line in TrustStrip (license) and three calm lines under WhyUs heading. Meaning of all three seals must remain visible on the home page below the hero.

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm --filter @app/web exec vitest run src/components/landing/seal-copy.test.ts src/components/landing/split-hero-budget.test.ts`  
Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 4: Home sections calm pass

**Files:**
- Modify: `apps/web/src/components/landing/packages.tsx`
- Modify: `apps/web/src/components/landing/departures.tsx`
- Modify: `apps/web/src/components/landing/testimonials.tsx`
- Modify: `apps/web/src/components/landing/faq.tsx`
- Modify: `apps/web/src/components/landing/final-cta.tsx`
- Modify: `apps/web/src/components/landing/why-us.tsx` (finish calm chrome if not done in Task 3)
- Do **not** reorder sections in `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: `QuietSection` (Task 1), existing data props unchanged
- Produces: same exported component names/props; calmer visuals

- [ ] **Step 1: Wrap/restyle each home section** with QuietSection (or equivalent padding/tone), restrained headings, softer list chrome.

- [ ] **Step 2: Apply section-reveal motion class** to section roots (one consistent pattern).

- [ ] **Step 3: Verify order unchanged**

Confirm `page.tsx` still renders: Hero, TrustStrip, WhyUs, Packages, Departures, Testimonials, Faq, FinalCta in that order.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 5: Header + footer shared calm

**Files:**
- Modify: `apps/web/src/components/landing/site-header.tsx`
- Modify: `apps/web/src/components/landing/site-footer.tsx`

**Interfaces:**
- Consumes: existing props; `TextLink`; `brandBtn` for Pemesanan CTA only
- Produces: same prop APIs; quieter sticky header / footer spacing and separators

- [ ] **Step 1: Soften header** — keep utility bar + nav; reduce visual noise; nav stays TextLink; primary CTA stays Button.

- [ ] **Step 2: Soften footer** — same content; more air; hairline gold separators; TextLink only for links.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 6: Katalog + Pemesanan

**Files:**
- Modify: `apps/web/src/app/katalog/page.tsx`
- Modify: `apps/web/src/app/katalog/[slug]/page.tsx`
- Modify: `apps/web/src/app/pemesanan/page.tsx`
- Modify: `apps/web/src/components/landing/katalog-filters.tsx` only if filter chrome needs calming (controls stay shadcn)

**Interfaces:**
- Consumes: updated `PageHero`; `QuietSection` / brand containers
- Produces: same routes and form behavior; inquiry form remains functional

- [ ] **Step 1: Apply PageHero + quieter list/detail shells on katalog pages**

Package cards may keep Card if they are the click/navigation container; reduce shadow/ring weight.

- [ ] **Step 2: Apply PageHero + calm shell on pemesanan**; do not change InquiryForm field logic.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 7: Galeri + Panduan + Profil

**Files:**
- Modify: `apps/web/src/app/galeri/page.tsx`
- Modify: `apps/web/src/app/galeri/[slug]/page.tsx`
- Modify: `apps/web/src/app/panduan/page.tsx`
- Modify: `apps/web/src/app/panduan/[slug]/page.tsx`
- Modify: `apps/web/src/app/profil/page.tsx`

**Interfaces:**
- Consumes: `PageHero`, QuietSection patterns from earlier tasks
- Produces: same data fetching; calmer presentation; empty states unchanged in meaning

- [ ] **Step 1: Restyle list + detail pages** to match the house language.

- [ ] **Step 2: Profil** — calm long-form / contact layout; no dashboard look.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

---

### Task 8: End-to-end visual verification

**Files:** none required (checklist only); fix regressions in the owning task’s files if found

- [ ] **Step 1: Run full web checks**

Run: `pnpm --filter @app/web test`  
Run: `pnpm --filter @app/web typecheck`  
Expected: PASS

- [ ] **Step 2: Manual route pass (desktop + one mobile width)**

Visit and confirm Split/Page language + no hero seals + seals below hero on home:

- `/`
- `/katalog` and one `/katalog/[slug]` if data exists
- `/pemesanan`
- `/galeri` (+ detail if data)
- `/panduan` (+ detail if data)
- `/profil`

- [ ] **Step 3: Confirm Review Focus items**

Mobile visual pane size; gradient fallback; empty states; focus/links; seal meaning below hero.

---

## Self-review notes

- Spec coverage: shared system (T1–T2), seals decision (T3), home order (T3–T4), all public pages (T6–T7), header/footer (T5), motion (T1/T4), admin untouched.
- No commit steps — session forbids unsolicited commits.
- Tests stay Vitest-logic-only; visual QA is Task 8.
