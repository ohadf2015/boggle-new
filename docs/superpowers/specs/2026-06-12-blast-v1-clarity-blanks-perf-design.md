# Blast V1 — Tile Clarity, Blank-Tile Fix & Low-End Perf

**Date:** 2026-06-12
**Mode:** `blast` (legacy V1 engine — live for ALL players, solo + multiplayer; v2/Wordfall is admin-only)
**Status:** Design → implementation

## Problem (from user)

1. **Too many special-tile types (23) confuse players** — they can't tell what each does.
2. **Tiles "almost have no special effects"** — not visually unique or understandable.
3. **Blank tiles sometimes remain after cascade or explosion.**
4. **Performance is slow, especially on low-end devices.**

## Scope & engine facts (verified)

- Live route `app/[locale]/blast/page.tsx` → `BlastLegacyPageClient`. V2 at `/blast/v2` is admin-gated. No flag toggles the public route.
- Tile types: `shared/types/blast.ts` (23 types). Wave unlock + spawn gating: `components/blast/legacy/utils/blastWaveConfig.ts`.
- **MP parity constraint:** server generation `backend/modules/blastModeManager.ts` → `generateBlastOverlay()` / `rollSpecialType()` reads the SAME wave config + distribution. Any roster change must be honored by both client refill (`computeGravityResult` refill=true) and server overlay generation, or solo and MP diverge.
- Gravity/refill: `components/blast/legacy/utils/blastGravity.ts`. Clear/effects: `clearTilesProcessor.ts`, `blastTileEffects.ts`. Letter swaps: `blastLetterSwaps.ts`.
- Perf: `BlastEffectsCanvas.tsx` + `useBlastDebris.ts` (always-on Pixi ticker). Device gating already exists: `hooks/useDevicePerformance.ts`, `usePrefersReducedMotion`.

## Sequencing (each phase commits green independently)

Bug fixes ship first and are NOT gated behind the subjective tile redesign.

### Phase 1 — Blank-tile fix (bug, highest certainty)

**Reproduce before fixing (TDD RED first).**

1. **Overlapping-vortex-swap test** (primary suspect, `blastTileEffects.fireVortexPull` + `applyVortexLetterSwaps`): construct a board where one vortex event produces two overlapping pulls, run the full clear→swap→`computeGravityResult` pipeline, assert **no cell satisfies `isCleared===false && letter===''`**. Determine whether it reproduces in **solo** (refill=true, client) or only MP. Fix lives where it reproduces:
   - If swap ordering strands a live cell with an empty letter → make swap application order-independent (apply all grid-letter swaps from a snapshot, or defer tileState swaps until after grid swaps).
2. **Refill invariant**: in `computeGravityResult` with `refill=true`, assert every empty cell above survivors receives a generated letter (count cleared == count refilled). Add a test that a column with N cleared and refill=true ends fully populated (no `''` in any non-cleared cell).
3. **Defense-in-depth (NOT the headline):** change the gravity default-init (`blastGravity.ts:101-108`) so unwritten cells fail **closed** (`isCleared:true`, i.e. invisible) rather than fail-open playable-blank — guarded by a test proving a deliberately shrunken board never renders a playable empty cell. Only apply if it does not shrink a board that should have refilled (refill=true path must still fully populate).
4. Shuffle-unseeded MP divergence is **out of scope** for Phase 1 (separate concern); note it as follow-up.

**Done when:** new RED tests go green, existing `blastGravity.test.ts` / `blastLetterSwaps.test.ts` stay green, no `isCleared===false && letter===''` reachable in the cascade/explosion pipeline.

### Phase 2 — Low-end perf (bug, low risk)

1. **Idle the Pixi ticker** (`BlastEffectsCanvas` / `useBlastDebris`): stop the ticker/physics RAF when no debris & no active FX; **wake on next spawn**. Reuse the WordCraft `shouldIdleParticleTicker` pattern. **Trap:** verify a clear AFTER an idle gap still fires FX (test or manual repro) — silent-no-FX is the regression to avoid.
2. **Conditional per-tile overlays** (`BlastTile.tsx`): render `BlastJellyOverlay` / `BlastChocolateOverlay` only when actually in use (jellyLayers>0 / type==='chocolate'), not unconditionally on every tile.
3. **Cheaper combo glow** (`BlastStage.tsx` `blast-frame-glow`): replace animated `box-shadow` (paint) with transform/filter or gate behind `enableComplexAnimations`.
4. Gate FX intensity by `useDevicePerformance` tier; do not let new tile effects (Phase 3) fight the perf budget.

**Done when:** idle board no longer runs per-frame physics; FX still fire after idle; overlays only mount when used; tests for the idle-gate predicate pass.

### Phase 3 — Tile clarity & curation (design)

Goal is BOTH fewer **and** more legible. Curate to one tile per **mechanic family**, each with a distinct identity.

**Curated core (rationale: one per family):**
| Family | Kept tile | Drop/merge (config-gate off) |
|---|---|---|
| Score multiplier | `gold` | `diamond` (fold its big-multiplier feel into gold tiers or keep as rare gold variant) |
| Wild / copy | `rainbow` | — |
| Area bomb | `bomb` | `magma`, `catalyst` (overlapping area effects) |
| Line clear | `lightning` | `prism` (cross ≈ line family) |
| Obstacle | `ice` | `frozen` (redundant 2-hit twin) |
| Timer-bomb | `countdown` | `fuse` (redundant timer→3×3 twin) |
| Treasure/reward | `gem` | — |
| Objective-only | `chocolate`/`cake` | keep ONLY when an objective uses them |

- **Config-gate, don't delete types.** Set dropped tiles `enabled:false` across `blastWaveConfig.ts` AND ensure server `generateBlastOverlay`/`rollSpecialType` respects it. Reversible by flag (`blast-v1-curated-tiles`).
- **Each kept tile gets a distinct signature:** unique color + icon (already in `TILE_VISUALS`) AND a unique clearing motion (`CLEARING_ANIMS`) that reads as the mechanic (bomb = burst outward, lightning = vertical streak, ice = shatter, countdown = tick-flash, gem = pop+sparkle, gold = shine, rainbow = hue-sweep). Intensity gated by device tier.
- **First-use teaching:** when a player first encounters a kept tile, a brief non-blocking callout ("Bomb — clears the area") via existing tooltip/`blast.tile.*.name/.desc` i18n. Dedup so it shows once. Wire missing i18n (he/sv/ja/es) for kept tiles; chocolate/cake get names if they remain.
- Smoother wave progression: kept tiles unlock across fewer waves so each new tile is introduced clearly.

**Done when:** curated roster spawns in both solo and MP, each kept tile visually + motion distinct, first-use teaching fires once per tile, i18n complete for kept tiles, flag-reversible.

## Testing

TDD per phase. New unit tests: blank-invariant (Phase 1), idle-ticker predicate + overlay-conditional (Phase 2), curated-roster gating respected by client+server + first-use-dedup (Phase 3). Keep existing blast suite green. `npm run lint && tsc && build` after each phase.

## Risks

- **MP/solo divergence** if server overlay generation ignores curated config — verify the server read path in Phase 3.
- **Default-init flip** could hide cells that should have refilled — only ship behind the refill-invariant test.
- **Ticker idle** could silence FX — verify wake-on-spawn.
- Daemon auto-commit/wipe (per memory): commit each phase when green.
