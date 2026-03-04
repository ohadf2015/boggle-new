# Phase 48: Combination System Core — Detection, Matrix, and Effects - Research

**Researched:** 2026-03-04
**Domain:** Blast Mode special tile combination logic — detection, 28-pair matrix, visual/audio effects layer
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMB-01 | Combination detection system — when a word path contains 2+ special tiles, a synergy effect triggers based on the tile pair | Extend `detectSpecialCombos` in `blastCombos.ts`; dispatch logic already wired in `clearTilesForWord` switch |
| COMB-02 | Full 28-pair combination matrix implemented with unique effects for every special tile pairing | 8 offensive tile types × pairs math = 28 unique pairs; each needs distinct game effect + label |
| COMB-03 | Combination effects visually distinct from individual tile effects (bigger particles, screen effects, unique audio stings) | `BlastExplosionLayer` uses explosion type + intensity; new `'combo'` explosion variants + screen-flash component needed |

</phase_requirements>

---

## Summary

Phase 48 builds the full combination system on top of Phase 47's tile rework. The detection infrastructure already exists in `blastCombos.ts` — it produces `SpecialCombo[]` that `clearTilesForWord` in `useBlastGame.ts` consumes via a switch on `combo.type`. The current `BlastComboType` union covers only 9 combo types (6 specific pairs + gold_special, rainbow_special, triple_special). Phase 48 must expand this to all 28 unique pairs from the 8 offensive tile types: Bomb, Lightning, Prism, Rainbow Boost, Mirror, Vortex (magnet), Treasure Gem (gem), Frost (frozen).

The game effect execution pattern is already proven: (1) `detectSpecialCombos` returns combos, (2) a switch executes game effects per combo, (3) `BlastExplosion` events feed into `BlastExplosionLayer` for visuals. Plan 48 adds 22 missing combo types to this exact pattern, plus a visual/audio elevation layer for all combos (48-04).

**Primary recommendation:** Keep all combo logic in `blastCombos.ts` (detection) + `clearTilesForWord` switch (execution), extend `BlastExplosion.type` union with combo-tier variants, and add a React `BlastComboFlash` component for screen-wide effects.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type safety for combo matrix | Project standard |
| React hooks | 18.x | State in `useBlastGame` | Existing hook architecture |
| Jest | 29.x | TDD for all combo effects | Project mandatory |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | (project version) | Screen flash / combo banner animations | Already used for cascade highlights in blast; use `AdaptiveMotion` wrapper |
| `useSoundEffects` context | internal | Audio stings per combo tier | Already provides `playComboSound(level)` — extend with combo-specific sting |
| `BlastExplosionLayer` | internal | Particle layer overlay | Already consumes `BlastExplosion[]` — add new explosion types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `BlastComboType` union | New separate enum | Union is already the pattern; adding to it is consistent |
| React screen flash component | Phaser scene flash | React flash is simpler; Phaser is only for tile-level effects; screen-level belongs in React |
| Single `combo` explosion for all pairs | Per-pair explosion colors | Per-pair colors give visual distinction (COMB-03 requirement) |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended File Structure for Phase 48
```
fe-next/components/blast/
├── utils/
│   ├── blastCombos.ts          # Extend: add 22 new BlastComboType entries + detection
│   └── __tests__/
│       └── blastCombos.test.ts # Extend: test all 28 pairs detected correctly
├── hooks/
│   └── useBlastGame.ts         # Extend: add 22 new cases to combo switch
├── __tests__/
│   └── useBlastGame.comboPairs.test.ts  # NEW: TDD for each combo's game effect
├── BlastComboFlash.tsx          # NEW: screen-wide visual flash for combos (48-04)
└── __tests__/
    └── BlastComboFlash.test.tsx # NEW: render tests for flash component
```

### Pattern 1: Combo Type Extension
**What:** Add all 28 pair names to `BlastComboType` union and `PAIR_COMBOS` array in `blastCombos.ts`
**When to use:** Before implementing effects — detection must exist first (RED phase)

The 8 offensive tile types eligible for combination (excludes ice, gold/silver/diamond which are pure multipliers/obstacles):
- Bomb, Lightning, Prism, Rainbow Boost (`rainbow`), Mirror (`mirror`), Vortex (`magnet`), Treasure Gem (`gem`), Frost (`frozen`)

28 pairs = C(8,2) = 28:
1. bomb + lightning (EXISTS)
2. bomb + prism (EXISTS)
3. bomb + rainbow
4. bomb + mirror
5. bomb + magnet (vortex)
6. bomb + gem
7. bomb + frozen (frost)
8. lightning + prism (EXISTS)
9. lightning + rainbow
10. lightning + mirror
11. lightning + magnet
12. lightning + gem
13. lightning + frozen
14. prism + rainbow
15. prism + mirror
16. prism + magnet
17. prism + gem
18. prism + frozen
19. rainbow + mirror
20. rainbow + magnet
21. rainbow + gem
22. rainbow + frozen
23. mirror + magnet
24. mirror + gem
25. mirror + frozen
26. magnet + gem
27. magnet + frozen
28. gem + frozen
29. bomb + bomb (EXISTS — same-type)
30. lightning + lightning (EXISTS — same-type)
31. prism + prism (EXISTS — same-type)

Note: same-type pairs (mirror+mirror, rainbow+rainbow, magnet+magnet, gem+gem, frozen+frozen) add 5 more but are not required by COMB-02 which specifies 28 distinct pairs. The 28-pair count in requirements likely refers to the C(8,2) distinct pairs. Same-type combos for remaining 5 types are bonus.

**Example:**
```typescript
// Source: fe-next/components/blast/utils/blastCombos.ts (existing pattern to extend)
export type BlastComboType =
  | 'bomb_bomb'
  | 'bomb_lightning'
  | 'bomb_prism'
  | 'bomb_rainbow'
  | 'bomb_mirror'
  | 'bomb_magnet'
  | 'bomb_gem'
  | 'bomb_frozen'
  | 'lightning_lightning'
  | 'lightning_prism'
  | 'lightning_rainbow'
  | 'lightning_mirror'
  | 'lightning_magnet'
  | 'lightning_gem'
  | 'lightning_frozen'
  | 'prism_prism'
  | 'prism_rainbow'
  | 'prism_mirror'
  | 'prism_magnet'
  | 'prism_gem'
  | 'prism_frozen'
  | 'rainbow_mirror'
  | 'rainbow_magnet'
  | 'rainbow_gem'
  | 'rainbow_frozen'
  | 'mirror_magnet'
  | 'mirror_gem'
  | 'mirror_frozen'
  | 'magnet_gem'
  | 'magnet_frozen'
  | 'gem_frozen'
  | 'gold_special'
  | 'rainbow_special'
  | 'triple_special';
```

### Pattern 2: Combo Matrix Split (Plans 48-02 and 48-03)
**What:** Split 28 pairs across two plans to stay under 500-line file limit
**When to use:** Plan 48-02 handles Bomb, Lightning, Prism, Rainbow-involving pairs (well-understood explosion effects). Plan 48-03 handles Mirror, Vortex, Frost, Gem involving pairs (newer reworked mechanics).

### Pattern 3: Visual Elevation via BlastExplosion intensity + new type
**What:** Combo explosions use intensity: 4 (maximum) and combo-specific `type` values in `BlastExplosion`
**When to use:** All combo game effects push a new explosion event; `BlastExplosionLayer` maps type to color

Current explosion types: `'word' | 'bomb' | 'clear' | 'cascade' | 'lightning' | 'magnet' | 'prism' | 'gem' | 'combo' | 'mega_blast' | 'total_destruction'`

New types needed for phase 48: `'combo_rainbow'`, `'combo_mirror'`, `'combo_frost'`, `'combo_vortex'` (or reuse `'combo'` with different colors by combo tier — simpler approach).

**Simpler approach (recommended):** Reuse `'combo'` type with the existing orange, but set intensity: 4 always. Add a separate `BlastComboFlash` React component for screen-wide flash that triggers on any combo. This avoids extending the explosion type union.

### Pattern 4: Screen Flash Component (Plan 48-04)
**What:** `BlastComboFlash` — renders a full-screen color overlay that fades out in ~400ms
**When to use:** Every time `detectedCombos.length > 0` in `clearTilesForWord`

```typescript
// NEW: fe-next/components/blast/BlastComboFlash.tsx
// Triggered via new state in useBlastGame: activeComboFlash: { color: string, id: string } | null
// Component: absolute inset-0 div with pointer-events-none, z-40
// Animation: opacity 0.6 → 0 over 400ms using Framer Motion
// Color mapped from combo tier (see ComboTier below)
```

### Pattern 5: Combo Tier Coloring
**What:** 3-tier color system for combo intensity
**When to use:** Both `BlastComboFlash` and `BlastExplosionLayer` score popup glow

```typescript
// Tier 1 (moderate combos): cyan #00FFFF — bomb+lightning, bomb+mirror, etc.
// Tier 2 (powerful combos): orange #FF6B35 — prism+*, rainbow+*, mirror+*
// Tier 3 (ultimate combos): rainbow gradient — prism+prism, prism+rainbow, gem+frozen
```

### Anti-Patterns to Avoid
- **Adding combo game effects directly to individual tile `case` blocks:** All combo effects live in the combo switch BEFORE the path loop. The combo pre-clear runs first; individual tile cases run after. Mixing these causes double-application.
- **Forgetting processedBombs/processedLightning:** Any combo that detonates a bomb must add to `processedBombs` Set before the path loop, or the bomb will fire twice (BUGF-03 pattern).
- **Reordering combo detection after path loop:** `detectSpecialCombos(path, next)` must be called BEFORE tiles are cleared in the path loop — it reads tile types from un-cleared state.
- **Making `blastCombos.ts` > 500 lines:** The file is currently 135 lines. With 28 pair definitions, it may approach the limit. Keep definitions data-only; move helper functions out if needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combo detection scanning | Custom path scan in useBlastGame | `detectSpecialCombos` in `blastCombos.ts` | Already proven, tested, pure function |
| Score multiplier accumulation | Custom multiplication | `comboMultiplier` pattern already in useBlastGame (line 665) | Re-entrancy safe, single pass |
| Bomb detonation BFS | Inline BFS loop | `bombQueue` + `processedBombs` pattern (line 656) | Prevents double-detonation (BUGF-03) |
| Lightning chain guard | Check in loop | `processedLightning` Set (line 661) | Prevents double column-clear (46-02 fix) |
| Animation rendering | Custom canvas/SVG | `ExplosionEffect` component via `BlastExplosionLayer` | Already positions, colors, and unmounts particles |
| Screen flash overlay | Phaser graphics | Simple React div + Framer Motion opacity tween | Screen-level effects are React's domain; Phaser is tile-level |

**Key insight:** The combo execution infrastructure (BFS queues, processedSets, markCleared helper, hitMultiHitTile helper, bonusScore accumulation) is already built and debugged in `clearTilesForWord`. Phase 48 only adds new `case` blocks using this infrastructure — it does not re-architect the system.

---

## Common Pitfalls

### Pitfall 1: Double-Application of Combo vs Individual Tile Effects
**What goes wrong:** A `bomb_rainbow` combo fires the bomb effect in the combo switch, then the bomb's `case 'bomb'` also fires in the path loop, resulting in 3x bomb detonations.
**Why it happens:** Combo effects run as pre-clear; tile cases run during path traversal; both execute.
**How to avoid:** After combo pre-clear, add bomb/lightning tile coords to `processedBombs`/`processedLightning` (see lines 730-735 in useBlastGame.ts — the BUGF-03 fix pattern). For combos involving Rainbow/Mirror, the combo defines a DIFFERENT unique effect from the individual tile's effect (Rainbow and Mirror already fire their individual effects separately). The combo effect should be something additional/unique, not a re-fire.
**Warning signs:** Tests show 3 bomb explosions when only 2 expected.

### Pitfall 2: detectSpecialCombos Called on Already-Cleared Tiles
**What goes wrong:** If combo detection is moved after partial path clearing, tiles cleared in earlier path iterations won't be detected.
**Why it happens:** The `next` tile state starts as a copy of current state; tiles get marked cleared as the path loop runs.
**How to avoid:** `detectSpecialCombos(path, next)` is called ONCE before the path loop starts (line 664). This is the correct position — never move it into or after the loop.
**Warning signs:** Combo detection returns empty for tiles that should combo.

### Pitfall 3: 28-Pair Naming Convention Collision
**What goes wrong:** `bomb_rainbow` and `rainbow_special` both detect when bomb + rainbow are in path; both fire.
**Why it happens:** The existing `rainbow_special` catch-all fires for any rainbow + EFFECT_TILES pair. The new specific `bomb_rainbow` combo would also fire.
**How to avoid:** The new phase 48 combos must replace (or be ordered before) the generic `rainbow_special`/`gold_special` catch-alls. Solution: after adding specific pairs, remove the generic `rainbow_special` and `gold_special` types, OR make the specific pairs take priority by checking if a specific pair was already detected before falling through to generic.
**Warning signs:** `detectedCombos` array has both specific and generic combo for same tile pair.

### Pitfall 4: File Size Violation
**What goes wrong:** `blastCombos.ts` or `useBlastGame.ts` exceeds 500 lines (project hard limit per CLAUDE.md).
**Why it happens:** Adding 22 new PAIR_COMBOS entries + 22 new switch cases is ~200 lines minimum.
**How to avoid:** `useBlastGame.ts` is already ~1,400 lines — it needs splitting or extraction of the combo execution switch into `blastComboEffects.ts`. Alternatively, the combo switch cases can live in a separate `executeComboEffect(combo, next, gridSize, ...)` function in `blastCombos.ts`.
**Warning signs:** TypeScript errors if import splits don't resolve correctly.

### Pitfall 5: Audio sting missing for combo (COMB-03 requirement)
**What goes wrong:** Visuals work but no audio distinction from individual tile clears.
**Why it happens:** `playComboSound(level)` exists in `SoundEffectsContext` but only fires for consecutive-word combos, not for special tile synergies.
**How to avoid:** In `clearTilesForWord`, when `detectedCombos.length > 0`, dispatch a callback (similar to existing `onAutoCascadeWord` pattern) up to `BlastGame.tsx` where `playComboSound` can be called. Alternatively, `useBlastGame` can accept an `onComboDetected` callback prop.
**Warning signs:** COMB-03 acceptance test shows no audio sting on combo submission.

---

## Code Examples

Verified patterns from the codebase:

### Combo Detection (existing — extend this)
```typescript
// Source: fe-next/components/blast/utils/blastCombos.ts lines 33-45
const PAIR_COMBOS: Array<{
  a: BlastTileType;
  b: BlastTileType;
  comboType: BlastComboType;
  scoreMultiplier: number;
}> = [
  { a: 'prism',     b: 'prism',     comboType: 'prism_prism',     scoreMultiplier: 10 },
  { a: 'lightning', b: 'prism',     comboType: 'lightning_prism', scoreMultiplier: 6 },
  // ... add 22 more entries here
];
```

### Combo Execution Pattern (existing — add cases)
```typescript
// Source: fe-next/components/blast/hooks/useBlastGame.ts lines 663-738
const detectedCombos = detectSpecialCombos(path, next);
let comboMultiplier = 1;
if (detectedCombos.length > 0) {
  for (const combo of detectedCombos) {
    comboMultiplier *= combo.scoreMultiplier;
    switch (combo.type) {
      case 'bomb_bomb': { /* 5x5 mega explosion */ break; }
      // ... 22 new cases here for Phase 48
    }
    // CRITICAL: mark bomb tiles from combo as processed
    for (const tile of combo.tiles) {
      if (tile.tileType === 'bomb') processedBombs.add(`${tile.row},${tile.col}`);
    }
  }
  bonusScore += baseScore * (comboMultiplier - 1);
}
```

### Screen Flash (new pattern for 48-04)
```typescript
// NEW: fe-next/components/blast/BlastComboFlash.tsx
// Pattern mirrors cascade highlight component
interface BlastComboFlashProps {
  activeFlash: { id: string; color: string } | null;
  onComplete: (id: string) => void;
}
// Render: AnimatePresence + motion.div absolute inset-0 pointer-events-none z-40
// opacity: 0.5 -> 0 over 400ms
```

### processedBombs Guard (must follow this pattern in every new combo)
```typescript
// Source: fe-next/components/blast/hooks/useBlastGame.ts lines 730-735
for (const tile of combo.tiles) {
  if (tile.tileType === 'bomb') {
    processedBombs.add(`${tile.row},${tile.col}`);
  }
}
// This prevents BUGF-03 (double bomb BFS) when a bomb is in the combo
// AND also fired by individual tile case in the path loop below
```

### Test Scaffolding Pattern (follow exactly)
```typescript
// Source: fe-next/components/blast/__tests__/useBlastGame.chainPropagation.test.ts
// Pattern: render useBlastGame in renderHook, call clearTilesForWord, assert tileStates
import { renderHook, act } from '@testing-library/react';
import { useBlastGame } from '../hooks/useBlastGame';

it('should fire combined effect for bomb_rainbow', async () => {
  const { result } = renderHook(() => useBlastGame(testConfig));
  // Wait for grid init
  await waitFor(() => expect(result.current.grid).not.toBeNull());
  // Inject known tile states via act
  act(() => { /* set tileStates with bomb at [0,0] and rainbow at [0,2] */ });
  act(() => result.current.clearTilesForWord(path, 'WORD', 3));
  // Assert game state changes
  expect(result.current.gameState.score).toBeGreaterThan(baseline);
});
```

---

## Proposed 28-Pair Combination Matrix

Suggested game effects for all 28 pairs (planner uses these for task specs):

| Pair | Combo Name | Game Effect | Score Multiplier |
|------|-----------|-------------|-----------------|
| bomb + lightning | Thunderclap | Bomb 3x3 + all columns of word path cleared | 4 (exists) |
| bomb + prism | Crucible | Each of bomb's 3x3 neighbors fires a cross-clear | 5 (exists) |
| bomb + rainbow | Prism Bomb | Bomb fires in all 4 compass directions (cross-clear + 3x3) | 4 |
| bomb + mirror | Twin Explosion | Two 3x3 bomb blasts at mirror and bomb positions | 4 |
| bomb + magnet (vortex) | Gravity Bomb | Vortex pulls + bombs everything in 5x5 radius | 5 |
| bomb + gem | Gem Burst | Bomb clears 3x3, each cleared tile drops +1 bonus score | 4 |
| bomb + frozen (frost) | Cryo Blast | Bomb + all frost tiles on board take 1 crack hit | 3 |
| lightning + prism | Storm Lattice | All rows AND columns of both tiles cleared (2 full crosses) | 6 (exists) |
| lightning + rainbow | Rainbow Strike | Lightning clears all columns of ALL rainbow tiles on board | 5 |
| lightning + mirror | Double Strike | Two column clears (mirror + lightning columns) | 4 |
| lightning + magnet | Magnetic Storm | Vortex pull + lightning clears columns of all pulled tiles | 5 |
| lightning + gem | Shatter Strike | Lightning + gem completes instantly (awards bonus without 3 hits) | 4 |
| lightning + frozen | Permafrost | Lightning column-clear + all frost tiles advance 1 hit | 3 |
| prism + rainbow | Aurora | Full board cross-clear (row + column) of all tiles in word path | 7 |
| prism + mirror | Twin Cross | Two full cross-clears from prism position | 6 |
| prism + magnet | Vortex Lattice | Vortex pull + full cross-clear | 6 |
| prism + gem | Crystal Lattice | Cross-clear + gem completes instantly | 5 |
| prism + frozen | Frost Lattice | Cross-clear + all frost tiles freed (innerType activates) | 4 |
| rainbow + mirror | Kaleidoscope | Mirror doubles Rainbow's amplification (best special fires 3x) | 5 |
| rainbow + magnet | Whirlwind | Rainbow Boost applies to vortex: vortex radius doubled (3→3) | 4 |
| rainbow + gem | Lucky Boost | Rainbow solo multiplier applied to full gem completion bonus | 4 |
| rainbow + frozen | Frost Bloom | Rainbow solo multiplier + all frost tiles revealed (cracked) | 3 |
| mirror + magnet | Dual Vortex | Two vortex pull+explode from mirror and magnet positions | 5 |
| mirror + gem | Twin Gems | Mirror doubles gem completion: 2x bonus + 4 specials spawned | 5 |
| mirror + frozen | Mirror Frost | Mirror doubles frost reveal bonus; inner special fires twice | 4 |
| magnet + gem | Gem Suction | Vortex pulls ALL gem shards on board to center + completes them | 5 |
| magnet + frozen | Frost Vortex | Vortex pull + all frost tiles advance 1 hit | 4 |
| gem + frozen | Crystal Prison | Gem completes + frost reveals simultaneously; both bonuses | 4 |
| bomb + bomb | Mega Blast | 5x5 area explosion | 3 (exists) |
| lightning + lightning | Double Strike | All columns in word path cleared | 4 (exists) |
| prism + prism | Total Destruction | Entire board cleared | 10 (exists) |

Note: Effects labeled "exists" are already implemented. The planner should allocate plan 48-02 for Bomb/Lightning/Prism pairs, plan 48-03 for Mirror/Vortex/Frost/Gem pairs.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic `rainbow_special`/`gold_special` catch-alls | Specific named pairs per PAIR_COMBOS | Phase 48 | Must deprecate/replace catch-alls or order specific pairs first |
| 9 combo types (BlastComboType) | 28+ named pair combos | Phase 48 | Significantly more expressive combo system |
| `comboMultiplier` single value | Same (accumulate all combo multipliers) | No change | Pattern still correct for Phase 48 |
| Combo visuals via `'combo'` explosion type | Tiered visual system with screen flash | Phase 48 | Satisfies COMB-03 distinction requirement |

**Deprecated/outdated:**
- `rainbow_special`: Generic catch-all — specific pairs (rainbow+bomb, rainbow+lightning, etc.) must precede or replace it. The generic can remain as fallback for unlisted rainbow pairs if desired.
- `gold_special`: Same — should be retained as a fallback since gold/silver/diamond are score multipliers, not in the 28-pair matrix. The 28 pairs only involve the 8 offensive effect tiles.

---

## Open Questions

1. **Generic catch-alls: replace or retain?**
   - What we know: `rainbow_special` and `gold_special` fire for ANY rainbow/gold + effect tile pair
   - What's unclear: If specific pairs (bomb_rainbow, etc.) are added, both specific AND generic will fire for same combination
   - Recommendation: Make specific pairs take priority. In `detectSpecialCombos`, skip `rainbow_special`/`gold_special` if a more specific pair already detected for those tiles. OR replace them: the 28-pair matrix is the new exhaustive definition.

2. **File size: useBlastGame.ts is ~1,400 lines**
   - What we know: 22 new switch cases (~15 lines each) = ~330 more lines; will exceed 500 if not split
   - What's unclear: Whether to extract the combo execution switch into a separate util or split `useBlastGame.ts`
   - Recommendation: Extract combo effects into `blastComboEffects.ts` that exports `executeComboEffect(combo, context)`. Context object carries `next`, `gridSize`, `processedBombs`, `processedLightning`, `bombQueue`, `markCleared`, `hitMultiHitTile`, `bonusScore`. This keeps `useBlastGame.ts` under 500 lines and keeps combo logic testable in isolation.

3. **Audio stings**
   - What we know: `playComboSound(level)` exists for consecutive-word combos; no special-tile-synergy audio exists
   - What's unclear: Whether a new sound hook or extending existing is preferable
   - Recommendation: Add `onSynergyDetected?: (comboType: BlastComboType) => void` callback to `UseBlastGameOptions`. BlastGame.tsx passes a handler that calls `playComboSound(3)` (max level) for all synergies. This requires no new audio files for MVP; distinctive audio can be added later.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 with `@testing-library/react` |
| Config file | `fe-next/jest.config.ts` |
| Quick run command | `npx jest --testPathPattern="blastCombos|useBlastGame.comboPairs" --no-coverage` |
| Full suite command | `npx jest --testPathPattern="blast" --no-coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMB-01 | 2+ special tiles in word always triggers combo | unit | `npx jest blastCombos --no-coverage` | Partial (9 combos exist) |
| COMB-01 | All 28 pairs detected by `detectSpecialCombos` | unit | `npx jest blastCombos --no-coverage` | Partial — needs 22 more |
| COMB-02 | Each of 22 new pairs has distinct game effect | unit | `npx jest useBlastGame.comboPairs --no-coverage` | No — Wave 0 gap |
| COMB-02 | No two pairs produce identical outcomes | unit | `npx jest useBlastGame.comboPairs --no-coverage` | No — Wave 0 gap |
| COMB-03 | Combo explosions have intensity 4 (vs single-tile 2-3) | unit | `npx jest BlastComboFlash --no-coverage` | No — Wave 0 gap |
| COMB-03 | `BlastComboFlash` renders on combo trigger | unit | `npx jest BlastComboFlash --no-coverage` | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="blast" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `fe-next/components/blast/__tests__/useBlastGame.comboPairs.test.ts` — covers COMB-02 (22 new pairs)
- [ ] `fe-next/components/blast/__tests__/BlastComboFlash.test.tsx` — covers COMB-03 visual distinction
- [ ] `fe-next/components/blast/BlastComboFlash.tsx` — new screen flash component
- [ ] `fe-next/components/blast/utils/blastComboEffects.ts` — extracted effect executor (if file-size split needed)

---

## Sources

### Primary (HIGH confidence)
- `fe-next/components/blast/utils/blastCombos.ts` — complete source for detection architecture
- `fe-next/components/blast/hooks/useBlastGame.ts` — complete source for effect execution pattern and processedBombs/Lightning guards
- `fe-next/components/blast/types.ts` — `BlastExplosion` type, `BlastComboEvent` type
- `fe-next/components/blast/BlastExplosionLayer.tsx` — existing visual layer
- `.planning/REQUIREMENTS.md` — COMB-01/02/03 definitions
- `fe-next/CLAUDE.md` — 500-line file limit, TDD mandatory, translation requirement

### Secondary (MEDIUM confidence)
- Phase 47 PLANs (47-01 through 47-05) — established patterns for Rainbow Boost, Mirror, Frost, Vortex
- Memory context: Phase 47 complete; all 8 offensive tile types now implemented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns are from existing codebase
- Architecture: HIGH — detection/execution pattern is proven and well-documented in source
- 28-pair matrix effects: MEDIUM — specific effect choices (e.g., "bomb+rainbow fires cross-clear + 3x3") are design decisions, not discovered facts; planner may adjust
- File size risk: HIGH confidence there IS a risk — useBlastGame.ts is already ~1,400 lines

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable internal codebase; no external dependencies)
