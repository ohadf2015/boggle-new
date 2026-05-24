# Small-screen fit: word grid + word wheel

**Date:** 2026-05-24
**Status:** implemented (tsc clean on touched files, lint clean, 662 wheel/grid tests green; cqb chain verified height-definite). Awaiting founder live-verify + he/sv/ja/es unaffected (no new strings).

## Problem (from founder screenshots)

1. **Solo timed game** (`PortraitLayout`): on short viewports the timer/word-forming
   chrome plus an over-padded grid height reservation leaves the letter grid too
   small with dead space above it.
2. **Word Wheel** (multiplayer `WheelRushView` — "Fog of War"; and daily
   `WordWheelGame`): on short/landscape viewports the wheel container is a *fixed*
   square (`w-64 h-64` etc.) with `shrink-0`. Its `flex-1` cluster can shrink but the
   wheel cannot, so the wheel bleeds up into the word-builder pills and down into the
   action buttons → overlap.

## Root causes

- Wheel containers use fixed Tailwind sizes and never react to available *height*.
  The radius is derived from container **width** only (`(w-offset)/2`, floored at
  72/56), so it cannot rescue a too-tall wheel.
- Solo grid reserves a flat `calc(100cqb - 200px)` on `medium-short`; real chrome on
  short screens is ~140px (header already drops to `short:min-h-[84px]`).

## Approach (low regression by construction)

- **Wheel size cap, not size swap.** Keep the existing fixed `w-/h-` classes; add
  `max-w/max-h = max(floor, calc(100cqb - reserve))`. `max-*` only binds when the cap
  is smaller than the fixed size, so tall screens render identically; short screens
  shrink the wheel to fit. Requires `container-type: size` on the wheel cluster so
  `cqb` resolves to the cluster's block size.
  - Daily: floor 176px, reserve 116px (tap-hint + rule-hint + action bar + gaps).
  - MP: floor 176px, reserve 148px (action bar + MyWordsChips + gaps; both inside the cluster).
- **Shared radius helper** `lib/wordWheel/wheelGeometry.ts` `computeWheelRadius(width, maxRadius, minRadius=52)`
  — pure, TDD'd, unifies the two inline formulas and lowers the floor to 52 so a
  shrunk wheel keeps letters inside the rim. Read width via getBoundingClientRect as
  today (daily window resize, MP ResizeObserver) — it recomputes when the cap rebinds.
- **Letters shrink on `short:`** (≤600px height) only: center 80→64, outer 52→48, with
  `short:sm:`/`short:md:` compounds so landscape phones (short AND ≥640/≥768 wide) also
  shrink. Above 600px the wheel stays full-size so base letters are correct.
- **Reserved slots shrink on short**: daily found-words `medium-short:h-[88px] short:h-16`.
- **Solo grid**: `medium-short` reservation `calc(100cqb - 200px)` → `calc(100cqb - 150px)`.
  Safe on phones (the `92cqi` width term binds there, not the height term); only short
  windows — where the height term binds — reclaim the wasted ~50px.

## Out of scope

- Desktop wheel canvas (`isDesktopCanvas`) sizing — not in the reported screenshots.
- Hiding chrome on extreme (<450px tall) windows; we accept a slight clip there.

## Verification

- Unit: `computeWheelRadius` (clamps, floor, NaN/0 guard, scaling).
- Build + lint + existing wheel/grid suites green.
- Manual: founder live-verify on short window + landscape phone.
