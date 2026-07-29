# Word Tower — rival climb fixes + themed rival towers

**Date:** 2026-05-23 · **Status:** spec → implement (autonomous, commit per phase)

## Founder asks (rapid batch, from a 583m nebula screenshot)
1. Still blank (dark navy) bg when scrolling down.
2. "עברת את Fish!" but the player **is** Fish (self counted as rival), and the toast
   **stays** instead of being a brief celebration.
3. Rival buildings should be visible — theme/design their blocks (closest in height).
4. Option to **ruin** part of other rivals' buildings.
5. Reset button should confirm before wiping the climb.

## Root causes (verified by reading)
- **(1)** The biome sky gradients live INSIDE the pan-translated `bgEl`; panning down
  slides them up and exposes the parent `bg-neo-navy`. The dark band is navy, not the
  nebula gradient (whose bottom is bright pink).
- **(2a self)** `/api/word-tower/leaderboard` already returns `isYou` + `playerId`, but
  `useWordTowerRivals` maps only `username/heightM` → self not filtered.
- **(2b stuck)** `WordTowerRivalRail`'s dismiss `setTimeout` lives in the same effect
  keyed on `[viewerHeightM, rivals]`; every built word re-runs it and the cleanup
  cancels the pending dismissal → toast never clears.

## Changes

### A — Static sky layer (blank-bg) · `WordTowerScene.tsx`
Move the two cross-fading biome gradient `<div>`s OUT of the translated `bgEl` into a
static full-bleed layer behind it. Sky always fills the viewport; stars/clouds/props
keep parallaxing inside `bgEl`.

### B — Rivals exclude self + transient celebration + toast off the tiles · `useWordTowerRivals.ts`, `WordTowerRivalRail.tsx` (TDD)
- Hook: add `isYou`/`playerId`/`highestBiome`/avatar to `LeaderboardRow`, filter
  `!row.isYou`, carry `playerId` + `highestBiome` (+ avatar) onto `RivalMarker`.
- Rail: split into two effects — one detects crossings (`setPassed`), a separate one
  keyed on `[passed]` schedules the 1800ms auto-dismiss. + a small 🎉 flourish.
- **"this UI issue"**: the pass toast currently sits at `top-[42%]` — dead centre over
  the build column, covering the letters. Move it clear of the tiles (high, under the
  HUD) so it never obscures the tower.

### C — Themed rival ghost towers · `rivals.ts`, `WordTowerRivalRail.tsx`
Color each rival's ghost column with `blockMaterial(rival.highestBiome)` (concrete →
gunmetal → obsidian by how high they climbed) + a roof cap + an avatar chip
(`avatarEmoji`/`avatarColor` from the API). "Their building" now reads as a themed
tower, using only already-fetched data.

### E — Reset confirmation · `WordTowerPlay.tsx` (+ i18n ×5)
Two-tap neo-brutalist guard: first tap → button becomes "Sure?" (neo-red, shake),
second tap within 3s commits `tower.reset()`, else reverts. No browser `confirm()`
(Capacitor-ugly, breaks RTL). New key `wordTower.hud.restartConfirm`.

## D — Environmental hazards that ruin a tower (✅ BUILT v1)
Implemented: `hazards.ts` (fixed-altitude `WORD_TOWER_HAZARDS` — bomb low, hurricane
high; `hazardsCrossed`), `damageTower` in the manager (topple top-k, drop height,
break combo, re-anchor) + **`heightHighWaterM` anti scramble-farm guard**, reducer
`hazard` action + `firedHazards` in state, `WordTowerPlay` crossing detection +
unmissable red banner (`wordTower.hazard.lost`) + `haptics.bossHit()` + error sound.
The scene auto-pops the toppled floors. Defaults shipped: rebuild is free · fixed
altitude triggers · no opt-out · first hazard at 160m (early climb safe). **Watch
PostHog quit-rate/retention; add a telegraph (incoming warning) or first-hazard grace
if numbers dip.** Rival-tower damage (live versus, `WORD_TOWER_BOMB_*`) still separate.

### (original design notes)
Clarified across follow-ups: hazards damage a **building** (the player's own, and/or a
rival's) and the partial ruin must be SHOWN. "maybe with a bomb, and higher up a
hurricane or something — show the player his building was partially ruined."

This is a core-loop mechanic, not a bug — designing here, building in its own pass so
it isn't half-baked (it touches game state: height, floors, scoring, persistence).

**Proposed v1 (for approval):**
- **Hazard ladder by altitude**: low/mid = falling **bomb**; high = **hurricane/storm**
  (ties to the new `stormTops`/space zones). Fires occasionally above a min altitude,
  rate-limited so it's a spike of drama, not constant punishment.
- **Effect**: removes/topples the top *k* floors (k small, capped), tiles `popOut` +
  debris FX + screen shake; height drops by the removed floors' metres.
- **Telegraph + aftermath**: incoming-hazard warning, then a "🌪️ your tower lost N
  floors!" banner so the loss is legible (never silent).
- **Rivals**: same hazard can dent a nearby rival's ghost column (visual only for static
  leaderboard ghosts; real damage only in live versus where `WORD_TOWER_BOMB_*` exists).
- **Open Qs**: does ruin cost banked scrambles to rebuild? cooldown/affinity by zone?
  opt-out for casual? → resolve before building.

Infra already present: `WORD_TOWER_BOMB_*` constants, `popOut`/`squashLand`/`impactRing`
in `towerSprites.ts`, `WordTowerVersus`. Not implemented this session.

## Test plan
- `rivals` hook: self filtered, `highestBiome` carried (vitest, mock fetch).
- `WordTowerRivalRail`: dismissal survives an interleaved height change (fake timers).
- `npm run lint` + targeted vitest + `tsc --noEmit`. Pixi look → founder live-verify.
