# WordCraft Fun Spectacle — Design Spec

**Date:** 2026-05-26
**Scope:** WordCraft (classic / hot-seat / run / bot) + WordCraft "Gem Hunt" sub-mode
**Goal:** Make every word commit *feel* like a small event, escalating to "big moments" for big plays. Add drama to gem rarity collection, heat-state transitions, and ability-card pulls. Tighten UX clarity with a live score preview while placing tiles.

## Problem

WordCraft already has rich pieces (scoring, heat, gems, run, juice hooks, board-local Pixi stage). Every word commit currently runs the *same* `wordCommitWave` + `scoreConfetti` + GSAP `playerCommitReveal`, regardless of whether the player scored 6 points or 96. No moment-to-moment escalation = no payoff curve. Every gem collect uses the same fly-from-board burst, so a legendary gem feels identical to a common one. Heat states (Overdrive / Burnout) flip silently — text-only. Card picks open a panel with no visual flourish.

Net: the game has the engineering for "fun" wired up, but lacks the *orchestration*. Players never get the "OH YES" jolt that turns a single session into a habit.

## Out of scope

- Sound design overhaul (we reuse existing `playSfx` keys; no new audio)
- Multiplayer Pixi changes (this is single-player + hot-seat scope)
- New game modes
- Backend changes (purely client FX + state-derived orchestration)
- Mobile-native FX (Capacitor still skips `SharedFxApp`; board-local stage already works there)

## Architecture

Three pure, TDD'd resolvers + one orchestrator hook + Pixi scene additions. All FX route through the existing `WordCraftPixiStage` `SceneCtx` (board-local) or `SharedFxApp` (fullscreen drama). Cosy mode honored via existing `resolveCosyPreferences` + `celebrationScale`.

```
[useWordCraftGame commit] ──► [useSpectacle] ──► resolves tier ──► fires:
                                                                  ├─ Pixi scene (board)
                                                                  ├─ SharedFxApp (fullscreen, T4+)
                                                                  ├─ GSAP juice (existing)
                                                                  └─ playSfx (existing keys)
[useGemHunt collect] ─────► [useSpectacle.gemDrama] ──► fires above for rarity tier
[heat state change] ──────► [useSpectacle.heatBeat] ──► state-flip stamp + ember/ice
[card pick] ──────────────► [useSpectacle.cardPull] ──► fly-to-inventory + sparkle
```

## Components

### 1. `lib/word-craft/celebration/commitTier.ts` (pure, TDD)

```ts
export type CommitTier = 'soft' | 'nice' | 'great' | 'huge' | 'bingo';

export interface CommitContext {
  scoreThisTurn: number;          // total points this commit
  tilesPlaced: number;             // number of tiles placed this turn
  bingo: boolean;                  // tilesPlaced >= 7
  streak: number;                  // consecutive valid commits without a pass
  hasRareTile: boolean;            // any letter value >= 8 placed
  premiumTriggered: boolean;       // any TW/DW/TL/DL used
  heatLevel: number;               // 0-7
}

export function resolveCommitTier(ctx: CommitContext): CommitTier;
```

**Tier table (additive — highest matching wins):**
| Tier | Trigger | Visual budget |
|---|---|---|
| soft | score < 12, no premium | tile-place ripple only |
| nice | score 12-24 OR premium triggered | + commit wave + coin sparkle along path |
| great | score 25-49 OR (hasRareTile && score>=15) | + path-trace line + score-pop big + sound layer |
| huge | score 50-99 OR (streak>=3 && score>=30) | + word-stamp slam + screen-edge color flash + fullscreen burst |
| bingo | bingo OR score >= 100 | + aurora sweep + multi-stagger SharedFxApp fireworks + "BINGO!" stamp + screen shake (skipped in cosy) |

Streak counter lives in `useWordCraftGame` (new state field, resets on pass/invalid). Hot-seat: per-player streaks.

### 2. `lib/word-craft/celebration/gemDrama.ts` (pure, TDD)

```ts
export type GemDramaTier = 'common' | 'rare' | 'legendary';
export interface GemDramaPlan {
  tier: GemDramaTier;
  freezeFrameMs: number;       // 0 for common
  sharedFxPreset?: 'sparkle' | 'sparkle-gold' | 'celebration';
  soundKey?: string;
  inventoryPulse: boolean;
}
export function planGemDrama(gem: { rarity: GemRarity }): GemDramaPlan;
```

Common → existing fly-burst only. Rare → + sparkle preset on inventory chip + brief pulse. Legendary → 250ms freeze-frame (CSS `filter: brightness(1.3) contrast(1.2)` on board, paused via class), full `celebration` SharedFxApp preset, crown sparkle on inventory chip, `playSfx('coinCollect')` chain.

### 3. `lib/word-craft/celebration/heatTransition.ts` (pure, TDD)

```ts
export type HeatState = 'cold' | 'warm' | 'overdrive' | 'burnout';
export function detectTransition(prev: HeatState, next: HeatState): {
  beat: 'enter-overdrive' | 'exit-overdrive' | 'enter-burnout' | 'recover' | null;
};
```

Wired in `useWordCraftGame` heat reducer. New scene `lib/word-craft/pixi/scenes/heatBeat.ts` paints an ember-shower (overdrive) or ice-crack (burnout) over the board for ~600ms + DOM stamp ("OVERDRIVE!" / "BURNOUT!" oversized neo-brutalist text overlay, animated via existing `animate-neo-pop` + GSAP exit).

### 4. `lib/word-craft/celebration/scorePreview.ts` (pure, TDD)

```ts
export function previewScore(pendingTiles, board, axis): {
  score: number;
  tier: 'soft' | 'nice' | 'great' | 'huge' | 'bingo';
  bingoReady: boolean;
};
```

Reuses existing `scoreTurn`. Returns null if placement not yet valid (no full word formed). Rendered by new `<WordCraftScorePreviewBadge>` component anchored above the rightmost/topmost pending tile. Color shifts with tier. Cosy skips bingoReady pulse.

### 5. `lib/word-craft/celebration/useSpectacle.ts`

Orchestrator hook. Subscribes to `WordCraftPixiStage` `onReady` via existing pattern, plus a small event bus (`EventTarget` is fine — no new dep). Exposes:

```ts
const spectacle = useSpectacle({ ctx, mode: 'classic' | 'gems' | 'run' });
spectacle.fireCommit(commitContext, placedCellRects);
spectacle.fireGemCollect(gem, fromRect, toRect);
spectacle.fireHeatBeat(beat);
spectacle.fireCardPull(cardEl, inventoryEl);
```

Internally: calls resolvers → picks scenes → schedules. All scene calls are no-ops if `ctx.reducedMotion`.

### 6. New Pixi scenes

| File | LOC budget | Purpose |
|---|---|---|
| `lib/word-craft/pixi/scenes/pathTrace.ts` | ~120 | Sequential glow along placed cells + connecting line (Graphics) |
| `lib/word-craft/pixi/scenes/wordStampSlam.ts` | ~140 | Big tinted rect with word + score, slam-zoom in, hold 400ms, fade |
| `lib/word-craft/pixi/scenes/auroraSweep.ts` | ~110 | Bingo: gradient sweep across board, ParticleContainer sparkles |
| `lib/word-craft/pixi/scenes/heatBeat.ts` | ~130 | Ember rain (overdrive) or ice cracks (burnout), 600ms |
| `lib/word-craft/pixi/scenes/cardPullFanfare.ts` | ~100 | Gem Hunt shop: card-fly-to-inventory with sparkle trail |
| `lib/word-craft/pixi/scenes/screenEdgeFlash.ts` | ~70 | Brief colored vignette frame, T4+ |

All scenes follow the existing `(ctx, opts) => void` signature in `lib/word-craft/pixi/scenes/`. All accept `reducedMotion` from ctx → early-return.

### 7. `components/word-craft/WordCraftScorePreviewBadge.tsx`

Floating badge, position calculated via `useBoardCoords`. Tailwind neo styling: tier color background, hard-shadow, `animate-neo-pop` on tier change. Shows `+N` or `+N BINGO!`. Hidden when no valid pending word.

### 8. `components/word-craft/WordCraftHeatStamp.tsx`

DOM overlay (not Pixi — needs text + i18n). Mounted by `useSpectacle.fireHeatBeat`. Auto-unmounts after 1.2s. Position: dead center of board. Text from new translation keys:
- `wordcraft.heatStamp.enterOverdrive` = "OVERDRIVE!"
- `wordcraft.heatStamp.enterBurnout` = "BURNOUT!"
- `wordcraft.heatStamp.recover` = "REVIVED"

## Data flow

```
commit dispatched
 ↓
useWordCraftGame reducer (existing)
 ├─ computes scoreThisTurn, tilesPlaced (existing)
 ├─ NEW: tracks streak, prevHeatState
 └─ emits commit-event on internal event bus
 ↓
useSpectacle listener
 ├─ resolveCommitTier(ctx) → tier
 ├─ picks scenes by tier table
 ├─ HOT path: scene calls + GSAP + playSfx
 └─ (T4+): also calls SharedFxApp.spawnBurst('celebration', center)
 ↓
Pixi paints (board-local) + SharedFxApp paints (fullscreen) + DOM stamp mounts
```

Same flow for gem collect / heat transition / card pick.

## Cosy mode integration

`useSpectacle` reads `resolveCosyPreferences()`. When `cosyMode`:
- Tier ceiling clamped to `'great'` (no `huge`/`bingo` fullscreen drama — they collapse to `great` budget)
- All scene `intensity` multipliers wrapped via existing `celebrationScale()`
- `screenEdgeFlash` skipped entirely
- Heat stamps stay (informational) but use softer palette + no shake
- Score preview badge stays (informational, no FX)

## Error handling

- Pixi init already fails gracefully → `useSpectacle` checks `ctx?.app` before each call
- `SharedFxApp.isInitialized()` gate before fullscreen calls
- `playSfx` already silently no-ops on missing keys
- Resize during scene: ResizeObserver in stage handles app, scene Graphics positioned in relative units to current canvas dims (recomputed per-fire, not cached)
- Reducer streak: bounded by `Math.min(streak, 99)` to prevent runaway state

## Testing strategy

**TDD'd pure (Vitest):**
- `commitTier.test.ts` — every tier boundary + cosy clamp + streak override
- `gemDrama.test.ts` — rarity → plan mapping
- `heatTransition.test.ts` — every state-pair → expected beat
- `scorePreview.test.ts` — valid/invalid placement, bingo detection

**Component (Vitest + RTL):**
- `WordCraftScorePreviewBadge.test.tsx` — renders tier color, shows BINGO, hidden when invalid
- `WordCraftHeatStamp.test.tsx` — mounts text, auto-unmounts, i18n key resolution

**Integration (existing pattern, jsdom + mocked SceneCtx):**
- `useSpectacle.test.ts` — given mocked ctx, verifies which scene functions called per tier (spy-on-import pattern, no real Pixi)

**Not tested:**
- Pixi visual output (existing scenes also untested visually — consistent)
- GSAP timeline pixel outputs
- Screen flash visual

## Phasing

**Phase 1** — commit tier ladder
- `commitTier.ts` + tests
- `pathTrace.ts`, `wordStampSlam.ts`, `auroraSweep.ts`, `screenEdgeFlash.ts`
- `useSpectacle.ts` (commit only)
- Wire streak tracking into reducer
- Hook into existing commit fire site

**Phase 2** — gem rarity drama + heat transition beats
- `gemDrama.ts` + tests, `heatTransition.ts` + tests
- `heatBeat.ts` scene
- `WordCraftHeatStamp.tsx` component + i18n keys (en first, others to follow)
- Extend `useSpectacle` (gemDrama, heatBeat)
- Wire into `useGemHunt` collect + reducer heat-state diff

**Phase 3** — score preview + card-pull fanfare
- `scorePreview.ts` + tests
- `WordCraftScorePreviewBadge.tsx` + tests
- `cardPullFanfare.ts` scene
- Extend `useSpectacle` (cardPull)
- Wire into board placement + Gem Hunt shop

Each phase: tests green → lint clean → ask user for commit.

## Translations

New `wordcraft.*` keys (en first, then propagate):
- `heatStamp.enterOverdrive`, `heatStamp.enterBurnout`, `heatStamp.recover`
- `bingo` (already exists as concept — verify; otherwise add `commitBanner.bingo`)
- `scorePreview.bingoReady`

Other 4 locales (he/sv/ja/es) added via `/clean-translations` follow-up — same pattern as `wordcraft-tap-zoom-2026-05-25`.

## Success criteria

- A 60-point Triple-Word play feels visibly *different* from a 6-point play (different scene combo + color + sound layer + score-pop scale)
- A legendary gem collection is unmistakable (freeze-frame + fullscreen burst — eye-catch even peripheral)
- Player can see expected score *before* committing (kills hesitation cost)
- Cosy mode users experience escalation without painful fullscreen flash
- All resolver tests green, no test regressions, lint + build clean
- Existing reduced-motion gate keeps all FX off when honored
- No new dependency added (uses pixi.js, gsap, framer-motion already present)
