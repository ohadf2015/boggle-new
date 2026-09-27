# Homepage redesign — "Mode Cubes" bento (A/B via PostHog)

**Date:** 2026-06-11 · **Branch:** worktree/homepage-cubes · **Register:** brand (landing)

## Problem
Logged-out homepage mode section (`LandingChallengeCards` → `ModeCard`, 656+614 lines) renders
same-shaped icon+heading+long-description cards repeated down the page = the brand register's
"identical card grid" slop. User: cards "don't look good", wants smaller **cubes with nice icons**,
unique, **not overwhelming**, **scroll effects**. Also wants it **A/B tested via PostHog**.

## Approach — compute once, render twice (parity-safe A/B)
- New PostHog experiment `landing-modes-cubes-v1`, variants `['control','cubes']`, default `control`.
- Branch is **inside** `LandingChallengeCards` AFTER the shared order/gating computation. Both layouts
  consume the SAME computed `cardOrder` + flags → the test compares layout only, no logic drift.
- Control `renderCard` switch + return JSX stay **untouched** (lowest risk to the live path).
- `cubes` variant returns new `<LandingModeCubes>` (pure presentation, <300 lines).
- Force variant locally via `forceVariantByEmail: { ohadf2015@gmail.com: 'cubes' }` so it's
  browser-testable before any rollout. Fire `experiment_exposed` in an effect (exposure denominator).

## Cube design (bento, NOT uniform — that's the slop we're killing)
- **Daily**: keep `DailyChallengeBanner`, full-width hero slot (special stats, don't re-skin).
- **Arena**: large 2×2 anchor cube (pink), live "X playing now" — competitive/social anchor.
- **Practice**: medium cube (cyan), "Start Here" highlight for non-veterans.
- **Solo modes**: small 1×1 square cubes, mode color block, generated/lucide icon, short title (NO long desc).
- Extras for newbies → existing `<details>` "More modes", as small cubes (keeps SEO DOM links).
- Identity preserved: `--neo-*` tokens, hard shadows, Fredoka/Rubik, electric mode colors. Black ink on accents.

## Motion (ONE deliberate reveal — not fade-on-everything)
- Cube grid: framer-motion `whileInView` stagger, `viewport={{ once: true }}`, ease-out.
- `prefers-reduced-motion` → instant/opacity-only. RTL parity (shadows auto-flip; test `?locale=he`).

## Icons (enhancement, layered last)
- Generate a tight, consistent set (one locked art-direction prompt) for top public modes only.
- `next/image` with explicit width/height (no CLS), lazy below fold. Lucide fallback for admin tail + missing assets.

## Data
- `lib/landing/modeMeta.ts`: module `MODE_META` table (key → titleKey/descKey/route/Icon/variant/badge/modeImage)
  + `buildCubeDescriptors()`. Control switch is source-of-truth; a parity test asserts MODE_META mirrors it
  (href + variant per public mode) to prevent drift.
- Tracking events identical to control (`trackModeSelected`, `trackLandingCtaClick`) → apples-to-apples A/B.

## i18n
- Reuse existing `landing.*` keys. Avoid new required keys (no 5-lang churn) unless a short cube tagline is needed;
  if added, fill all 5.

## Acceptance
- TDD green, tsc 0, lint 0, build 0.
- Control path unchanged (snapshot/branch test).
- Variant forced for my email renders cubes; browser-verified EN + HE, no overflow, reduced-motion ok.
- PostHog flag created, rollout 0% (ramp manually after smoke).
