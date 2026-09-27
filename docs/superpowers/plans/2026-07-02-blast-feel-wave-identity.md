# Blast Feel, Wave Identity & Cascade Taming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tame board-wiping super cascades, give each wave a distinct mechanical + visual identity with FEWER concurrent tile types, and amplify variable reward (jackpot moment + mystery tile) in the live legacy Blast mode.

**Architecture:** All spawn/clear logic flows through modules shared by client and MP server (`getWaveDistribution`, `processTilesForWord` with injected seeded RNG), so changes there stay MP-consistent automatically. Cascade *chain* selection is client-only (`useBlastCascade`), so quality-gating it cannot diverge from the server. New logic goes in new small pure modules, TDD'd.

**Tech Stack:** Next.js 16 / TypeScript / Vitest (`npm run test:frontend -- <path>`), Framer Motion + PixiJS FX (existing), i18n via `t()` across 6 locales (`translations/{en,he,sv,ja,es,ru}.js`).

**Spec:** `docs/superpowers/specs/2026-07-02-blast-feel-wave-identity-design.md`

## Global Constraints

- All UI copy via `t('key')`; add every new key to ALL 6 locale files: `translations/en.js`, `he.js`, `sv.js`, `ja.js`, `es.js`, `ru.js` (native copy, not literal translation).
- TDD strict: failing test first, minimal green, refactor. Never weaken a failing existing test without analyzing whether it found a bug.
- Files ≤500 lines: do NOT grow `blastWaveConfig.ts` (733) or `clearTilesProcessor.ts` (538) beyond small insertions; new logic lives in new modules.
- Retired tiles stay retired: never touch `BLAST_RETIRED_SPECIAL_TYPES` membership.
- MP determinism: any randomness inside spawn/clear paths MUST use the injected `rng` param, never `Math.random` directly.
- `prefers-reduced-motion` handled by existing FX layers — reuse existing channels (comboFlash, score fly, explosions), don't add raw new animations.
- After all tasks: `npm run lint` (0 errors) and `npm run build` must pass.
- Working dir for all commands: `fe-next/`.

---

### Task 1: Cascade quality gate — one find per chain level, quality-gated deep chains

**Files:**
- Create: `fe-next/components/blast/legacy/utils/blastCascadeQuality.ts`
- Create: `fe-next/components/blast/legacy/utils/__tests__/blastCascadeQuality.test.ts`
- Modify: `fe-next/components/blast/legacy/types.ts` (add 3 constants near line 288, after `MAX_CASCADE_WORDS_PER_LEVEL`)
- Modify: `fe-next/components/blast/legacy/hooks/useBlastCascade.ts:104-141`

**Interfaces:**
- Consumes: the `CascadeFind` shape already local to `useBlastCascade.ts:104`: `{ cells: Array<{row:number;col:number}>; label: string; bonusFn: (cl:number)=>number }`.
- Produces: `selectCascadeFinds<T extends {cells:{row:number;col:number}[]; label:string}>(finds: T[], chainLevel: number): T[]` — returns `[]` or a single-element array. Task 8's invariant test relies on this name.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/components/blast/legacy/utils/__tests__/blastCascadeQuality.test.ts
import { describe, it, expect } from 'vitest';
import { selectCascadeFinds } from '../blastCascadeQuality';

const cells = (n: number) => Array.from({ length: n }, (_, i) => ({ row: 0, col: i }));
// Cluster labels look like "[A×4]"; word labels are plain words.
const cluster = (size: number) => ({ cells: cells(size), label: `[A×${size}]` });
const word = (w: string) => ({ cells: cells(w.length), label: w });

describe('selectCascadeFinds', () => {
  it('returns at most ONE find per chain level', () => {
    const picked = selectCascadeFinds([cluster(3), word('GAME'), word('TILES')], 1);
    expect(picked).toHaveLength(1);
  });

  it('prefers the largest cluster over words', () => {
    const c = cluster(4);
    expect(selectCascadeFinds([word('TILES'), c, cluster(3)], 1)[0]).toBe(c);
  });

  it('falls back to the longest word when no cluster', () => {
    const long = word('TILES');
    expect(selectCascadeFinds([word('GAME'), long], 1)[0]).toBe(long);
  });

  it('chain level >= 3 requires quality: cluster >= 4 or word >= 5 letters', () => {
    expect(selectCascadeFinds([cluster(3), word('GAME')], 3)).toHaveLength(0);
    expect(selectCascadeFinds([cluster(4)], 3)).toHaveLength(1);
    expect(selectCascadeFinds([word('TILES')], 4)).toHaveLength(1);
  });

  it('chain level < 3 accepts any find', () => {
    expect(selectCascadeFinds([cluster(3)], 2)).toHaveLength(1);
  });

  it('empty input returns empty', () => {
    expect(selectCascadeFinds([], 1)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/blastCascadeQuality.test.ts`
Expected: FAIL — cannot resolve `../blastCascadeQuality`.

- [ ] **Step 3: Add constants to types.ts**

Insert after `MAX_CASCADE_WORDS_PER_LEVEL` (types.ts ~line 288):

```typescript
/** Chain level at which cascade auto-clears require a "quality" match.
 * Deep chains become rare/earned — variable-ratio reward instead of routine wipes. */
export const CASCADE_QUALITY_MIN_CHAIN = 3;
/** Minimum match-3 cluster size that counts as quality at deep chain levels. */
export const CASCADE_QUALITY_MIN_CLUSTER = 4;
/** Minimum auto-word length that counts as quality at deep chain levels. */
export const CASCADE_QUALITY_MIN_WORD_LEN = 5;
```

- [ ] **Step 4: Write minimal implementation**

```typescript
// fe-next/components/blast/legacy/utils/blastCascadeQuality.ts
/**
 * Cascade find selection — the anti-"super cascade" quality gate.
 *
 * Previously each chain level cleared up to 2 finds (cluster + word) from 3
 * detectors, so a 4-5 deep chain could empty most of the board. Now each chain
 * level clears exactly ONE find (best cluster, else longest word), and from
 * CASCADE_QUALITY_MIN_CHAIN onward only "quality" matches sustain the chain —
 * long chains stay possible but rare, which is the variable-ratio sweet spot.
 */
import {
  CASCADE_QUALITY_MIN_CHAIN,
  CASCADE_QUALITY_MIN_CLUSTER,
  CASCADE_QUALITY_MIN_WORD_LEN,
} from '../types';

interface FindLike {
  cells: Array<{ row: number; col: number }>;
  /** Cluster labels are bracketed ("[A×4]"); word labels are the word itself. */
  label: string;
}

const isCluster = (f: FindLike) => f.label.startsWith('[');

export function selectCascadeFinds<T extends FindLike>(finds: T[], chainLevel: number): T[] {
  if (finds.length === 0) return [];

  const clusters = finds.filter(isCluster).sort((a, b) => b.cells.length - a.cells.length);
  const words = finds.filter((f) => !isCluster(f)).sort((a, b) => b.cells.length - a.cells.length);
  const best = clusters[0] ?? words[0];
  if (!best) return [];

  if (chainLevel >= CASCADE_QUALITY_MIN_CHAIN) {
    const quality = isCluster(best)
      ? best.cells.length >= CASCADE_QUALITY_MIN_CLUSTER
      : best.cells.length >= CASCADE_QUALITY_MIN_WORD_LEN;
    if (!quality) return [];
  }
  return [best];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/blastCascadeQuality.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Wire into useBlastCascade**

In `useBlastCascade.ts`: add import `import { selectCascadeFinds } from '../utils/blastCascadeQuality';`. Then replace the three `.slice(0, MAX_CASCADE_WORDS_PER_LEVEL)` calls at lines 109/119/129 with plain pushes of ALL detected finds (remove the slices), and replace lines 137-141:

```typescript
        if (cascadeFinds.length === 0) break;
        // Cap total finds per level to 2 (match-3 + one word) — prevents 3
        // simultaneous detectors from wiping half the board in a single chain step.
        cascadeFinds.splice(2);

        chainLevel++;
```

with:

```typescript
        // One quality-gated find per chain level — cascades celebrate a single
        // best match instead of triple-clearing, and deep chains need quality.
        const picked = selectCascadeFinds(cascadeFinds, chainLevel + 1);
        if (picked.length === 0) break;
        cascadeFinds.length = 0;
        cascadeFinds.push(...picked);

        chainLevel++;
```

(`chainLevel + 1` because the gate applies to the level being entered.)
`MAX_CASCADE_WORDS_PER_LEVEL` import in this file becomes unused — remove it from the import list (keep the constant exported in types.ts; other tests may reference it).

- [ ] **Step 7: Run existing cascade tests, analyze failures**

Run: `cd fe-next && npx vitest run components/blast/legacy/hooks/__tests__/ components/blast/legacy/utils/__tests__/ 2>&1 | tail -30`
Expected: any failure should be a test that encodes the old "2 finds per level" behavior — update ONLY such tests to the new single-find contract. Anything else failing = investigate as a real bug before touching the test.

- [ ] **Step 8: Commit**

```bash
git add fe-next/components/blast/legacy/utils/blastCascadeQuality.ts fe-next/components/blast/legacy/utils/__tests__/blastCascadeQuality.test.ts fe-next/components/blast/legacy/types.ts fe-next/components/blast/legacy/hooks/useBlastCascade.ts
git commit -m "feat(blast): quality-gated single-find cascades — deep chains rare, not routine"
```

---

### Task 2: Tighter special-tile chain budget + Overflow Surge payout

**Files:**
- Modify: `fe-next/components/blast/legacy/types.ts:162-164` (two constants)
- Modify: `fe-next/components/blast/legacy/utils/blastTileEffects.ts:41-70` (chainBudget shape + suppression counting)
- Modify: `fe-next/components/blast/legacy/utils/clearTilesProcessor.ts:146-151` (budget init) and its result (~line 527)
- Test: `fe-next/components/blast/legacy/utils/__tests__/clearTilesProcessor.overflowSurge.test.ts` (create)

**Interfaces:**
- Consumes: `chainBudget?: { detonations; cleared; maxDetonations; maxCleared }` on `TileEffectContext` (blastTileEffects.ts:45); `TileProcessingResult` (clearTilesProcessor.ts:68).
- Produces: `chainBudget.suppressed: number`; `TileProcessingResult.overflowSurge: number` (points already folded into `totalScore`); constant `OVERFLOW_SURGE_POINTS_PER_DETONATION = 10` exported from types.ts. Both client HUD and server consume `totalScore` unchanged — no caller changes needed.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/components/blast/legacy/utils/__tests__/clearTilesProcessor.overflowSurge.test.ts
import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../clearTilesProcessor';
import type { BlastTileState } from '../../types';
import { BLAST_MAX_CHAIN_DETONATIONS, OVERFLOW_SURGE_POINTS_PER_DETONATION } from '../../types';

const GRID = 6;
const tile = (type: BlastTileState['type'] = 'standard'): BlastTileState => ({
  type, isCleared: false, hitsRemaining: 1,
} as BlastTileState);

function boardOfBombs(): BlastTileState[][] {
  // Every cell a bomb → chain detonations guaranteed to exhaust the budget.
  return Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => tile('bomb')));
}

describe('overflow surge', () => {
  it('caps detonations at the new tighter budget and pays surge points for suppressed ones', () => {
    const prev = boardOfBombs();
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const res = processTilesForWord({
      prev, path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 3, rng: () => 0.5,
    });
    expect(BLAST_MAX_CHAIN_DETONATIONS).toBe(5);
    expect(res.overflowSurge).toBeGreaterThan(0);
    expect(res.overflowSurge % OVERFLOW_SURGE_POINTS_PER_DETONATION).toBe(0);
    // Board-wipe ceiling: never clears more than 40% of a 6x6 board (min-cap aside).
    expect(res.newlyClearedCount).toBeLessThanOrEqual(Math.max(8, Math.floor(GRID * GRID * 0.4)));
  });

  it('no surge when nothing is suppressed', () => {
    const prev = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => tile()));
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const res = processTilesForWord({
      prev, path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 3, rng: () => 0.5,
    });
    expect(res.overflowSurge).toBe(0);
  });
});
```

Note: `BlastTileState` requires more fields in practice — copy the tile-factory shape from the existing `clearTilesProcessor` test file (`components/blast/legacy/utils/__tests__/clearTilesProcessor.test.ts` or nearest sibling) rather than inventing one; keep `type/isCleared/hitsRemaining` as the significant fields.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/clearTilesProcessor.overflowSurge.test.ts`
Expected: FAIL — `BLAST_MAX_CHAIN_DETONATIONS` is 8 and `overflowSurge` is undefined.

- [ ] **Step 3: Implement**

types.ts lines 162-164 — change values and add the surge constant:

```typescript
export const BLAST_MAX_CHAIN_DETONATIONS = 5;

export const BLAST_MAX_CHAIN_CLEAR_FRACTION = 0.4;

/** Points paid per chain detonation suppressed by the budget — the cap reads
 * as an "overflow surge" payout, never as a nerf. */
export const OVERFLOW_SURGE_POINTS_PER_DETONATION = 10;
```

(Keep `BLAST_MIN_CHAIN_CLEAR_CAP` as-is.)

blastTileEffects.ts — extend the budget shape (line 45) with `suppressed: number`, and in the two exhaustion predicates count each *denied* attempt at the call sites where a detonation/clear is skipped. Concretely: locate the helpers at lines 56-70:

```typescript
export function isDetonationBudgetExhausted(ctx: TileEffectContext): boolean {
  return !!ctx.chainBudget && ctx.chainBudget.detonations >= ctx.chainBudget.maxDetonations;
}
```

Add one function beside them:

```typescript
/** Record a detonation/clear the budget refused — fuels the Overflow Surge payout. */
export function recordSuppressed(ctx: TileEffectContext): void {
  if (ctx.chainBudget) ctx.chainBudget.suppressed++;
}
```

Then in every site inside `blastTileEffects.ts` where `isDetonationBudgetExhausted(ctx)` or the clear-budget predicate causes a `return`/`break`/`continue` (grep `BudgetExhausted` within the file), call `recordSuppressed(ctx)` immediately before skipping.

clearTilesProcessor.ts — budget init (line 146-151) gains `suppressed: 0`; after the main loops, compute and fold the surge:

```typescript
  const overflowSurge = ctx.chainBudget.suppressed * OVERFLOW_SURGE_POINTS_PER_DETONATION;
  bonusScore += overflowSurge;
```

and add `overflowSurge` to `TileProcessingResult` (interface + return object). If surge > 0, also push a score popup so the payout is visible:

```typescript
  if (overflowSurge > 0) {
    pendingPopups.push({
      id: `surge-${now}`, row: path[path.length - 1].row, col: path[path.length - 1].col,
      score: overflowSurge, type: 'bonus', timestamp: now,
    } as BlastScorePopup);
  }
```

(Match the exact `BlastScorePopup` field shape used by existing pushes in this file — copy an existing popup push and change id/score.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/clearTilesProcessor.overflowSurge.test.ts`
Expected: PASS.

- [ ] **Step 5: Run neighboring suites (shared with MP server)**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/ backend/__tests__/wordHandler.blastBoardSync.test.ts 2>&1 | tail -20`
Expected: green, or failures that merely encode detonations=8 / fraction=0.5 (update those numbers in tests). Any other failure = investigate first.

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/legacy/types.ts fe-next/components/blast/legacy/utils/blastTileEffects.ts fe-next/components/blast/legacy/utils/clearTilesProcessor.ts fe-next/components/blast/legacy/utils/__tests__/clearTilesProcessor.overflowSurge.test.ts
git commit -m "feat(blast): tighter chain budget (5 detonations, 40% wipe cap) + Overflow Surge payout"
```

---

### Task 3: Featured-specials roster per wave

**Files:**
- Create: `fe-next/components/blast/legacy/utils/blastWaveRoster.ts`
- Create: `fe-next/components/blast/legacy/utils/__tests__/blastWaveRoster.test.ts`
- Modify: `fe-next/components/blast/legacy/utils/blastWaveConfig.ts` (WaveConfig field ~line 44; call filter at the end of `getWaveDistribution` ~line 730)

**Interfaces:**
- Consumes: `getWaveDistribution(config: WaveConfig): Record<string, number>` (blastWaveConfig.ts:556) — called by client board init (`BlastView.tsx:138`), refill paths, and the MP server (`blastModeManager.ts:78`), so this ONE hook covers all spawn paths.
- Produces:
  - `WaveConfig.featuredSpecials?: readonly BlastTileType[]` (new optional field).
  - `CORE_SPECIALS: ReadonlySet<BlastTileType>` = {bomb, ice, gold, rainbow}.
  - `applyFeaturedRoster(dist: Record<string, number>, featured: readonly BlastTileType[] | undefined): Record<string, number>` — zeroes non-core, non-featured specials; boosts each featured type to ≥`FEATURED_MIN_SHARE = 0.10`; returns a distribution that still sums to ~1 (caller normalizes).
  - `getFeaturedSpecialsForWave(wave: number): readonly BlastTileType[]` — deterministic rotation, used to fill table values and waves >12.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/components/blast/legacy/utils/__tests__/blastWaveRoster.test.ts
import { describe, it, expect } from 'vitest';
import { applyFeaturedRoster, getFeaturedSpecialsForWave, CORE_SPECIALS, FEATURED_MIN_SHARE } from '../blastWaveRoster';
import { getWaveConfig, getWaveDistribution } from '../blastWaveConfig';

describe('applyFeaturedRoster', () => {
  const dist = { gold: 0.2, bomb: 0.22, rainbow: 0.2, ice: 0.25, lightning: 0.05, prism: 0.04, anchor: 0.04 };

  it('zeroes active specials that are neither core nor featured', () => {
    const out = applyFeaturedRoster({ ...dist }, ['prism']);
    expect(out.lightning).toBe(0);
    expect(out.anchor).toBe(0);
    expect(out.prism).toBeGreaterThan(0);
  });

  it('keeps core specials untouched by the filter', () => {
    const out = applyFeaturedRoster({ ...dist }, []);
    for (const core of CORE_SPECIALS) expect(out[core]).toBeGreaterThan(0);
  });

  it('boosts featured share to at least FEATURED_MIN_SHARE', () => {
    const out = applyFeaturedRoster({ ...dist }, ['prism']);
    expect(out.prism).toBeGreaterThanOrEqual(FEATURED_MIN_SHARE);
  });

  it('undefined featured leaves the distribution unchanged (opt-in behavior)', () => {
    const out = applyFeaturedRoster({ ...dist }, undefined);
    expect(out).toEqual(dist);
  });
});

describe('getFeaturedSpecialsForWave', () => {
  it('waves 1-2 feature nothing (core-only teaching waves)', () => {
    expect(getFeaturedSpecialsForWave(1)).toEqual([]);
    expect(getFeaturedSpecialsForWave(2)).toEqual([]);
  });

  it('never features more than 2 specials', () => {
    for (let w = 1; w <= 30; w++) expect(getFeaturedSpecialsForWave(w).length).toBeLessThanOrEqual(2);
  });

  it('is deterministic', () => {
    expect(getFeaturedSpecialsForWave(17)).toEqual(getFeaturedSpecialsForWave(17));
  });
});

describe('wave distribution invariant (the anti-memorization guarantee)', () => {
  it('every wave spawns at most CORE + 2 featured special kinds', () => {
    for (let w = 1; w <= 30; w++) {
      const distW = getWaveDistribution(getWaveConfig(w));
      const nonZeroSpecials = Object.entries(distW)
        .filter(([k, v]) => v > 0 && k !== 'standard' && !CORE_SPECIALS.has(k as never));
      expect(nonZeroSpecials.length, `wave ${w}: ${nonZeroSpecials.map(([k]) => k).join(',')}`).toBeLessThanOrEqual(2);
    }
  });
});
```

(If `getWaveConfig` has a different exported name in blastWaveConfig.ts — check its exports; the wave lookup fn just above the table at line ~103 — use the real name.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/blastWaveRoster.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the roster module**

```typescript
// fe-next/components/blast/legacy/utils/blastWaveRoster.ts
/**
 * Featured-specials roster — each wave spawns the 4 CORE specials the player
 * learned in waves 1-2 plus AT MOST 2 "featured" specials. Uniqueness per wave
 * comes from WHICH specials are featured, while the number of concurrent tile
 * kinds the player must remember goes DOWN, not up.
 *
 * Applied inside getWaveDistribution, which both the client and the MP server
 * call — single lever, no divergence.
 */
import type { BlastTileType } from '@/shared/types/blast';

export const CORE_SPECIALS: ReadonlySet<BlastTileType> = new Set<BlastTileType>([
  'bomb', 'ice', 'gold', 'rainbow',
]);

/** Featured tiles spawn often enough to actually be learned. */
export const FEATURED_MIN_SHARE = 0.10;

/** Rotation pool — only currently-active (non-retired) exotic specials. */
const ROTATION: readonly (readonly BlastTileType[])[] = [
  ['prism'],                 // W3  — first exotic, solo spotlight
  ['lightning'],             // W4
  ['mystery'],               // W5  — the surprise tile (Task 4)
  ['prism', 'lightning'],    // W6
  ['anchor'],                // W7
  ['lightning', 'anchor'],   // W8
  ['prism', 'mystery'],      // W9
  ['anchor', 'mystery'],     // W10
  ['prism', 'anchor'],       // W11
  ['lightning', 'mystery'],  // W12
];

export function getFeaturedSpecialsForWave(wave: number): readonly BlastTileType[] {
  if (wave <= 2) return [];
  return ROTATION[(wave - 3) % ROTATION.length];
}

export function applyFeaturedRoster(
  dist: Record<string, number>,
  featured: readonly BlastTileType[] | undefined,
): Record<string, number> {
  if (!featured) return dist;
  const featuredSet = new Set<string>(featured);
  const out: Record<string, number> = { ...dist };
  for (const key of Object.keys(out)) {
    if (key === 'standard' || CORE_SPECIALS.has(key as BlastTileType)) continue;
    if (!featuredSet.has(key)) out[key] = 0;
  }
  // Boost featured shares so the spotlighted tile is actually met. The freed
  // weight comes from the caller's re-normalization pass.
  for (const f of featured) {
    if ((out[f] ?? 0) < FEATURED_MIN_SHARE) out[f] = FEATURED_MIN_SHARE;
  }
  return out;
}
```

(`'mystery'` won't type-check until Task 4 adds it to the union — if implementing Task 3 first, temporarily use `['prism']` for W5's slot and leave a `// Task 4 swaps in 'mystery'` note, OR implement Task 4's union change first. Recommended order: run Task 4 Step 3a (union addition) before this if type errors block.)

- [ ] **Step 4: Wire into getWaveDistribution + WaveConfig**

blastWaveConfig.ts — add to `WaveConfig` interface (after `archetype`):

```typescript
  /** Exotic specials allowed to spawn this wave (undefined = no filtering).
   * Core specials (bomb/ice/gold/rainbow) always spawn. Filled from
   * getFeaturedSpecialsForWave so waves >12 keep rotating. */
  featuredSpecials?: readonly BlastTileType[];
```

In the wave-config lookup function (the one returning table rows, handling wave>12 by capping at 12): after resolving the row, overlay the rotation so every wave — including >12 — gets its own roster:

```typescript
  return { ...config, featuredSpecials: getFeaturedSpecialsForWave(wave) };
```

In `getWaveDistribution`, immediately after the retired-types zeroing loop (line 720-722) and BEFORE normalization, insert:

```typescript
  // Featured roster: uniqueness per wave with FEWER concurrent tile kinds.
  const filtered = applyFeaturedRoster(raw, config.featuredSpecials);
  for (const k of Object.keys(raw)) raw[k] = filtered[k] ?? 0;
```

Add imports `import { applyFeaturedRoster, getFeaturedSpecialsForWave } from './blastWaveRoster';` (and `getFeaturedSpecialsForWave` where the lookup fn lives).

- [ ] **Step 5: Run tests**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/blastWaveRoster.test.ts components/blast/legacy/utils/__tests__/ 2>&1 | tail -25`
Expected: roster tests PASS. Existing distribution tests asserting lightning/prism/anchor shares at specific waves may fail — verify each failure is the deliberate roster behavior, then update the test's expected values.

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/legacy/utils/blastWaveRoster.ts fe-next/components/blast/legacy/utils/__tests__/blastWaveRoster.test.ts fe-next/components/blast/legacy/utils/blastWaveConfig.ts
git commit -m "feat(blast): featured-specials roster — unique wave identity with fewer concurrent tile kinds"
```

---

### Task 4: Mystery tile — one self-explanatory surprise tile

**Files:**
- Modify: `fe-next/shared/types/blast.ts:10` (union) and `BLAST_TILE_TYPE_LIST`
- Create: `fe-next/components/blast/legacy/utils/blastMysteryTile.ts`
- Create: `fe-next/components/blast/legacy/utils/__tests__/blastMysteryTile.test.ts`
- Modify: `fe-next/components/blast/legacy/utils/clearTilesProcessor.ts` (new `case 'mystery'` in the tile switch ~line 191)
- Modify: `fe-next/components/blast/legacy/blastTileVisuals.ts` (icon + face)
- Modify: `fe-next/components/blast/legacy/blastColorTokens.ts` (SHATTER_COLORS entry)
- Modify: `fe-next/components/blast/legacy/utils/blastWaveConfig.ts` (MYSTERY share plumb into `raw`)
- Modify: `fe-next/lib/blast/blastTileFirstUse.ts` (teach order)
- Modify: `translations/{en,he,sv,ja,es,ru}.js` (first-use callout copy)

**Interfaces:**
- Consumes: `rng: () => number` from `TileProcessingInput`; `markCleared`, `next`, `pathSet` locals of `processTilesForWord`; `SPECIAL_TILE_DISTRIBUTION`-style raw record in `getWaveDistribution`.
- Produces:
  - `'mystery'` in `BlastTileType`.
  - `type MysteryOutcome = { kind: 'scoreBurst'; points: number } | { kind: 'spawnSpecial'; special: BlastTileType } | { kind: 'miniPop' } | { kind: 'mega'; points: number }`.
  - `rollMysteryOutcome(rng: () => number): MysteryOutcome` — weights 45/30/20/5, mega points 150, scoreBurst 25-60.
  - Constant `MYSTERY_SHARE = 0.04` in blastWaveConfig.ts.

- [ ] **Step 1: Add 'mystery' to the shared union (unblocks Task 3 typing too)**

shared/types/blast.ts — add `| 'mystery'` to `BlastTileType` (after `'anchor'`), and `'mystery'` to `BLAST_TILE_TYPE_LIST` in the same position.

- [ ] **Step 2: Write the failing test**

```typescript
// fe-next/components/blast/legacy/utils/__tests__/blastMysteryTile.test.ts
import { describe, it, expect } from 'vitest';
import { rollMysteryOutcome } from '../blastMysteryTile';

const rngOf = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('rollMysteryOutcome', () => {
  it('is deterministic for a given rng', () => {
    expect(rollMysteryOutcome(rngOf(0.1, 0.5))).toEqual(rollMysteryOutcome(rngOf(0.1, 0.5)));
  });

  it('maps roll bands to outcomes: 45% burst / 30% spawn / 20% pop / 5% mega', () => {
    expect(rollMysteryOutcome(rngOf(0.10, 0.5)).kind).toBe('scoreBurst');
    expect(rollMysteryOutcome(rngOf(0.50, 0.5)).kind).toBe('spawnSpecial');
    expect(rollMysteryOutcome(rngOf(0.80, 0.5)).kind).toBe('miniPop');
    expect(rollMysteryOutcome(rngOf(0.97, 0.5)).kind).toBe('mega');
  });

  it('scoreBurst points stay in 25-60', () => {
    for (const r of [0, 0.4449, 0.999]) {
      const o = rollMysteryOutcome(rngOf(0.2, r));
      if (o.kind === 'scoreBurst') { expect(o.points).toBeGreaterThanOrEqual(25); expect(o.points).toBeLessThanOrEqual(60); }
    }
  });

  it('spawnSpecial picks a core special', () => {
    const o = rollMysteryOutcome(rngOf(0.6, 0.5));
    if (o.kind === 'spawnSpecial') expect(['bomb', 'gold', 'rainbow', 'ice']).toContain(o.special);
  });

  it('mega pays 150', () => {
    const o = rollMysteryOutcome(rngOf(0.99, 0.5));
    expect(o).toEqual({ kind: 'mega', points: 150 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/blastMysteryTile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the roll module**

```typescript
// fe-next/components/blast/legacy/utils/blastMysteryTile.ts
/**
 * Mystery "?" tile — the slot-machine tile. ONE tile whose whole identity is
 * "you don't know what it does", so it adds variable-ratio reward with ZERO
 * memorization burden. Resolution uses the injected seeded rng, so multiplayer
 * boards resolve identically on client and server.
 */
import type { BlastTileType } from '@/shared/types/blast';

export type MysteryOutcome =
  | { kind: 'scoreBurst'; points: number }
  | { kind: 'spawnSpecial'; special: BlastTileType }
  | { kind: 'miniPop' }
  | { kind: 'mega'; points: number };

const SPAWNABLE: readonly BlastTileType[] = ['bomb', 'gold', 'rainbow', 'ice'];

export const MYSTERY_MEGA_POINTS = 150;

export function rollMysteryOutcome(rng: () => number): MysteryOutcome {
  const roll = rng();
  if (roll < 0.45) {
    return { kind: 'scoreBurst', points: 25 + Math.floor(rng() * 36) }; // 25-60
  }
  if (roll < 0.75) {
    return { kind: 'spawnSpecial', special: SPAWNABLE[Math.floor(rng() * SPAWNABLE.length)] };
  }
  if (roll < 0.95) {
    return { kind: 'miniPop' };
  }
  return { kind: 'mega', points: MYSTERY_MEGA_POINTS };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/blastMysteryTile.test.ts`
Expected: PASS.

- [ ] **Step 6: Processor case (TDD: extend the overflow test file's factory or add a focused test)**

Add to `fe-next/components/blast/legacy/utils/__tests__/clearTilesProcessor.overflowSurge.test.ts` (or a new `clearTilesProcessor.mystery.test.ts` following its factory):

```typescript
  it('mystery tile in path resolves via seeded rng: scoreBurst adds points', () => {
    const prev = emptyBoard();               // all standard, reuse factory
    prev[0][0] = tile('mystery');
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const low = processTilesForWord({ prev: clone(prev), path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 5, rng: rngOf(0.1, 0.5) });
    const base = processTilesForWord({ prev: clone(prev), path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 5, rng: rngOf(0.999, 0.5) });
    expect(low.totalScore).toBeGreaterThan(0);
    expect(base.totalScore).not.toBe(low.totalScore); // different outcomes differ
  });
```

Then implement in clearTilesProcessor.ts — inside the main-path switch (alongside `case 'gold':`), add:

```typescript
      case 'mystery': {
        const outcome = rollMysteryOutcome(rng);
        if (outcome.kind === 'scoreBurst' || outcome.kind === 'mega') {
          bonusScore += outcome.points;
          pendingPopups.push({ /* copy an existing popup push; score: outcome.points */ } as BlastScorePopup);
        } else if (outcome.kind === 'spawnSpecial') {
          // Convert one random adjacent standard tile into the rolled special.
          const neighbors = [[0,1],[0,-1],[1,0],[-1,0]]
            .map(([dr,dc]) => ({ row: cell.row+dr, col: cell.col+dc }))
            .filter(p => next[p.row]?.[p.col] && !next[p.row][p.col].isCleared && next[p.row][p.col].type === 'standard');
          if (neighbors.length > 0) {
            const pick = neighbors[Math.floor(rng() * neighbors.length)];
            next[pick.row][pick.col].type = outcome.special;
          }
        } else { // miniPop
          const neighbors = [[0,1],[0,-1],[1,0],[-1,0]]
            .map(([dr,dc]) => ({ row: cell.row+dr, col: cell.col+dc }))
            .filter(p => next[p.row]?.[p.col] && !next[p.row][p.col].isCleared && !pathSet.has(`${p.row},${p.col}`));
          if (neighbors.length > 0) {
            const pick = neighbors[Math.floor(rng() * neighbors.length)];
            markCleared(next[pick.row][pick.col]);
          }
        }
        newExplosions.push({ id: `mystery-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        break;
      }
```

Import `rollMysteryOutcome` at top. IMPORTANT: always consume the same number of rng() calls per outcome branch? No — seeded determinism only needs same-input→same-path, which holds because rng call count varies only by outcome, and outcome is itself rng-derived (server and client run identical code with identical seeds). No extra care needed.

- [ ] **Step 7: Spawn share + visuals + teach + i18n**

blastWaveConfig.ts:
- Add near the other SHARE constants: `const MYSTERY_SHARE = 0.04;`
- In `getWaveDistribution`: add `let mystery = 0;` beside the other lets; give it a gate consistent with the flags style — simplest: `if ((config.featuredSpecials ?? []).includes('mystery')) { mystery = MYSTERY_SHARE; takeShare(MYSTERY_SHARE); }` — and add `mystery,` to the `raw` record. (The roster filter then boosts it to ≥0.10 on featured waves; on non-featured waves it's absent entirely.)

blastTileVisuals.ts: add a `mystery` entry following the existing per-type pattern — icon `CircleHelp` (add to the lucide import), face `solid('#B7A6FF', '#4C1D95')` (violet family, distinct from prism's near-white).

blastColorTokens.ts: `SHATTER_COLORS.mystery = ['#B7A6FF', '#8B5CF6', '#EDE9FE'];`

lib/blast/blastTileFirstUse.ts: append `'mystery'` to `BLAST_TEACHABLE_ORDER`.

Find the first-use callout copy keys: `grep -n "blast.tileGuide\|firstUse\|tileCallout" translations/en.js | head -5` and follow the existing key pattern for the other tiles; add a `mystery` entry in ALL 6 locale files. Copy direction: EN "Mystery tile — clear it for a random surprise!" (native, playful, per-locale; use the fe-next:ux-writer skill conventions — short, no literal translation).

- [ ] **Step 8: Run tests + typecheck**

Run: `cd fe-next && npx vitest run components/blast/legacy/utils/__tests__/ && npx tsc --noEmit 2>&1 | grep -E "blast|mystery" | head`
Expected: tests PASS; tsc may surface exhaustive-switch sites over `BlastTileType` (e.g., tile guides, visuals maps) — add the `mystery` entry at each until clean.

- [ ] **Step 9: Commit**

```bash
git add fe-next/shared/types/blast.ts fe-next/components/blast/legacy/utils/blastMysteryTile.ts fe-next/components/blast/legacy/utils/__tests__/ fe-next/components/blast/legacy/utils/clearTilesProcessor.ts fe-next/components/blast/legacy/blastTileVisuals.ts fe-next/components/blast/legacy/blastColorTokens.ts fe-next/components/blast/legacy/utils/blastWaveConfig.ts fe-next/lib/blast/blastTileFirstUse.ts translations/
git commit -m "feat(blast): mystery '?' tile — seeded surprise outcomes, zero memorization burden"
```

---

### Task 5: Jackpot celebration moment

**Files:**
- Modify: `fe-next/components/blast/legacy/hooks/useBlastWordHandler.ts:132-200` (jackpot branch)
- Test: extend `fe-next/components/blast/legacy/hooks/__tests__/useBlastWordHandler.test.ts` (or nearest existing suite for this hook — find with `ls components/blast/legacy/hooks/__tests__/`)
- Modify: `translations/{en,he,sv,ja,es,ru}.js` (praise key)

**Interfaces:**
- Consumes: `treasureTier` already computed at useBlastWordHandler.ts:146; the hook's existing FX channels — it already sets score-fly events with `luckyTier`; a `setComboFlash` / praise setter should be reachable in its deps (verify at impl: `grep -n "setComboFlash\|praise\|Praise" components/blast/legacy/hooks/useBlastWordHandler.ts`).
- Produces: on `treasureTier === 'jackpot'` ONLY: comboFlash `{ id, tier: 3 }` + mascot event + praise text `t('blast.treasure.jackpot')`. Lucky tier stays exactly as today.

- [ ] **Step 1: Write the failing test** — in the hook's existing test suite, add a case: submit a word with an rng/seed forcing jackpot (`rollTreasure` is deterministic — pick a seed that yields jackpot by scanning: in the test, loop seeds 0..100 to find one where `rollTreasure({seed, base: 20}).tier === 'jackpot'`, then use it). Assert the comboFlash setter was called with `tier: 3` and the praise/flash channel fired; assert a `lucky`-tier seed does NOT fire it.

- [ ] **Step 2: Run to verify it fails.** `cd fe-next && npx vitest run components/blast/legacy/hooks/__tests__/ -t jackpot` — FAIL.

- [ ] **Step 3: Implement** — in useBlastWordHandler.ts after the treasure roll (line ~146):

```typescript
    if (treasureTier === 'jackpot') {
      // The 5% moment — make it unmistakably bigger than lucky.
      setComboFlash({ id: `jackpot-${flyIdRef.current}`, tier: 3 });
      try { emitMascotEvent({ kind: 'cascade-detected', chainDepth: 3 }); } catch { /* decorative */ }
    }
```

Match the actual setter/props available in this hook's deps (the score-fly already carries `luckyTier: 'jackpot'` for the gold tag — keep that). If `setComboFlash` isn't in deps, thread it from `BlastGame.tsx` the same way `useBlastCascade` receives it (BlastGame already owns it). Praise copy: where the hook (or BlastGame) surfaces word praise, show `t('blast.treasure.jackpot')` ("JACKPOT!") for this tier — add the key ×6 locales.

- [ ] **Step 4: Run to verify pass**, then run the hook's full suite.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/legacy/hooks/useBlastWordHandler.ts fe-next/components/blast/legacy/hooks/__tests__/ fe-next/components/blast/legacy/BlastGame.tsx translations/
git commit -m "feat(blast): jackpot treasure tier gets a real celebration moment"
```

---

### Task 6: Wave intro featured-tile chip + archetype-tinted wave-clear

**Files:**
- Modify: `fe-next/components/blast/legacy/BlastWaveIntro.tsx` (props + chip)
- Modify: caller of `BlastWaveIntro` (find with `grep -rn "BlastWaveIntro" components/blast/legacy --include="*.tsx" | grep -v __tests__ | grep -v "BlastWaveIntro.tsx"`) to pass `featured`
- Modify: `fe-next/components/blast/legacy/BlastWaveClearText.tsx` (accent tint via existing `ARCHETYPE_ACCENT` if not already)
- Test: extend the existing `BlastWaveIntro` test (find under `components/blast/legacy/__tests__/`)
- Modify: `translations/{en,he,sv,ja,es,ru}.js` (short "featured tile" line per teachable type if no reusable key exists)

**Interfaces:**
- Consumes: `BlastWaveIntroProps { waveNumber, archetype, t }` (BlastWaveIntro.tsx:8-24), `ARCHETYPE_ACCENT` (already imported there), `getFeaturedSpecialsForWave` from Task 3, tile visuals from `blastTileVisuals.ts` for the chip icon.
- Produces: `BlastWaveIntroProps.featured?: readonly BlastTileType[]` — intro renders one chip per featured tile: its icon + name + one-line description (reuse the first-use copy keys from `blastTileFirstUse` if they exist per-type; else add `blast.featured.<type>` ×6).

- [ ] **Step 1: Failing test** — render `BlastWaveIntro` with `featured: ['prism']`, assert the chip text/icon appears; with `featured: []` assert no chip.
- [ ] **Step 2: Verify fail.** `npx vitest run components/blast/legacy/__tests__/ -t featured` (adjust path to the real test file).
- [ ] **Step 3: Implement** — small framer-motion chip row under the archetype label, styled with `ARCHETYPE_ACCENT[archetype]` border + hard shadow (match the file's existing styling idiom). Caller passes `getFeaturedSpecialsForWave(waveNumber)`.
- [ ] **Step 4: Wave-clear tint** — in `BlastWaveClearText.tsx`, if the celebratory text/flash has a hardcoded accent, switch it to `ARCHETYPE_ACCENT[archetype]` (thread `archetype` prop from its caller if missing). Skip if it already uses the accent (verify first — this may be a no-op).
- [ ] **Step 5: Verify pass + suite green.**
- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/legacy/BlastWaveIntro.tsx fe-next/components/blast/legacy/BlastWaveClearText.tsx fe-next/components/blast/legacy/__tests__/ translations/ && git add -u fe-next/components/blast/legacy
git commit -m "feat(blast): wave intro shows featured tiles; wave-clear tinted by archetype"
```

---

### Task 7: Cascade praise ramp (chain-depth copy escalation)

**Files:**
- Inspect first: `fe-next/components/blast/legacy/BlastChainText.tsx` (props at line 7) and where chain text copy comes from (`grep -n "chain" translations/en.js | head`).
- Modify: `BlastChainText.tsx` + `translations/{en,he,sv,ja,es,ru}.js` ONLY IF current copy does not already escalate by chain depth (it may — verify). If it escalates already, mark this task done with no change.

**Interfaces:**
- Consumes: `BlastChainTextProps` (chainLevel already flows in — verify prop name at line 7).
- Produces: chain-depth-keyed copy `blast.chain.praise.{2,3,4,5}` — e.g. EN: "SWEET!" / "BLAZING!" / "UNSTOPPABLE!" / "LEGENDARY!" — native per locale (6 files), rendered with existing styling; depth ≥5 clamps to the 5 key.

- [ ] **Step 1: Verify current behavior** — read `BlastChainText.tsx` fully (small file). If copy already varies by depth, STOP: task complete, note it.
- [ ] **Step 2 (if flat): failing test** — render with `chainLevel: 2` and `chainLevel: 4`, assert different praise strings.
- [ ] **Step 3: Implement** — map clamped depth → `t(\`blast.chain.praise.${Math.min(level,5)}\`)`; add 4 keys ×6 locales.
- [ ] **Step 4: Verify pass. Commit**

```bash
git add fe-next/components/blast/legacy/BlastChainText.tsx fe-next/components/blast/legacy/__tests__/ translations/
git commit -m "feat(blast): cascade praise copy escalates with chain depth"
```

---

### Task 8: Full verification sweep

**Files:** none new.

- [ ] **Step 1: Full blast test surface**

Run: `cd fe-next && npx vitest run components/blast/legacy lib/blast backend/__tests__/wordHandler.blastBoardSync.test.ts backend/modules/__tests__ 2>&1 | tail -15`
Expected: all green.

- [ ] **Step 2: Lint changed files**

Run: `cd fe-next && npm run lint 2>&1 | tail -5`
Expected: 0 errors.

- [ ] **Step 3: Typecheck + build**

Run: `cd fe-next && npx tsc --noEmit 2>&1 | tail -5 && npm run build 2>&1 | tail -5; echo "RC=$?"`
Expected: tsc clean; build `RC=0` (verify by the RC sentinel, not the wrapper — and check `.next/BUILD_ID` freshness if run in background).

- [ ] **Step 4: Translation completeness** — `grep -c "blast" translations/ru.js` style spot-checks for each new key in all 6 files (or run the clean-translations skill's check if available).

- [ ] **Step 5: Live smoke (manual/Playwriter)** — load `/blast?locale=en` locally: wave 3 intro shows prism chip; board shows ≤6 special kinds; cascade clears one find per chain step; play until a mystery tile appears (W5). Also `?locale=he` for RTL of the new chip.

- [ ] **Step 6: Commit any test/lint fixups**

```bash
git add -A fe-next translations && git commit -m "chore(blast): validation fixes for feel/wave-identity batch"
```

---

## Self-review notes

- Spec W1.1/W1.2 → Task 1; W1.3/W1.4 → Task 2; W1.5 resolved: shared modules make MP consistent by construction (no SP-gating needed).
- Spec W2.1 → Task 3; W2.2 archetype numeric hooks: DROPPED as separate mechanism — the roster itself is the archetype's mechanical identity (treasureHunt waves feature gem-like tiles etc. via rotation); wave table numbers already vary moves/specialChance per archetype. Recorded deviation from spec, YAGNI.
- Spec W2.3 → Task 6 (accent system already exists — extend, not build).
- Spec W3.1 → Task 5; W3.2 → Task 4; W3.3 → Task 7.
- Spec W4.1 (dead-end sweep): `planSugarCrush` + `SUGAR_CRUSH_STAGGER_MS`/`AUTO_TRIGGER_STAGGER_MS` already implement staged dead-end clearing — verify in Task 8 smoke, no build task.
- Spec W4.2 (pitch ramp): `playCascadeChain(level)` already takes the chain level — verify in smoke, no build task.
- Type consistency checked: `selectCascadeFinds`, `applyFeaturedRoster`, `getFeaturedSpecialsForWave`, `rollMysteryOutcome`, `overflowSurge`, `featuredSpecials` names used consistently across tasks.
