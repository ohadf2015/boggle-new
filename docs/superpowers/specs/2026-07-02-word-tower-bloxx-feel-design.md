# Word Tower — Tower Bloxx Feel Overhaul (Design)

**Date:** 2026-07-02 · **Branch:** `feature/word-tower-bloxx-feel`
**Goal:** Keep the existing word→crane→stack mechanism, add the *game feel* of Tower Bloxx: physical block drops, tower bounce, crane personality, richer graphics, and an upgrades shop that's fun to browse.

## Context (what exists)

- PixiJS 8 scene (`WordTowerScene.tsx`), crane pendulum + trolley sweep (`cranePendulum.ts`, `craneSweep.ts`), swivel descent (`swivelDrop.ts`), sway/lean math (`towerSway.ts`, `towerLean.ts`).
- Placement verdict: `evaluatePlacement(offset, consecutiveSloppy, perfectBandBonus)` in `cranePlacement.ts` — offset is a **snapshot at release**. Live band preview reuses `alignmentBand()` so preview always matches verdict (invariant to preserve).
- Drop reaction: `useCraneDrop.ts` (streaks, lean window, clutch saves, topple).
- Upgrades: 10 pure-math upgrades (`upgrades.ts`), Zustand+localStorage store, flat 139-line `WordTowerUpgradePanel.tsx`.
- Feel layer precedent: pure lib module + vitest in `lib/wordTower/__tests__`, consumed by Pixi (e.g. `dropQualityIntensity`, `cableStretchAt`).

## Approach chosen

**Kinematic "scripted physics" layer** (how Tower Bloxx itself works): pure, deterministic math modules feeding the Pixi scene. Rejected: full matter-js rigid-body sim (breaks deterministic daily seed + scoring, big regression risk); matter-js debris-only (parabola + spin is ~40 lines, engine unjustified).

## Components

### 1. Momentum drop — `lib/wordTower/dropKinematics.ts` (new, pure)

The core Tower Bloxx skill: the block **inherits horizontal velocity** from the swinging crane, so you release *before* center and watch it drift in.

- `fallDurationMs(dropHeightPx)` — gravity fall time (√(2h/g) with game-tuned g).
- `fallProgressY(t)` — normalized quadratic (gravity) vertical easing for the descent animation.
- `landingOffset(releaseOffset, releaseVelNormPerMs, fallMs, carryFactor)` — projected landing = release + velocity·time·carry. `CARRY_FACTOR ≈ 0.5` keeps drift noticeable but fair; clamped so max drift ≤ ~0.35 normalized.
- `driftDuringFall(t)` — horizontal position during descent (linear drift), so the animation lands exactly where the verdict says.

**Verdict integration:** `evaluatePlacement` unchanged; the crane feeds it `landingOffset(...)` instead of the raw snapshot. **Live band preview** switches to the same projection (current sweep position + current velocity → projected band), preserving the preview-equals-verdict invariant. Sway jitter (`effectiveDropError`) still applies after projection, unchanged.

### 2. Landing impact — `lib/wordTower/landingImpact.ts` (new, pure)

Tower Bloxx's signature: the whole tower **compresses and rebounds** when a block lands.

- `impactDipPx(floorDepth, tMs, intensity)` — damped spring: floors below the landing dip by an amplitude that decays with depth (top floor most, ~4 floors deep), recovering over ~550 ms. Intensity from existing `dropQualityIntensity(quality)`.
- `squashScale(tMs, intensity)` — squash-stretch envelope for the landing block itself (x-wide/y-flat on contact → overshoot → settle). Scene applies to tile scale; existing `squashLand` tween replaced by this curve so quality drives the squash.

### 3. Tumble physics — `lib/wordTower/tumbleArc.ts` (new, pure)

Toppled floors currently vanish behind particles. Instead they **tumble off screen**:

- `tumbleParams(floorId, leanSign)` — deterministic (hash of floorId): direction (lean side), launch velocity, angular velocity, arc gravity.
- `tumbleAt(params, tMs)` — {xPx, yPx, rotationDeg, alpha} parabolic trajectory over ~900 ms, fade near the end.
- Scene detaches the toppled tiles into an overlay container and animates them out before removal; `crashFx` particles/shake unchanged on top.

### 4. Perfect-drop impact punch — `lib/wordTower/impactPunch.ts` (new, pure)

*(Revised from "slow-mo": the scene's sway/crane animations are phase-locked to the absolute clock — rescaling time would desync them. A zoom-punch hitstop delivers the same beat safely.)*

- `punchScaleAt(tMs, intensity)` — camera scale envelope 1 → 1+0.03·i → 1 over ~260 ms (snap in, ease-out back).
- `flashAlphaAt(tMs)` — golden full-scene flash alpha envelope (~180 ms).
- Scene applies to the outer container on perfect drops and clutch saves (higher intensity). Skipped under `prefers-reduced-motion`.

### 5. Crane personality (visuals)

- **Cable render:** line from jib to hook with existing `cableStretchAt` elastic stretch; recoil whip on release (short overshoot curve, new `cableRecoil(tMs)` in `cranePendulum.ts`).
- **Hook snap:** two-jaw hook opens on release (rotation tween, Pixi Graphics).
- **Generated sprites:** crane cab + jib in the project's neo-brutalist flat style (hard black outlines, navy/lime, transparent PNG) via image gen, placed under `public/images/word-tower/crane/`. Drawn primitives remain the fallback if sprites clash with the aesthetic in review.

### 6. Upgrades shop overhaul — `WordTowerUpgradePanel.tsx` + new `upgradeCatalog.ts`

Presentation, not economy (costs/effects untouched):

- **3 categories:** Crane (steadyCable, wideFooting, tailwind), Stability (windbreak, reinforcedCore, quickRecovery, salvage, centerMagnet), Boost (masterArchitect, momentum) — pure `upgradeCatalog.ts` mapping + per-upgrade icon.
- **Delta preview:** current → next effect rendered per row ("−8% → −16% sweep speed"), from a pure `effectPreview(id, level)` formatter.
- **Level pips**, affordable-glow on buyable rows, purchase burst (coin particles + `animate-neo-pop`).
- **Recommended chip:** cheapest affordable upgrade in the least-invested category.
- New i18n keys under the existing `upgrade.*` namespace ×6 locales (en, he, sv, ja, es, ru) — native copy via ux-writer conventions, no literal translation.

## Non-goals

- No matter-js / rigid-body sim; no scoring or economy changes; no new upgrades; no server/API changes; no multiplayer changes. Daily determinism preserved (all new math is pure + seeded/parametric).

## Testing

- TDD (vitest) for every new pure module: band-edge cases for projected landing (drift clamp, zero-velocity = old behavior), spring dip monotonic decay by depth + settles to 0, tumble determinism per floorId, time-scale envelope bounds (never < 0.3, returns to 1).
- Preview-equals-verdict invariant test: for sampled sweep phases, projected preview band == band of the verdict offset.
- Existing suites (`dropFeel`, `cranePlacement`, `cranePendulum`, `craneSweep`) must stay green — `carryFactor = 0` must reproduce legacy offsets exactly.
- Visual verify in-browser (run app) per phase; `npm run lint && npm run test && npm run build` per phase.

## Phases (one commit each)

1. **Drop physics core:** dropKinematics + landingImpact, wired into crane release, descent, verdict, and scene (squash + compression wave).
2. **Juice & debris:** tumbleArc, timeDilation, cable recoil + hook snap, camera punch on heavy landings.
3. **Upgrades shop overhaul:** catalog, categorized panel, delta previews, purchase juice, i18n ×6.
4. **Generated art + polish:** crane sprites, integration, RTL/Hebrew + reduced-motion check, full verify.

## Risks

- **Difficulty shift** from momentum carry: mitigated by CARRY_FACTOR tuning + drift clamp; perfect band already generous (0.18). If playtest feels unfair, drop carry to 0.35.
- **Sprite/style clash:** generated art must match neo-brutalist palette; fallback = keep vector crane, ship the rest.
- **Mobile perf:** compression wave touches ≤4 tile positions and one scale — O(1) per frame; slow-mo gated off reduced-motion.
