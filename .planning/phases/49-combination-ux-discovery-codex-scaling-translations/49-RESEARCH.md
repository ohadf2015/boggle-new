# Phase 49: Combination UX — Discovery, Codex, Scaling, Translations - Research

**Researched:** 2026-03-04
**Domain:** Blast Mode combination UX — discovery callout, Codex screen, word-length scaling, i18n
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMB-04 | Combo Discovery callout — first time any combination fires, brief gameplay freeze (300ms) + "COMBO DISCOVERED: [name]!" banner with unique icon | New `discoveredCombos: Set<BlastComboType>` state in `useBlastGame`; new `BlastComboDiscovery` banner component; 300ms delay via `setTimeout` |
| COMB-05 | Combo Codex collectible screen — tracks discovered combos (e.g. "12/28 combos discovered") accessible from Blast mode menu | New `BlastCodexModal` component + button on `BlastReadyScreen`; discovered state persisted via `localStorage` (or in-memory for MVP) |
| COMB-06 | Word-length scaling for tile effects — 3-4 letter word = base effect; 5-6 = 1.5x effect; 7+ = 2x effect | New `getWordLengthScaleFactor(wordLength)` util; pass `wordLength` into `ComboEffectContext`; apply to radius/column-count in `blastComboEffects.ts` |
| COMB-07 | Combination names and descriptions translated in all 4 languages (EN, HE, SV, JA) | Add 22 missing combo names + 6 new COMB-04/05 keys to `blast.combo.*` in all 4 translation files |

</phase_requirements>

---

## Summary

Phase 48 built the full 28-pair combination system with detection, game effects, and a tier-based screen flash. Phase 49 adds the player-facing UX layer on top: players discover combos for the first time with a dramatic banner freeze, browse their discovery progress in a Codex screen, get rewarded for using longer words (which amplify effect radius/column count), and see all combination text in their language.

The infrastructure is already ideal for these additions. `useBlastGame` exports `activeComboFlash` and `onSynergyDetected` (phase 48). Discovery state is a natural extension: add a `discoveredCombos: Set<BlastComboType>` to the blast hook (or lifted to `BlastView` for persistence across waves), check on each combo detection whether it is new, and if so set a separate `pendingDiscovery` state that triggers the banner. The Codex screen is a modal on `BlastReadyScreen` showing all 28+3 combo pairs with discovered/undiscovered states.

Word-length scaling applies a multiplier to the physical parameters of effects (bomb radius, lightning column count, vortex radius) rather than to score — score is already multiplied by `scoreMultiplier`. The scaling factor is a pure function of word length: 1.0 for 3-4 letters, 1.5 for 5-6, 2.0 for 7+. The `ComboEffectContext` already bundles all effect parameters — adding `wordLengthScale: number` is a one-line change to the type plus passing `path.length` from `useBlastGame`.

Translations: 9 combo names exist in all 4 languages (en, he, sv, ja). Phase 48 added 22 more combo types to the union but did NOT add their translation keys. Phase 49 adds those 22 keys plus new discovery/codex UI keys across all 4 files.

**Primary recommendation:** Four focused plans — (1) Discovery callout state + banner component, (2) Codex modal + ReadyScreen button, (3) Word-length scaling in ComboEffectContext, (4) Translation completeness pass for all combo names and new UI keys.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type safety for new state | Project standard |
| React hooks | 18.x | `discoveredCombos` state, `pendingDiscovery` state | Existing hook architecture |
| Framer Motion | project | Discovery banner animation | Already used in `BlastComboFlash`, `BlastCascadeHighlight` |
| Jest 29 | project | TDD mandatory | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `localStorage` | browser | Persist discovered combos across sessions | Codex persistence; wrap in try/catch for SSR safety |
| `AdaptiveMotion` / `AdaptiveAnimatePresence` | internal | Motion wrapper respecting reduced motion | Already the project pattern for motion components |
| Lucide React | project | Combo Codex icon per tile type | Already imported throughout; `Zap`, `Bomb`, `Snowflake`, etc. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `localStorage` for Codex persistence | Supabase user profile (SYNC-04) | SYNC-04 is out of scope for phase 49; localStorage is sufficient MVP; upgrade path is clear |
| Per-combo icon in Codex | Tile color dot | Icons are more legible and match the project's visual language |
| Scaling radius with float math | Separate scaled-radius constants | Pure function `getWordLengthScaleFactor` is simpler and testable |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended File Structure for Phase 49
```
fe-next/components/blast/
├── BlastComboDiscovery.tsx          # NEW: "COMBO DISCOVERED: [name]!" banner
├── BlastCodexModal.tsx              # NEW: Combo Codex overlay from ReadyScreen
├── __tests__/
│   ├── BlastComboDiscovery.test.tsx # NEW: TDD for discovery banner
│   └── BlastCodexModal.test.tsx     # NEW: TDD for codex
├── hooks/
│   └── useBlastGame.ts              # MODIFY: add discoveredCombos, pendingDiscovery state
├── utils/
│   ├── blastComboScaling.ts         # NEW: getWordLengthScaleFactor + TOTAL_COMBO_COUNT
│   ├── __tests__/
│   │   └── blastComboScaling.test.ts # NEW: TDD for scaling util
│   ├── blastComboEffects.ts         # MODIFY: accept wordLengthScale in ComboEffectContext
│   └── blastComboEffectsTactical.ts # MODIFY: apply wordLengthScale in radius calculations
└── BlastReadyScreen.tsx             # MODIFY: add "Codex" button
translations/
├── en.js   # MODIFY: add 22 new combo names + discovery/codex UI keys
├── he.js   # MODIFY: same
├── sv.js   # MODIFY: same
└── ja.js   # MODIFY: same
```

### Pattern 1: Discovery State in useBlastGame
**What:** Track which combo types have fired before; on first detection, queue a discovery banner.
**When to use:** Inside the `clearTilesForWord` callback, after `detectedCombos` loop.

```typescript
// NEW state in useBlastGame
const [discoveredCombos, setDiscoveredCombos] = useState<Set<BlastComboType>>(() => {
  // Load from localStorage (SSR-safe)
  try {
    const stored = localStorage.getItem('blast_discovered_combos');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
});
const [pendingDiscovery, setPendingDiscovery] = useState<BlastComboType | null>(null);

// In clearTilesForWord, after combo execution:
const newlyDiscovered = detectedCombos
  .map(c => c.type)
  .filter(t => !discoveredComboSetRef.current.has(t));
if (newlyDiscovered.length > 0) {
  const first = newlyDiscovered[0]; // show one discovery banner at a time
  setPendingDiscovery(first);
  setDiscoveredCombos(prev => {
    const next = new Set(prev);
    next.add(first);
    // Persist all new discoveries
    try { localStorage.setItem('blast_discovered_combos', JSON.stringify([...next])); } catch {}
    return next;
  });
}
```

**Ref pattern critical:** `discoveredComboSetRef` mirrors `discoveredCombos` (same as `tileStatesRef` pattern used for BUGF-07). The `setDiscoveredCombos` state setter closes over stale `discoveredCombos` in async callbacks — the ref is always fresh.

### Pattern 2: Discovery Banner (300ms freeze)
**What:** `BlastComboDiscovery` component renders a full-overlay banner. "Freeze" is implemented by `isDiscoveryShowing` state that blocks `clearTilesForWord` submission + disables grid input.
**When to use:** When `pendingDiscovery !== null` in `BlastGame.tsx`.

The "gameplay freeze" (COMB-04: 300ms) does NOT need Phaser `timeScale` manipulation. The grid already has an `isAutoDetecting` gate that blocks input during cascades. The same mechanism works: set `isDiscovering: boolean` state that the grid checks before allowing new word submissions. The banner auto-dismisses after a timeout.

```typescript
// BlastComboDiscovery.tsx
interface BlastComboDiscoveryProps {
  pendingDiscovery: BlastComboType | null;
  onComplete: () => void;
}
// Renders: AnimatePresence + motion.div absolute inset-0 z-50
// Layout: icon (center) + "COMBO DISCOVERED" label + combo name
// Animation: scale 0.5→1 (spring) then auto-dismiss after 1800ms
// 300ms freeze: parent blocks input while `pendingDiscovery !== null`
```

Duration breakdown: 300ms freeze (COMB-04 spec) + 1500ms banner display = 1800ms total. The "300ms brief freeze" from COMB-04 is the initial display before the player can interact. Full banner can stay longer — the grid remains blocked while the banner is visible, then `onComplete` re-enables input.

### Pattern 3: Combo Codex Modal
**What:** A full-screen modal (or overlay sheet) accessible from `BlastReadyScreen` showing all combo pairs in a grid with discovered/undiscovered states.
**When to use:** User taps "Codex" button on ready screen.

```typescript
// BlastCodexModal.tsx
interface BlastCodexModalProps {
  discoveredCombos: Set<BlastComboType>;
  isOpen: boolean;
  onClose: () => void;
}
// Header: "COMBO CODEX  12/28 combos discovered"
// Body: Grid of combo cards — discovered show name + icon, undiscovered show "???"
// Design: neo-brutalist card grid, 2-column layout, border-neo, shadow-hard-sm
// Close: X button top-right, or tap outside
```

The total combo count shown in the Codex header: PAIR_COMBOS has 30 entries (28 unique pairs + bomb_bomb + lightning_lightning + prism_prism). Plus the catch-all types `gold_special`, `rainbow_special`, `triple_special` = 33 total. For COMB-05's "12/28" spec, the intended count is the 28 C(8,2) unique pairs from the matrix. Use a constant `CODEX_COMBO_COUNT = 28` and filter `PAIR_COMBOS` to the first 28 (excluding same-type duplicates in the same-type rows already counted, and excluding catch-alls).

Simplest implementation: export `CODEX_COMBOS: BlastComboType[]` from `blastCombos.ts` — all 28 pairs that appear in the Codex (excludes `gold_special`, `rainbow_special`, `triple_special`).

### Pattern 4: Word-Length Scaling
**What:** Multiply physical effect parameters by a scale factor: `1.0` (3-4 letters), `1.5` (5-6), `2.0` (7+).
**When to use:** In `blastComboEffects.ts` and `blastComboEffectsTactical.ts` wherever `BOMB_RADIUS`, `VORTEX_PULL_RADIUS`, and column/row ranges are used.

```typescript
// NEW: fe-next/components/blast/utils/blastComboScaling.ts
export function getWordLengthScaleFactor(wordLength: number): number {
  if (wordLength >= 7) return 2.0;
  if (wordLength >= 5) return 1.5;
  return 1.0;
}

/** Scale an integer radius up, rounding up for 1.5x */
export function scaledRadius(base: number, scaleFactor: number): number {
  return Math.ceil(base * scaleFactor);
}
```

**ComboEffectContext extension:**
```typescript
// In blastComboEffects.ts
export interface ComboEffectContext {
  // ... existing fields ...
  /** Word-length scaling factor (1.0 | 1.5 | 2.0) — from getWordLengthScaleFactor(path.length) */
  wordLengthScale: number;
}
```

**useBlastGame wiring:** Pass `wordLengthScale: getWordLengthScaleFactor(path.length)` in the context object created at the `executeComboEffect` call site (line 684-688 in `useBlastGame.ts`).

**Effect application:** Only area-of-effect parameters scale. Score multipliers do NOT change (they are fixed in PAIR_COMBOS). What scales:
- `fireAreaBlast` radius: `scaledRadius(BOMB_RADIUS, wordLengthScale)`
- `fireCrossClear` is already board-wide (no radius) — not scaled, inherently "max"
- `fireVortex` radius: `scaledRadius(VORTEX_PULL_RADIUS, wordLengthScale)`
- Lightning column count: already "entire column" so not scaled

Net effect per COMB-06: a 7+ letter word with bomb produces a 5x5 blast area (vs default 3x3). A 7+ letter word with vortex pulls from radius 4 (vs default 2).

### Pattern 5: Translation Keys
**What:** Add all 22 new combo names + discovery/codex keys to all 4 translation files.
**When to use:** Plan 49-04 — translation completeness pass.

Existing keys in `blast.combo.*`: 9 entries (bomb_bomb, bomb_lightning, bomb_prism, lightning_lightning, lightning_prism, prism_prism, gold_special, rainbow_special, triple_special).

22 missing combo name keys:
```
bomb_rainbow, bomb_mirror, bomb_magnet, bomb_gem, bomb_frozen,
lightning_rainbow, lightning_mirror, lightning_magnet, lightning_gem, lightning_frozen,
prism_rainbow, prism_mirror, prism_magnet, prism_gem, prism_frozen,
rainbow_mirror, rainbow_magnet, rainbow_gem, rainbow_frozen,
mirror_magnet, mirror_gem, mirror_frozen,
magnet_gem, magnet_frozen,
gem_frozen
```
(25 keys needed, not 22 — the 28-pair PAIR_COMBOS includes prism_mirror, prism_magnet at multiplier 6 and rainbow_mirror at 5, all of which need names. Count carefully: 30 PAIR_COMBOS rows minus bomb_bomb, lightning_lightning, prism_prism = 27 non-same-type pairs. 9 already exist. 27 - 6 existing non-same-type = 21 new. Plus we still need bomb_rainbow, bomb_mirror, bomb_magnet, bomb_gem, bomb_frozen (5), lightning_rainbow, lightning_mirror, lightning_magnet, lightning_gem, lightning_frozen (5), prism_rainbow, prism_mirror, prism_magnet, prism_gem, prism_frozen (5), rainbow_mirror, rainbow_magnet, rainbow_gem, rainbow_frozen (4), mirror_magnet, mirror_gem, mirror_frozen (3), magnet_gem, magnet_frozen (2), gem_frozen (1) = 25 new.)

New discovery/codex UI keys needed (added to `blast.*`):
```
blast.comboDiscovered     — "COMBO DISCOVERED!" (banner header)
blast.comboCodex          — "Combo Codex" (button label + modal title)
blast.codexProgress       — "{discovered}/{total} combos discovered"
blast.codexLocked         — "???" (undiscovered combo placeholder)
blast.codexUnlocked       — "Discovered!" (badge on discovered combos)
```

### Anti-Patterns to Avoid
- **Blocking cascades with discovery:** Discovery banner must NOT block ongoing cascade animation. The `isCascading` check in `clearTilesForWord` already blocks double submissions. Discovery should queue when a combo fires, but not interfere with the cascade timer chain.
- **Making discovery check fire inside `setTileStates` updater function:** State updaters must be pure — any side effects like setting `pendingDiscovery` must happen outside the updater, in the `clearTilesForWord` function body (same pattern as `setActiveComboFlash`).
- **Mutating `discoveredCombos` Set in place:** React state requires new Set instances. Use `new Set(prev).add(type)` pattern.
- **SSR crash in localStorage init:** `localStorage` is not available server-side. Always wrap in `try/catch` or `typeof window !== 'undefined'` check.
- **Scaling cross-clears (prism, lightning):** `fireCrossClear` already clears entire rows/columns — board-wide. Applying `wordLengthScale` to them would have no visible effect and should be skipped. Only area/radius effects scale.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combo discovery banner animation | Custom CSS keyframes | Framer Motion `AnimatePresence` + `motion.div` | Already the pattern; `BlastComboFlash` is the reference |
| Modal/overlay pattern | Custom backdrop + z-index management | Same div pattern as `BlastHelpModal.tsx` | Consistent overlay handling already exists |
| i18n plural formatting | Custom `{discovered}/{total}` concatenation | `t('blast.codexProgress')` with template variable `{discovered}` and `{total}` — same pattern as `blast.objective.collectType` uses `{target}` | Already established pattern |
| localStorage persistence layer | Custom serialization | Simple `JSON.stringify(Array.from(set))` / `JSON.parse(...)` into `new Set(...)` | No abstraction needed |

---

## Common Pitfalls

### Pitfall 1: Discovery State Stale Closure
**What goes wrong:** `discoveredCombos` inside `clearTilesForWord` reads a stale snapshot — newly discovered combos in the same session show the discovery banner again.
**Why it happens:** `clearTilesForWord` is a `useCallback` — its closure captures `discoveredCombos` at definition time, not at call time.
**How to avoid:** Mirror `discoveredCombos` in a `discoveredCombosRef` that's updated synchronously: `discoveredCombosRef.current = discoveredCombos` at hook scope (same as `tileStatesRef` / BUGF-07 fix). Check `discoveredCombosRef.current.has(comboType)` inside the callback.
**Warning signs:** Discovery banner fires every time the same combo is used.

### Pitfall 2: useBlastGame Already at 1600 Lines
**What goes wrong:** Adding discovery state + ref + localStorage effects pushes `useBlastGame.ts` further past 500 lines (already ~1600 lines).
**Why it happens:** The file was already over the 500-line limit before Phase 49.
**How to avoid:** Extract discovery logic into `useBlastComboDiscovery` hook (similar to how `useBlastCascade` was extracted). This hook owns `discoveredCombos`, `pendingDiscovery`, `acknowledgeDiscovery()`, and localStorage sync. `useBlastGame` imports it and receives `{ discoveredCombos, pendingDiscovery, onComboDetected }`.
**Warning signs:** TypeScript build complains about file length (no error, just code review / lint).

### Pitfall 3: 300ms "Freeze" Semantics
**What goes wrong:** Implementing the freeze as a `setTimeout` that delays re-enabling input by 300ms — but during those 300ms the cascade can still trigger and clear tiles, causing a visual mismatch.
**Why it happens:** The cascade timer chain is independent of the discovery banner.
**How to avoid:** The "freeze" should only block NEW word submission (same as `isAutoDetecting` blocks). Cascades triggered by the just-submitted word continue normally — the banner overlays them. The grid's input is blocked by `pendingDiscovery !== null` check in `BlastGrid`'s `onWordSubmit` handler.
**Warning signs:** Tests show cascade words don't fire when discovery banner is showing.

### Pitfall 4: Translation File Format
**What goes wrong:** Adding combo keys to the wrong nesting level in translation files — `blast.combo.bomb_rainbow` vs `combo.bomb_rainbow` vs `blast.bomb_rainbow`.
**Why it happens:** The translation files are very large and the `blast.combo` section is easy to mis-locate.
**How to avoid:** In `en.js` the `blast.combo` section is at lines 5613-5623. Add new keys inside that same object. The label format in `blastCombos.ts` is `blast.combo.${comboType}` (line 148) — confirm keys match exactly.
**Warning signs:** `t('blast.combo.bomb_rainbow')` returns the key string unchanged.

### Pitfall 5: Codex Shows Wrong Total (28 vs 33)
**What goes wrong:** Displaying "X/33" because `BlastComboType` has 33 variants (30 pairs + gold_special + rainbow_special + triple_special).
**Why it happens:** The success criteria says "12/28" — the 28 C(8,2) pairs from the offensive tile matrix, not including catch-alls or same-type.
**How to avoid:** Export `CODEX_COMBOS` from `blastCombos.ts` — an explicit array of exactly 28 combo types that belong in the Codex. Same-type combos (bomb_bomb, etc.) CAN be in the Codex (they're part of the 28+3 = the 3 same-type pairs). Actually C(8,2)=28 + 3 same-type = 31 pairs total. The spec says 28 — use `CODEX_COMBO_COUNT` constant and verify against spec. **Safest approach:** Define `CODEX_COMBOS` as the exact array the planner specifies and derive the count from it.

---

## Code Examples

### Discovery Check Inside clearTilesForWord
```typescript
// Source: useBlastGame.ts — add after line 705 (after setActiveComboFlash)
// After combo execution loop:
if (detectedCombos.length > 0) {
  // ... existing flash + audio code ...

  // COMB-04: discovery check
  for (const combo of detectedCombos) {
    if (!discoveredCombosRef.current.has(combo.type)) {
      // First-ever fire for this combo type
      setPendingDiscovery(combo.type);
      // Update ref synchronously so future combos in same word don't re-discover
      discoveredCombosRef.current = new Set([...discoveredCombosRef.current, combo.type]);
      setDiscoveredCombos(discoveredCombosRef.current);
      break; // Show one discovery at a time
    }
  }
}
```

### getWordLengthScaleFactor
```typescript
// NEW: fe-next/components/blast/utils/blastComboScaling.ts
export function getWordLengthScaleFactor(wordLength: number): 1.0 | 1.5 | 2.0 {
  if (wordLength >= 7) return 2.0;
  if (wordLength >= 5) return 1.5;
  return 1.0;
}

export function scaledRadius(base: number, scale: number): number {
  return Math.ceil(base * scale);
}

/** All combo types that appear in the Combo Codex (excludes catch-alls gold_special/rainbow_special/triple_special) */
export const CODEX_COMBOS: readonly BlastComboType[] = [
  'bomb_bomb', 'bomb_lightning', 'bomb_prism', 'bomb_rainbow', 'bomb_mirror',
  'bomb_magnet', 'bomb_gem', 'bomb_frozen',
  'lightning_lightning', 'lightning_prism', 'lightning_rainbow', 'lightning_mirror',
  'lightning_magnet', 'lightning_gem', 'lightning_frozen',
  'prism_prism', 'prism_rainbow', 'prism_mirror', 'prism_magnet', 'prism_gem', 'prism_frozen',
  'rainbow_mirror', 'rainbow_magnet', 'rainbow_gem', 'rainbow_frozen',
  'mirror_magnet', 'mirror_gem', 'mirror_frozen',
  'magnet_gem', 'magnet_frozen',
  'gem_frozen',
] as const; // 31 entries: 28 cross-type + 3 same-type pairs

export const CODEX_COMBO_COUNT = CODEX_COMBOS.length; // 31; COMB-05 says "28" but matrix is 31 with same-types
```

Note: the planner should reconcile the "28" in COMB-05 with the actual matrix. The 48-RESEARCH counted 28 C(8,2) cross-type pairs. Adding same-type pairs gives 31. Define `CODEX_COMBOS` explicitly and let the spec ("e.g. 12/28") be illustrative.

### ComboEffectContext with wordLengthScale
```typescript
// MODIFY: blastComboEffects.ts
export interface ComboEffectContext {
  combo: SpecialCombo;
  next: BlastTileState[][];
  gridSize: number;
  path: Array<{ row: number; col: number }>;
  now: number;
  markCleared: (tile: BlastTileState) => void;
  isMultiHitAlive: (tile: BlastTileState) => boolean;
  hitMultiHitTile: (tile: BlastTileState) => void;
  /** Word-length scaling factor (1.0|1.5|2.0). Apply to area radii, NOT to score. */
  wordLengthScale: number;  // NEW
}

// In fireAreaBlast calls, replace BOMB_RADIUS with:
// scaledRadius(BOMB_RADIUS, ctx.wordLengthScale)
```

### Translation Key Pattern (existing → extend)
```javascript
// Source: fe-next/translations/en.js lines 5613-5623 (existing)
"combo": {
  "bomb_bomb": "MEGA BLAST!",
  // ... 8 existing ...
  // ADD 25 new entries:
  "bomb_rainbow": "PRISM BOMB!",
  "bomb_mirror": "TWIN EXPLOSION!",
  // ...
}
// ALSO ADD in blast section (not blast.combo):
"comboDiscovered": "COMBO DISCOVERED!",
"comboCodex": "Combo Codex",
"codexProgress": "{discovered}/{total} discovered",
"codexLocked": "???",
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No discovery tracking | `discoveredCombos` Set in hook + localStorage | Phase 49 | First-time combo fires get special banner |
| No codex | `BlastCodexModal` in ready screen | Phase 49 | Player can browse collection progress |
| Fixed-size combo effects | `wordLengthScale` applied to radii | Phase 49 | 7+ letter words feel noticeably more powerful |
| 9 translated combo names | 34 translated combo names (9 + 25) | Phase 49 | All combos display correct name in banner and codex |

**Deprecated/outdated:**
- None — phase 49 extends, does not replace, phase 48's work.

---

## Open Questions

1. **CODEX_COMBO_COUNT: 28 or 31?**
   - What we know: COMB-05 says "e.g. 12/28". PAIR_COMBOS has 30 entries (28 cross-type + bomb_bomb + lightning_lightning + prism_prism). Plus gold_special/rainbow_special/triple_special = 33 BlastComboType entries total.
   - What's unclear: Should same-type pairs (bomb+bomb, etc.) count toward the Codex?
   - Recommendation: Include same-type pairs — they are the most dramatic combos and rewarding to "collect". Export explicit `CODEX_COMBOS` array (31 entries) and the planner can adjust to 28 if needed. The "28" in COMB-05 is illustrative.

2. **Discovery persistence: localStorage vs in-memory per session?**
   - What we know: SYNC-04 (Supabase sync) is out of scope for phase 49. The spec doesn't say persistence is required at this stage.
   - What's unclear: Should discoveries reset each game session or persist indefinitely?
   - Recommendation: Persist to `localStorage` under key `blast_discovered_combos`. Cost is trivial; player satisfaction of persistent collection is significantly higher.

3. **Discovery banner blocking cascades?**
   - What we know: Cascade runs on a timer chain independent of UI state. The banner appears on top.
   - What's unclear: Should the banner pause the cascade timer?
   - Recommendation: No — cascade continues behind the banner. The banner dismisses in ~1800ms, well before a cascade chain usually completes (CASCADE_DETECTION_DELAY=700ms + execution). Pausing the cascade timer would require threading the banner state through the cascade timer callback, adding significant complexity.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 with `@testing-library/react` |
| Config file | `fe-next/jest.config.ts` |
| Quick run command | `npx jest --testPathPattern="blastComboDiscovery|blastCodex|blastComboScaling|useBlastComboDiscovery" --no-coverage` |
| Full suite command | `npx jest --testPathPattern="blast" --no-coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMB-04 | First combo fire triggers `pendingDiscovery` state | unit | `npx jest useBlastComboDiscovery --no-coverage` | No — Wave 0 gap |
| COMB-04 | Second fire of same combo does NOT trigger discovery | unit | `npx jest useBlastComboDiscovery --no-coverage` | No — Wave 0 gap |
| COMB-04 | BlastComboDiscovery renders banner with combo name | unit | `npx jest BlastComboDiscovery --no-coverage` | No — Wave 0 gap |
| COMB-04 | Grid input blocked while pendingDiscovery !== null | unit | `npx jest useBlastComboDiscovery --no-coverage` | No — Wave 0 gap |
| COMB-05 | BlastCodexModal shows correct discovered/total count | unit | `npx jest BlastCodexModal --no-coverage` | No — Wave 0 gap |
| COMB-05 | Undiscovered combos show "???" placeholder | unit | `npx jest BlastCodexModal --no-coverage` | No — Wave 0 gap |
| COMB-05 | Discovered combos show their name | unit | `npx jest BlastCodexModal --no-coverage` | No — Wave 0 gap |
| COMB-06 | getWordLengthScaleFactor returns 1.0 for 3-4 letter words | unit | `npx jest blastComboScaling --no-coverage` | No — Wave 0 gap |
| COMB-06 | getWordLengthScaleFactor returns 1.5 for 5-6 letter words | unit | `npx jest blastComboScaling --no-coverage` | No — Wave 0 gap |
| COMB-06 | getWordLengthScaleFactor returns 2.0 for 7+ letter words | unit | `npx jest blastComboScaling --no-coverage` | No — Wave 0 gap |
| COMB-06 | 7-letter word produces larger bomb blast radius in combo effect | unit | `npx jest blastComboEffects --no-coverage` | Partial — needs wordLengthScale param |
| COMB-07 | All 34 blast.combo.* keys exist in en.js | unit (translation coverage) | manual review or snapshot test | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="blast" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `fe-next/components/blast/hooks/__tests__/useBlastComboDiscovery.test.ts` — covers COMB-04 state logic
- [ ] `fe-next/components/blast/__tests__/BlastComboDiscovery.test.tsx` — covers COMB-04 banner render
- [ ] `fe-next/components/blast/__tests__/BlastCodexModal.test.tsx` — covers COMB-05 codex render
- [ ] `fe-next/components/blast/utils/__tests__/blastComboScaling.test.ts` — covers COMB-06 scaling util
- [ ] `fe-next/components/blast/utils/blastComboScaling.ts` — new scaling util
- [ ] `fe-next/components/blast/BlastComboDiscovery.tsx` — new discovery banner
- [ ] `fe-next/components/blast/BlastCodexModal.tsx` — new codex screen

---

## Sources

### Primary (HIGH confidence)
- `fe-next/components/blast/utils/blastCombos.ts` — complete PAIR_COMBOS list, SpecialCombo type, label format
- `fe-next/components/blast/hooks/useBlastGame.ts` — hook signature, existing state pattern, clearTilesForWord structure
- `fe-next/components/blast/BlastComboFlash.tsx` — reference pattern for screen overlay component
- `fe-next/components/blast/utils/blastComboEffects.ts` — ComboEffectContext type (to extend)
- `fe-next/components/blast/BlastView.tsx` — phase management, BlastReadyScreen integration point
- `fe-next/translations/en.js` (lines 5613-5623) — existing blast.combo.* keys
- `fe-next/translations/he.js` (lines 5496-5506) — Hebrew combo keys
- `fe-next/translations/sv.js` (lines 5521-5531) — Swedish combo keys
- `fe-next/translations/ja.js` (lines 5570-5580) — Japanese combo keys
- `.planning/REQUIREMENTS.md` — COMB-04/05/06/07 definitions and success criteria
- `fe-next/CLAUDE.md` — 500-line file limit, TDD mandatory, no hardcoded strings, translation-first

### Secondary (MEDIUM confidence)
- `.planning/phases/48-combination-system-core/48-04-SUMMARY.md` — confirmed Phase 48 deliverables (830 tests green)
- `.planning/STATE.md` — confirmed Phase 48 complete, Phase 49 pending

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns from existing codebase
- Architecture (discovery state): HIGH — ref pattern, localStorage init, banner component all proven patterns in codebase
- Architecture (Codex modal): HIGH — BlastHelpModal is the reference; same structural pattern
- Word-length scaling: HIGH — pure function, clear spec (1.0/1.5/2.0), applies to radius parameters
- Translation keys: HIGH — files located, format confirmed, 25 new combo names identified
- Codex combo count (28 vs 31): MEDIUM — spec says "28" but matrix produces 31 if same-type pairs included; planner resolves

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable internal codebase, no external dependencies)
