# Word Tower — Crane Truth + Word-Building Juice (design)

**Date:** 2026-07-02 · **Branch:** `feature/word-tower-bloxx-feel`
**Goal:** the crane and word building "still look and feel a bit weird and not satisfying and gamified enough" (founder). Fix the *causes*, not more particles.

## Diagnosis (from code)

1. **Aim/score mismatch.** `WordTowerCrane.drop()` scores the **trolley** offset (`posRef`), but the player watches the **hanging load**, which lags up to `PENDULUM_MAX_DEG=8°` behind (cosmetic pendulum, explicitly excluded from scoring per the old HARD RULE in `cranePendulum.ts`). The visible thing and the scored thing disagree → "weird".
2. **Broken vertical geometry.** Crane chrome is 168px tall; carriage(12) + cable(64) + hook(12) + beam(≤114px) puts the girder bottom ~202px — *below/through* the landing shadow at y=132. The fall is a fixed `translateY(100px)` symbolic hop that doesn't land ON the shadow.
3. **Flat word building.** No per-letter pop or rising-pitch tick; BUILD button shows no reward preview; 3-letter and 8-letter words feel identical to build.
4. **Quality-blind placement.** `swivelStartDeg(lean, topDy)` ignores drop quality — a PERFECT drop wobbles into the tower exactly like a SLOPPY one.

## Design

### A. Load-is-truth crane (the mechanic refactor)
The swinging **load becomes the scored object** (true Tower Bloxx): release offset = trolley + pendulum's horizontal displacement. New pure fn in `cranePendulum.ts`:

```
loadOffsetNorm(trolleyNorm, angleDeg, armPx, rangePx) = trolleyNorm + sin(angle)·armPx / rangePx
```

`armPx` = cable length + half beam height (pivot→beam centre). `drop()` scores `loadOffsetNorm`; the live band, landing shadow, and reticle preview read the **same** projection, so WYSIWYG holds *because* the pendulum counts, not despite it. Load velocity (smoothed d(loadOffset)/dt) replaces trolley velocity for momentum drift. Old HARD RULE comment inverted: the rule is now "preview and verdict read the same `loadOffsetNorm`". `PENDULUM_MAX_DEG` 8→10 so the swing is a legible timing skill. `getOffset` test seam unchanged.

### B. Real fall geometry
- Chrome height 168→210px; shadow/reticle anchored near the bottom.
- **Adaptive cable:** `craneCableLenPx(beamH)` (pure, clamped ~[18, 64]) so the girder bottom always hangs with ≥~48px of air above the shadow, for any word length.
- **Fall lands ON the shadow:** `craneFallPx(beamH)` = shadowY − beam bottom, computed from the same pure geometry. Cable recoil/drift keep the 300ms window (fall distance changes, duration doesn't).
- Extract geometry constants + fns to new `lib/wordTower/craneGeometry.ts` (tested) — also brings `WordTowerCrane.tsx` (528 lines) back under the 500-line rule.

### C. Quality-linked swivel
`swivelStartDeg(lean, topDy, quality?)`: perfect → ×0.6 base tilt (confident tight snap), sloppy/miss → ×1.5 (visible wobble), good → unchanged; arc cap still applies. `WordTowerScene` already holds `impactQualityRef` at the call site — pass it through.

### D. Word-building juice
- **Per-letter pop:** last-selected tile bounces (CSS keyframe); word ribbon bumps as it grows.
- **Rising-pitch tick:** `playSound('tileSelect', { rate: letterTickRate(n) })` per selected letter — pitch climbs with word length (pure, clamped ≤ ~1.6); deselect ticks lower (0.9).
- **Reward preview on BUILD:** button shows `+X.Xm` via existing `floorMeters(len, combo)` — the player sees the payoff before committing. New i18n key ×6 locales only if no reusable meters key exists.

## Testing
TDD (pure first): `loadOffsetNorm`, `craneCableLenPx`/`craneFallPx` invariants (beam bottom + fall land exactly on shadow for len 3–10), `swivelStartDeg` quality ordering + cap, `letterTickRate` clamp. Component: wheel shows gain preview + pop class. Full lint/tsc/tests/build gate.

## Out of scope
Combo-milestone celebration relocation (notice column is a deliberate design), new crane art, sound asset changes, upgrade costs/effects.
