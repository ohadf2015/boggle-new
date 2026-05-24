# Spec — `/es/juego-de-palabras-multijugador` CTR + speed + GSAP scroll feel

**Date:** 2026-05-24
**Page:** `app/[locale]/juego-de-palabras-multijugador/`

## Why
GSC (28d): ranks **position 7.7–9.4** for high-volume ES queries (`scrabble online español` 351 impr, `jugar scrabble en español gratis` 244, `scrabble en linea` 239 …) ≈ **1,637+ impressions, 0 clicks (~0% CTR)**. Title already front-loads the exact query, so the bottleneck is **rank position** (bottom of page 1) → driven by engagement signals (dwell, CWV, content depth). Improving feel + depth = the lever that moves 8→top-5, which is what actually converts impressions to clicks.

## Decisions
- **Framer Motion stays** — already loaded globally (`GlobalBottomNav` + `MotionConfigProvider`), so zero marginal cost. Keep it for entrance reveals + FAQ accordion height anim.
- **GSAP ScrollTrigger added** for the scroll-driven layer only (parallax, hero-tile drift, magnetic CTA). Net-new ~25KB gz. Honest perf framing: **no LCP/CLS regression; +scroll feel**, NOT "faster".
- **Player count = 2-50** (true enforced cap `MAX_PLAYERS_PER_ROOM`). Fix meta desc, HowTo, VideoGame schema, hero stat — all currently inconsistent (2-8 / 2-20).
- **Do NOT touch** H1, `<title>`, or prose H2s — they earn the impressions.
- Hero stays letter-tiles (fast LCP), no raster hero swap.

## Scope

### Phase 1 — Content + CTR (server, no animation)
1. `page.tsx` meta description + HowTo step + `VideoGameJsonLd` maxValue → **50**.
2. `data.ts` STATS: `2-8` → `2-50`.
3. New `ComparisonTable.tsx` (server, pure markup): **LexiClash vs Scrabble vs Apalabrados** rows (gratis / sin registro / tiempo real / multijugador / español / 2026). Targets "alternativa a scrabble" + featured-snippet surface.
4. Add 2–3 inline contextual internal links in prose with query-matched anchors (daily, anagram, words).

### Phase 2 — GSAP scroll layer (client)
- `ScrollParallaxLayer.tsx`: scrub-parallax the decorative blobs + dot grid.
- `MagneticButton.tsx`: pointer:fine magnetic pull on primary CTAs.
- Hero tile scroll-drift (scrub) via a small enhancement.
- All inside `gsap.matchMedia` gating `prefers-reduced-motion: no-preference` and `pointer: fine` (magnetic).
- Pure helpers extracted + unit-tested: `magneticOffset`, `parallaxTransform`.

### Phase 3 — Images via image MCP
- Bespoke on-brand hero accent illustration (mascot + letter board), transparent bg, lazy, `aria-hidden`, non-LCP.
- Regenerate `og-image-es.webp` visual base (1200×630). Avoid AI-rendered text (diffusion garbles it) — text via overlay or omit, rely on og:title.

## Testing (TDD)
- Pure helpers: `magneticOffset`, `parallaxTransform`, comparison-row data.
- Render tests: `ComparisonTable` renders all rows + checkmarks; `MagneticButton` renders children + href.
- Reduced-motion: assert helpers/no-op path; do NOT assert pixel positions.

## Out of scope
- H1/title/prose-H2 rewording. Other locales. Backend.
