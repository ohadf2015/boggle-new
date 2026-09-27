# Blast Mode V2 — Repair + Polish Design

**Date:** 2026-05-15
**Status:** Approved (autonomous execution — no review gate)

## Problem

Blast V2 (the gated tester mode at `/[locale]/blast`) is not playable:

1. **Stops after level 1** — game never advances past the first level.
2. **Gravity/cascade feels broken** — collapse doesn't feel like tiles falling.
3. **No effects** — promised Pixi/GSAP juice is absent.
4. **Tiles render at top of page** instead of bottom-anchored.
5. **Collapses create rows with multiple valid words** — should be at most one.
6. **Hebrew shows sofit (final) letters in wrong places.**

## Architecture context

Two blast codebases exist:

- **Path A (production):** `lib/blast/v2/` (pure engine) + `components/blast/v2/` (UI). Routed at `app/[locale]/blast/page.tsx` → `BlastV2PageClient` → `BlastGame` → `useBlastV2`. This is the real game.
- **Path B (orphaned):** `components/blastEngine/` — `BlastEngineView`, `useBlastGameLoop`, `BlastGameCanvas`. Never routed. Contains working Pixi particle/debris systems. Dead code.

Level sources (`CuratedPackSource`, `ChainPackSource`, `GeneratedLevelSource`) use `node:fs` — server-only. Levels 1–15 for `en`/`he` come from `pack-chain.json` via `ChainPackSource`; 16–30 curated; 31+ generated.

## Root causes

| Issue | Root cause |
|---|---|
| Stops after level 1 | `BlastV2PageClient.tsx:37` `onAdvance={() => console.log('advance')}` stub; `page.tsx:36` hardcodes `levelNumber = 1`. |
| Sofit letters | `BlastBoard.tsx:118` calls `displayChar(letter, row, col.tiles.length)` — passes *column* position, not *word* position. Top tile of every column renders as a final form. |
| Tiles at top | `BlastGame.tsx` board container has no flex height; `items-end` on `BlastBoard` has nothing to push against. |
| No effects | `BlastFxOverlay.tsx` inits a Pixi `Application` then does nothing with it — hollow stub. |
| Multi-word rows | `GeneratedLevelSource.resolve` never calls existing `forwardSim`; `fillEmpties` adds random weighted letters with no check against forming extra dictionary words. Chain packs unaudited. |
| Gravity/cascade feel | framer `LayoutGroup` + GSAP squash (`useCollapseTimeline`) exist; need to verify stable keys so tiles slide not teleport, and that reveal-glow points to next findable word. |

## Decisions

- **Cascades stay manual-find** — clearing a word reveals new formable words; player must drag each. (Existing intended design, `useBlastV2.ts:82`.) No auto-chaining.
- **Extra-word rule = ANY dictionary word** — a line is invalid if filler or a post-collapse adjacency forms any valid dictionary word beyond the level's intended `words`.
- **Effects = full juice layer** — real Pixi particle bursts + debris on clear, screen shake, score-fly, cascade sparkle escalation, GSAP HUD micro-punches.

## Plan — 6 phases, TDD each, commit per phase

### P1 — Hebrew sofit fix
- `BlastBoard.tsx`: render base `letter` on tiles instead of `config.displayChar(...)`. Final-form is direction-dependent and cannot be known statically per grid tile.
- Keep `displayChar` only where word-position is real (selection readout, results card) — audit those call sites.
- Tests: `BlastBoard`/`BlastTile` renders base Hebrew forms for grid tiles.

### P2 — Tiles to bottom
- `BlastGame.tsx` playing view → `flex flex-col min-h-dvh`: HUD top, board wrapper `flex-1 flex items-end justify-center`.
- Verify in browser (dev :3001) — low-confidence diagnosis until visually confirmed.

### P3 — Level progression
- New route `app/api/blast/level/route.ts` — `GET ?level=N&locale=X` → `buildRegistry()` + `getLevelSourceForLevel(N, locale).resolve()` → `BlastLevel` JSON. Validates locale.
- `BlastV2PageClient`: lift `currentLevelNumber` state; `onAdvance` increments + fetches next level + re-renders `BlastGame` with new `level` prop. Loading state + graceful end-of-content handling.
- Tests: route returns valid level; client advances level on `onAdvance`.

### P4 — Generator: no extra words
- `GeneratedLevelSource.resolve`: after `placeWords` + `fillEmpties`, within the existing 25-attempt loop:
  - Run existing `forwardSim` (confirms a valid pop order exists).
  - New validator `hasNoExtraWords(level, config)`: scan every horizontal + vertical line segment (length ≥ locale `wordLengthRange.min`) against the locale dictionary (`bonusDictLoaders[locale]`); any valid word whose normalized form is not in `level.words` → reject candidate, regen.
  - Re-run the extra-word check after each simulated collapse step (collapse exposes new adjacencies).
- Audit `ChainPackSource` output with the same validator; reject/repair chain levels that produce extra words.
- Tests: generator never emits extra-word levels; `hasNoExtraWords` unit tests; chain-pack audit test.

### P5 — Full juice layer
- Harvest reusable Pixi systems from Path B (`PhysicsDebris`, particle presets, `ScoreFlyManager`, `ScreenShake`) into `lib/blast/v2/fx/`.
- Replace hollow `BlastFxOverlay` with real Pixi FX driven by game events: word-clear bursts + debris at cleared cell coords, screen shake, score-fly DOM→HUD, cascade sparkle, escalating chain ovation keyed by `chainEventKey`/`lastChainDepth`.
- GSAP HUD micro-punches (coins, combo, level number).
- DOM board stays (framer collapse, RTL, a11y); Pixi overlay is `pointer-events:none`.
- `BlastBoard` exposes cleared-cell screen coords (extend existing `getCellCenter`).
- Delete Path B (`components/blastEngine/`) once systems are harvested.
- Tests: FX overlay mounts; reacts to clear/chain events.

### P6 — Collapse feel
- Verify `rebuildTileIds` produces stable framer keys so tiles *fall* (not teleport).
- Tune `useCollapseTimeline` GSAP squash timing.
- Ensure reveal-glow always points to the next findable word.
- Browser playtest.

## Out of scope

- Auto-chaining cascades (manual-find chosen).
- DB progress persistence (`useBlastProgress` DB write — deferred "Plan 3").
- Path B revival.
- Locales beyond en/he for chain content (sv/ja/es fall through to curated/generated).

## Risks

- P2 layout diagnosis is low-confidence until browser-verified.
- P4 dictionary scan over generated levels may push regen attempts past 25 for dense boards — may need to raise `MAX_REGEN_ATTEMPTS` or relax column packing.
- Pixi v8 + Next 16 Strict Mode canvas race (see memory `feedback-pixi-v8-react-strict-mode-canvas-race`) — defer Pixi init or use existing pattern.
