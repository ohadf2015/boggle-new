# Blast v2 Playable — Design Spec

**Date:** 2026-05-14
**Branch:** `worktree-blast-v2-playable`
**Status:** Approved design, pre-implementation

## Goal

Make Blast v2 a genuinely playable, fun cascade word game in the style of *Word Stacks*:
letters stacked in columns, the player finds words, cleared tiles collapse under gravity,
and the collapse reveals/enables the next word. Ship 15 hand-authored English levels and
15 hand-authored Hebrew levels with rising difficulty. Hybrid aesthetic. Juicy animation
via PixiJS + GSAP + animate-ai.

## Core Mechanic: Forced Cascade Chain

Each level is an **ordered list of N words** ("the chain"). The board is constructed so that:

- At the start, **exactly one** word (word 1) can be formed as a valid straight-line selection.
- Finding word 1 removes its tiles → gravity collapse → word 2's letters fall into a
  selectable straight line.
- This repeats: word *k* is only formable after word *k-1* collapses.
- Clearing the last word empties the board → level win.

No word in the chain is reachable out of order. Cascade is the mechanic, not decoration.

Selection stays straight horizontal/vertical adjacent runs (existing `selection-state.ts`
behaviour — unchanged).

## Architecture

### Reuse (no change beyond integration)
- `lib/blast/v2/engine/collapse.ts` — gravity collapse + `rebuildTileIds()`
- `lib/blast/v2/engine/selection-state.ts` — drag/tap selection state machine
- `lib/blast/v2/engine/cascade.ts` — `detectAllCascades()` for "what's now formable"
- `lib/blast/v2/useBlastV2.ts` — main reducer + `tileIds` animation slice
- `lib/blast/v2/locales/he.ts` — Hebrew letter pool, final-form folding, RTL flag
- `lib/blast/v2/curated-pack-source.ts` + `level-source-registry.ts` — pack loading
- `components/blast/v2/BlastFxOverlay.tsx` — PixiJS particle FX layer
- `components/blast/v2/BlastAlmostGhost.tsx` — reused for cascade-reveal glow
- Feature gate in `app/[locale]/blast/page.tsx` — `?v2=force` + tester list (unchanged)

### New
1. **`lib/blast/v2/engine/chain-builder.ts`** — `buildChainLevel(spec)`. Takes an ordered
   word list + column count + decoy config, places words **backwards**: final word on the
   floor, then "un-collapse" (lift existing tiles up by the inserted word's footprint,
   scatter the previous word's letters above) for each earlier word. Backward construction
   guarantees the forward chain is forced and fully solvable. Output: a `BlastLevel`
   (columns of letters) + the canonical solution order.
2. **`lib/blast/v2/engine/chain-validator.ts`** — `validateChainLevel(level, solution)`.
   Replays the chain forward; at each step asserts the intended word is the *only* newly
   formable theme word (decoys must never form a theme word). Used in pack tests; every
   authored level must pass.
3. **`content/blast/packs/en/pack-chain-{01..15}.json`** — 15 English chain levels.
4. **`content/blast/packs/he/pack-chain-{01..15}.json`** — 15 Hebrew chain levels.
   Predefined Hebrew words, final-form folding via `he.ts`.
5. **Tile restyle** — `components/blast/v2/BlastTile.tsx` reworked to hybrid look.
6. **GSAP collapse timeline** — staggered tile-drop animation in `BlastBoard.tsx`
   driven by the existing `tileIds` slice.

## Level Authoring Format

Each pack JSON declares the *intent*, not the raw board. The build step / test fixture
runs `buildChainLevel` to produce the board, so authoring stays terse and always solvable:

```json
{
  "id": "en-chain-07",
  "theme": "animals",
  "locale": "en",
  "columns": 4,
  "decoyTiles": 2,
  "chain": ["CAT", "LION", "TIGER", "BEAR"]
}
```

`buildChainLevel` resolves `columns`/`decoyTiles`/`chain` → concrete `BlastLevel`.
`chain-validator` asserts the forced order. Pack loader (`curated-pack-source.ts`) gains a
small adapter to accept the chain-spec shape and expand it on load.

## Difficulty Curve (per language, 15 levels)

| Levels | Words in chain | Word length | Columns | Decoys |
|--------|----------------|-------------|---------|--------|
| 1–5    | 3              | 3–4         | 3–4     | 0      |
| 6–10   | 4              | 4–5         | 4–5     | 1–2    |
| 11–15  | 5              | 5–6         | 5–6     | 2–3    |

Decoy tiles are extra letters that collapse with the board but never complete a theme word
(validator enforces this). Hebrew curve mirrors the English curve with predefined Hebrew
words appropriate to each theme.

## Aesthetic: Hybrid

- **Tiles** (`BlastTile`): chunky, tactile, with depth (inner shadow / bevel) and a warm
  face — but neo-brutalist hard edge + solid border. Selection state uses the electric
  Blast accent (pink/cyan). Not wood-textured; brand-coherent.
- **HUD / chrome** (`BlastHud`, intro/complete cards): full neo-brutalist — dark navy,
  hard pixel shadows, Fredoka/Rubik. Matches the rest of LexiClash.

## Animation

- **Collapse:** GSAP timeline, per-tile staggered drop with ease-in + slight squash-on-land,
  driven by the existing `tileIds` slice so React state stays the source of truth.
- **Cascade reveal:** pulse-glow on the region of the now-enabled word (reuse
  `BlastAlmostGhost`) so the player sees what the collapse unlocked.
- **Word clear:** PixiJS particle burst via `BlastFxOverlay`; larger burst on level complete.
- **Micro-interactions:** animate-ai for tile press and selection-path feedback.
- All motion respects `prefers-reduced-motion` (existing pattern in the codebase).

## i18n

No hardcoded strings — all UI text via `t('key')`. New keys for any chain-specific UI go
in all 5 locales (en/he/sv/ja/es); HE/SV/JA/ES get AI translation flagged for native review.
Note: only EN + HE get authored level packs in v1; sv/ja/es fall back to the existing
generated level source.

## Testing (TDD, mandatory)

- `chain-builder.test.ts` — backward construction produces a board whose forward replay
  matches the input chain.
- `chain-validator.test.ts` — rejects levels where a word is formable out of order, or where
  a decoy forms a theme word.
- `pack-chain.test.ts` — loads all 30 authored packs, asserts each passes `validateChainLevel`.
- Component tests for restyled `BlastTile` and GSAP collapse integration.
- Playwriter end-to-end playtest on a real browser before declaring done.

## Phases

1. **Engine** — `chain-builder` + `chain-validator` (TDD).
2. **Content** — author 15 EN + 15 HE chain packs; all pass the validator.
3. **Visual** — hybrid `BlastTile` + HUD restyle.
4. **Animation** — GSAP collapse timeline, cascade-reveal glow, Pixi bursts.
5. **Wire + playtest** — integrate, Playwriter playtest, lint/test/build green.

## Out of Scope (v1)

- Authored packs for sv/ja/es (generated fallback stays).
- Removing the feature gate / making v2 the default.
- Multiplayer Blast changes.
- Chest / FTUE / unlock-card telemetry rework.
