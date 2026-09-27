# Blast (legacy) — Feel, Wave Identity & Cascade Taming

**Date:** 2026-07-02
**Target:** the LIVE player-facing Blast engine (`app/[locale]/blast` → `components/blast/legacy/*`, `lib/blast/*`). Blast v2 (`/blast/v2`, admin-only) is out of scope.

## Goal

Make Blast feel more like Candy Crush's addictive loop — variable reward, per-level distinctiveness, escalating juice — while:
1. Preventing "super cascades" that clear most of the board in one resolution.
2. NOT increasing the tile-memorization burden (today ~10 active special types; players complain they must remember what each does).

## Context (verified in code)

- **Super-cascade path:** per cascade chain level the engine auto-clears up to **3 matches** (1 cluster + 1 vertical word + 1 horizontal word — `useBlastCascade.ts:109-129` slices three lists to `MAX_CASCADE_WORDS_PER_LEVEL=1` *each*), across up to `MAX_CASCADE_CHAIN=5` chain levels (`types.ts:285-287`), with bomb chain detonations (`BLAST_MAX_CHAIN_DETONATIONS=8`, 3×3 BFS) firing inside each clear. Worst case ≈ board wipe.
- **Wave archetypes are cosmetic:** `blastWaveConfig.ts` tags waves (normal/scoreRush/treasureHunt/survival) but archetype changes no engine behavior; waves 1–3 share identical FX theming.
- **All unlocked specials spawn simultaneously** from their unlock wave onward — the memorization burden grows monotonically (bomb, ice, gold, rainbow, lightning, prism, gem, anchor all live at W8+).
- **Variable reward exists but is muted:** treasure roll (`blastTreasureRoll.ts`, seeded, skill-biased, lucky 22%/jackpot 5%) renders only as a small tag on the score fly (`BlastScoreFly.tsx:22 luckyTier`). Jackpot ≈ lucky visually.
- **Dead-end shrink clear is silent/instant** (board compacts with no per-cell FX before SugarCrushFinale).
- **MP constraint:** multiplayer Blast has a server authority (`backend/modules/blastModeManager.ts`), client optimistic-submits with seeded RNG, `blastBoardEquality.ts` guards divergence. Any spawn/cascade rule change must be mirrored server-side or gated single-player-only (precedent: DDA is SP-only).

## Approaches considered

- **A. Tuning only** — lower caps, reweight spawns. Cheap; fails the uniqueness + variable-reward goals.
- **B. Wave-identity system + cascade quality-gating + reward amplification (CHOSEN)** — archetypes become engine-real with a *featured-specials roster* (fewer concurrent tile types per wave, not more), cascades get quality gates instead of hard visible nerfs, existing treasure roll gets its jackpot moment, one self-explanatory "?" tile adds slot-machine randomness. Reuses existing systems (wave config table, seeded RNG, juice kit, score fly, tile-first-use callout).
- **C. Board-mechanic redesign** (objectives everywhere, jelly-style boards) — too large/risky for the live mode.

## Design (4 workstreams, priority order; each independently shippable)

### W1 — Cascade taming: "epic, not emptying"

1. **One auto-clear per chain level** (was up to 3): pick the single best match per level — largest cluster, else longest word. Cuts worst-case per-chain volume 3×.
2. **Quality gate on deep chains:** chain level ≥3 continues only if the match is "quality" (cluster ≥4 tiles or word ≥5 letters). Long tails become rare/earned, matching variable-ratio psychology (rare big > frequent big).
3. **Bomb chain tightening:** `BLAST_MAX_CHAIN_DETONATIONS` 8→5; add explicit `BLAST_BOARD_WIPE_CAP = 0.4` — a single resolution (word + specials + cascades) stops clearing once >40% of live board cells cleared.
4. **Overflow Surge:** every suppressed clear (capped detonation / gated cascade) converts to +6 pts per suppressed cell with a spark FX at the suppressed cell — the cap reads as a *payout*, never a nerf.
5. **MP safety:** if `blastModeManager.ts` mirrors these constants, update both sides; if the server replays client rules from a shared module, single change suffices; if unmirrorable, gate W1 rules SP-only (DDA precedent). Resolve at implementation time — plan step includes locating the server path first.

### W2 — Wave identity: unique levels, LESS memorization

1. **Featured-specials roster:** every wave spawns **CORE** = {bomb, gold, rainbow, ice} (all taught by W1-2) **+ at most 2 FEATURED specials**. Non-featured specials get weight 0 that wave; the featured one gets a boosted weight (~10–12%) so it appears often enough to learn. Rotation (config-table data, tunable — as implemented): W3 prism · W4 lightning · W5 mystery · W6 prism+lightning · W7 anchor · W8 lightning+anchor · W9 prism+mystery · W10 anchor+mystery · W11 prism+anchor · W12 lightning+mystery, cycling deterministically beyond W12. Player tracks ≤6 concurrent types, 4 of them constant.
2. **Archetypes become engine-real** — one numeric hook each (defined in the wave table, no scattered ifs):
   - `scoreRush`: gold weight ×1.5, combo window +0.5s.
   - `treasureHunt`: featured forced to gem, gem weight ×2.
   - `survival`: ice weight ×1.3, +1 starting move removed (moves −1).
   - `normal`: baseline.
3. **Archetype visual identity:** accent color per archetype (extend `blastColorTokens.ts`), particle tint preset in `BlastEffectsCanvas`, `BlastBackground` hue shift, and the wave intro (`BlastWaveIntro`) shows the featured tile chip + one-line `t()` description (reuse `blastTileFirstUse` copy).
4. Retired tiles (`BLAST_RETIRED_SPECIAL_TYPES`) stay retired. DDA Lucky Boost applies *after* roster filtering (boost only tiles legal this wave).

### W3 — Variable reward amplification

1. **Jackpot moment:** on treasure-roll `jackpot` tier (5%), fire a real celebration — juice-kit confetti burst + distinct SFX + "JACKPOT!" praise line. `lucky` stays as today (tag on score fly). Amplifies the existing slot-machine cadence instead of adding a new system.
2. **Mystery tile `?`:** ONE new special (W6+ via roster, ~4% weight). Zero memorization — "? = surprise". On clear, seeded roll: 45% score burst (+25–60), 30% spawn a random CORE special on an adjacent cell, 20% mini-pop (clears 1 random neighbor), 5% mega (+150 pts + gold spawn + jackpot FX). Deterministic via existing seeded RNG (MP-safe); resolution logic pure + unit-tested.
3. **Cascade praise ramp:** escalating praise copy per chain depth 2/3/4/5 (extend `BlastChainText`/`BlastWordPraise` if coverage flat), `t()` keys ×6 locales.

### W4 — Feel polish

1. **Dead-end shrink clear:** staggered sweep pop (~40ms/cell in sweep order) with per-cell FX before `BlastSugarCrushFinale`.
2. **Cascade pop pitch ramp:** verify per-chain-level pitch variation; if flat, add rising pitch per level.
3. **Wave-clear flash tinted by archetype accent** (ties W2 identity into the reward moment).

## Constraints

- All UI text via `t()`, 6 locales (en/he/sv/ja/es/ru). RTL-safe.
- `prefers-reduced-motion` respected for all new FX (existing juice-kit gating).
- No new PostHog flags; existing candy-mechanic flags (`ccMechanicFlags`) untouched.
- Files ≤500 lines — `blastWaveConfig.ts` (733) and `clearTilesProcessor.ts` (538) are already over; new logic goes in new small modules (e.g., `lib/blast/waveRoster.ts`, `lib/blast/cascadeQuality.ts`, `lib/blast/mysteryTile.ts`), not appended to the giants.
- TDD mandatory (RED-GREEN-REFACTOR); pure logic unit-tested, FX components smoke-tested.

## Success criteria

1. Test asserts a single resolution cannot clear >40% of live cells.
2. Test asserts any wave's spawnable special set ≤ CORE + 2 featured.
3. Mystery tile outcomes deterministic per seed (test) and distribution matches weights (statistical test over seeds).
4. Jackpot tier visually distinct from lucky (component test: celebration fires only on jackpot).
5. Archetype hooks change engine numbers (unit test per archetype).
6. `npm run lint` 0 · targeted tests green · `npm run build` RC=0. New i18n keys present in all 6 locales.

## Risks

- **MP divergence** — highest risk; W1/W2 spawn+cascade rules must resolve the server-mirror question first (plan step 1). Fallback: SP-only gating.
- **DDA interplay** — roster filter must compose with Lucky Boost (filter after boost).
- **Balance regressions** — all new numbers are named constants in one place per workstream, tunable without logic edits.
- Existing tests may encode 3-clears-per-chain behavior — update tests only where the spec deliberately changes behavior (test-failure protocol respected: analyze first).
