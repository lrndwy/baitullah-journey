# Public site redesign — elegant & calm (Split sacred depth)

**Status:** Approved  
**Date:** 2026-11-07  
**Product:** Baitullah Journey public surfaces (`apps/web` marketing routes)

## Intent

Make every public page feel **elegant and calm**: spacious, typographically clear, premium without visual noise. The first viewport should carry brand and atmosphere with equal weight via a **split composition** (quiet text + deep visual field). Keep the existing emerald/gold brand and CMS-driven content; change the presentation system, not the product scope.

## Goals

- Redesign **all public pages**: home, katalog (+ detail), pemesanan, galeri (+ detail), panduan (+ detail), profil.
- Establish a shared public visual system first, then apply page by page.
- Hero/page headers use **Split sacred depth** where a primary marketing surface needs atmosphere; inner pages use a calmer split/page-header variant that still matches the language.
- Preserve shadcn UI for interactive controls (`Button`, `Input`, `Select`, `Card`, etc.) with brand classNames — text links stay plain (`TextLink`), not button chrome.
- Keep admin/dashboard visuals unchanged.

## Non-goals

- No new features, routes, or CMS fields.
- No booking/payment flows.
- No brand color re-palette (emerald `#004533` / gold family stay).
- No full Figma rebuild as a blocking dependency — inspiration from existing brand tokens is enough.
- No redesign of login/admin shell.

## Anti-goals

- Busy card grids, pill clusters, stat strips in the first viewport.
- Purple/glow/AI-default looks; warm-cream + terracotta newspaper tropes.
- Inset hero images or floating collage in the hero.
- Text links that look like outlined button boxes.

## Constraints

- Stack: Next.js App Router, existing `components/landing/*`, `components/ui/*`, brand CSS variables in `globals.css`.
- Frontend design rules already in the project: one composition in the first viewport, brand-first, full-bleed or dominant visual plane for promotional heroes, cards only when they hold interaction, intentional motion (2–3), mobile + desktop.
- Content continues to come from public API modules (packages, content, inquiries, settings).
- Prefer polish of public surfaces over inventing new marketing copy — reuse `landing-content.ts` strings unless a heading must shrink for hierarchy.

## Approaches considered

### Visual direction (user selected **C**)

| Option | Summary | Tradeoff |
|--------|---------|----------|
| A Editorial full-bleed | Edge-to-edge hero, max drama | Stronger “landing” look; less split brand+atmosphere balance |
| B Quiet gallery | Light, white, photo lower | Very calm; weaker first-viewport brand signal |
| **C Split sacred depth** | Text left / deep visual right | **Chosen** — premium, calm, brand + atmosphere equal |

### Implementation order (user selected **1**)

| Option | Summary | Tradeoff |
|--------|---------|----------|
| **1 Visual system first** | Tokens + primitives, then all routes | **Chosen** — consistent; slight upfront cost |
| 2 Homepage first | Ship home, clone later | Faster demo; drift risk |
| 3 Shell slots only | Pure template architecture | Cleanest structure; more scaffolding before any page looks done |

## Design — shared visual system

Build (or refine) under `apps/web/src/components/landing/`:

1. **Tokens / utilities** — spacing rhythm (more vertical air), type scale for display/body, soft surface colors, hairline gold separators. Extend `brand.ts` / `globals.css` only as needed; do not invent a second palette.
2. **`SplitHero`** — two-column first viewport: quiet copy (eyebrow, brand/title, one sentence, CTA group) + deep visual pane (gradient/atmosphere field with optional thin gold frame accent). Mobile: stack with visual still substantial (not a tiny thumbnail).
3. **`PageHero`** — for inner public routes: same language as SplitHero but shorter; may use a compressed split or a quiet band that still reads as the same system (not the old flat emerald bar alone).
4. **`QuietSection` / section chrome** — one purpose per section, generous padding, restrained headings, fewer bordered cards; lists and soft panels over heavy shadows.
5. **Motion** — 2–3 intentional transitions (e.g. hero fade/slide, section reveal, CTA hover). No continuous noise animations.
6. **Controls** — keep shadcn; CTAs use `brandBtn`; inline links use `TextLink`.

## Design — page application order

After the system exists, apply in this order:

1. Home (`page.tsx` + landing sections — **keep live order**, polish in place):
   `hero → trust → why-us → packages → departures → testimonials → faq → final CTA`
2. Katalog list + package detail
3. Pemesanan (form stays functional; wrap in calm shell)
4. Galeri list + detail
5. Panduan list + detail
6. Profil

Header/footer updated once as part of the shared system so all pages inherit nav calmness.

## Locked content decisions

1. **Home section order is mandatory as the live order above.** Do not reorder sections for this redesign. Credibility (`TrustStrip` + `WhyUs`) stays before commerce (`Packages` / `Departures`). Visual polish only.
2. **`HERO.trustSeals` leave the hero.** SplitHero first viewport is only eyebrow, brand/title, one sentence, CTA group + visual pane — no seal cards, pills, or stat chips overlaid on the hero.
3. **Reuse seal copy calmly below the hero:** fold the three seal labels/subs into `TrustStrip` and/or `WhyUs` as quiet text (hairline separators or short supporting lines — no card chrome). Prefer keeping the meaning (izin, direct flight, mutawwif) over deleting it. Exact placement between TrustStrip vs WhyUs is builder latitude as long as seals are not in the first viewport.

## Builder latitude

- Exact gradient stops, frame inset, and mobile stacking details.
- Whether package/gallery grids keep `Card` with near-invisible chrome vs soft panels.
- Choice of Unsplash-or-gradient-only for the visual pane if no CMS hero image exists yet (no new upload field required for this redesign).
- Which existing landing sections get tighter copy wrapping vs layout-only changes.
- Whether seal copy lands primarily in TrustStrip, WhyUs, or a light split across both (not in hero).

## Success look

A visitor can tell in one viewport that this is Baitullah Journey; removing the nav would not make the first screen look like a generic SaaS template. Inner pages feel like the same house, quieter rooms — not a different product.
