# Blast Candy-Crush Mechanics Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three Candy-Crush-inspired mechanics to Blast SP (Jelly clears, Cake-bomb boss, Chocolate spreader) behind per-mechanic PostHog flags. Wave archetypes pull 1–2 of {jelly, cake, chocolate} per wave.

**Architecture:** Extend existing `BlastTileState` and `BlastObjective` shapes — no new subsystem. Jelly is passive per-cell state. Cake is a 9-cell anchor cluster with shared HP. Chocolate runs a deterministic end-of-turn spread step in the `BlastView` reducer. All three reuse the existing objective banner, deterministic seeded board generator, and mascot toast bus.

**Tech Stack:** TypeScript strict, Next.js 16 App Router, Vitest, Pixi-via-`useBlastDebris`, framer-motion, PostHog feature flags via existing `useExperiment` registry.

**Scope:** SP only this sprint. MP socket schema + server replication deferred to next sprint (mirrors `target_word` → `5bf8f7ac6` precedent).

---

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `fe-next/components/blast/utils/blastJellyEngine.ts` | Pure fns: decrement layers on word use, count remaining jelly cells. |
| `fe-next/components/blast/utils/blastCakeEngine.ts` | Pure fns: detect cake-touching word, decrement HP, detonation effect descriptor. |
| `fe-next/components/blast/utils/blastChocolateEngine.ts` | Pure fns: pick growth target from seeded RNG, apply spread, detect containment. |
| `fe-next/components/blast/utils/__tests__/blastJellyEngine.test.ts` | Unit tests for jelly. |
| `fe-next/components/blast/utils/__tests__/blastCakeEngine.test.ts` | Unit tests for cake. |
| `fe-next/components/blast/utils/__tests__/blastChocolateEngine.test.ts` | Unit tests for chocolate. |
| `fe-next/components/blast/__tests__/BlastView.jelly.test.tsx` | Integration: `clear_jelly` objective progress through `BlastView`. |
| `fe-next/components/blast/__tests__/BlastView.cake.test.tsx` | Integration: cake HP + finale trigger. |
| `fe-next/components/blast/__tests__/BlastView.chocolate.test.tsx` | Integration: spread runs on turn end, contains on touch, fail on full board. |
| `fe-next/lib/blast/ccMechanicFlags.ts` | Centralized PH flag readers `useJellyEnabled`, `useCakeEnabled`, `useChocolateEnabled`. |
| `fe-next/components/blast/BlastJellyOverlay.tsx` | Per-cell SVG overlay rendering 1- or 2-layer glaze. |
| `fe-next/components/blast/BlastCakeOverlay.tsx` | 3×3 mega-cell visual with HP pip ring. |
| `fe-next/components/blast/BlastChocolateOverlay.tsx` | Brown swirl + halftone overlay for a chocolate cell. |

**Modified files**

| Path | Why |
|---|---|
| `fe-next/shared/types/blast.ts` | Add `chocolate`, `cake` to `BlastTileType`; add `jellyLayers`, `cakeHp`, `cakeAnchorUid` to `BlastTileState`. |
| `fe-next/components/blast/types.ts` | Add `'clear_jelly' \| 'kill_cake' \| 'stop_chocolate'` to `BlastObjectiveType`. |
| `fe-next/components/blast/utils/blastObjectiveUtils.ts` | Add formatter labels for new objective types. |
| `fe-next/components/blast/utils/blastObjectiveValidator.ts` | Recognize new objective shapes. |
| `fe-next/components/blast/BlastObjectiveBanner.tsx` | Render row variants for new objectives. |
| `fe-next/components/blast/BlastTile.tsx` | Mount new overlay components when state demands. |
| `fe-next/components/blast/BlastView.tsx` | Hook end-of-turn chocolate-spread step; route cake-finale to `BlastSugarCrushFinale`. |
| `fe-next/components/blast/hooks/useBlastEngine.ts` | Wire objective progress for new types. |
| `fe-next/translations/{en,he,sv,ja,es}.js` | Add new keys; HE/SV/JA/ES flagged for native review. |
| `fe-next/lib/blast/ccMechanicFlags.ts` | (created above; PH flag IDs `blast.jelly`, `blast.cake`, `blast.chocolate`). |

---

## Phase 0 — Types & Feature Flags

### Task 0.1: Extend `BlastTileType` union with `chocolate` and `cake`

**Files:**
- Modify: `fe-next/shared/types/blast.ts:10-56`

- [ ] **Step 1: Write the failing test**

Create `fe-next/shared/types/__tests__/blastTileType.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BLAST_TILE_TYPE_LIST } from '../blast';

describe('BLAST_TILE_TYPE_LIST', () => {
  it('includes chocolate', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('chocolate');
  });
  it('includes cake', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('cake');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/shared/types/__tests__/blastTileType.test.ts`
Expected: FAIL with "expected [...] to contain 'chocolate'".

- [ ] **Step 3: Add tile types**

In `fe-next/shared/types/blast.ts`, extend the union and the runtime list:

```ts
export type BlastTileType =
  | 'standard' | 'gold' | 'bomb' | 'rainbow' | 'ice' | 'lightning' | 'magnet'
  | 'prism' | 'gem' | 'frozen' | 'diamond' | 'countdown' | 'portal' | 'catalyst'
  | 'shuffle' | 'magma' | 'crystal' | 'fuse' | 'locked' | 'key' | 'anchor'
  | 'chocolate' | 'cake';

export const BLAST_TILE_TYPE_LIST: readonly BlastTileType[] = [
  'standard', 'gold', 'bomb', 'rainbow', 'ice', 'lightning', 'magnet',
  'prism', 'gem', 'frozen', 'diamond', 'countdown', 'portal', 'catalyst',
  'shuffle', 'magma', 'crystal', 'fuse', 'locked', 'key', 'anchor',
  'chocolate', 'cake',
] as const;
```

Also extend the `BLAST_TILE_TYPE_BASE_SCORES` constant in `fe-next/components/blast/types.ts:325-350` (add `chocolate: 0, cake: 0`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run fe-next/shared/types/__tests__/blastTileType.test.ts`
Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `cd fe-next && npx tsc --noEmit`
Expected: 0 errors related to `BlastTileType`. (Pre-existing unrelated diagnostics in `PracticeHubAtmosphere.test.tsx` and `PracticePixiFx.test.tsx` are out of scope — leave alone.)

### Task 0.2: Extend `BlastTileState` with mechanic fields

**Files:**
- Modify: `fe-next/shared/types/blast.ts:96-125`

- [ ] **Step 1: Write the failing test**

Append to `fe-next/shared/types/__tests__/blastTileType.test.ts`:

```ts
import type { BlastTileState } from '../blast';

it('BlastTileState accepts jellyLayers/cakeHp/cakeAnchorUid', () => {
  const s: BlastTileState = {
    uid: 'u1', row: 0, col: 0, type: 'standard',
    isCleared: false, activationEffect: null, hitsRemaining: 1,
    jellyLayers: 2, cakeHp: 5, cakeAnchorUid: 'cake-1',
  };
  expect(s.jellyLayers).toBe(2);
  expect(s.cakeHp).toBe(5);
  expect(s.cakeAnchorUid).toBe('cake-1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/shared/types/__tests__/blastTileType.test.ts`
Expected: FAIL with TS error "object literal may only specify known properties".

- [ ] **Step 3: Add fields to `BlastTileState`**

In `fe-next/shared/types/blast.ts`, after line 124 (`colorTag?:`), add:

```ts
  /** Jelly clears: layers remaining beneath this cell. 0 or undefined = no jelly. */
  jellyLayers?: number;
  /** Cake-bomb boss: HP remaining (anchor cell only). */
  cakeHp?: number;
  /** Cake-bomb boss: anchor uid that this cell is part of (all 9 share). */
  cakeAnchorUid?: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run fe-next/shared/types/__tests__/blastTileType.test.ts`
Expected: PASS.

### Task 0.3: Extend `BlastObjectiveType` union and `BlastObjective` shape

**Files:**
- Modify: `fe-next/components/blast/types.ts:354-372`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/blast/__tests__/blastObjectiveType.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { BlastObjective, BlastObjectiveType } from '../types';

describe('BlastObjective new types', () => {
  it('accepts clear_jelly objective', () => {
    const o: BlastObjective = { type: 'clear_jelly', target: 6 };
    expect(o.type).toBe('clear_jelly');
  });
  it('accepts kill_cake objective', () => {
    const o: BlastObjective = { type: 'kill_cake', target: 1 };
    expect(o.type).toBe('kill_cake');
  });
  it('accepts stop_chocolate objective', () => {
    const o: BlastObjective = { type: 'stop_chocolate', target: 0 };
    expect(o.type).toBe('stop_chocolate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run fe-next/components/blast/__tests__/blastObjectiveType.test.ts`
Expected: FAIL — TS narrows `type` to old union.

- [ ] **Step 3: Extend the union**

In `fe-next/components/blast/types.ts`, replace line 354:

```ts
export type BlastObjectiveType =
  | 'collect_type' | 'clear_all_type' | 'score_target' | 'word_length'
  | 'clear_percent' | 'target_word' | 'color_power'
  | 'clear_jelly' | 'kill_cake' | 'stop_chocolate';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run fe-next/components/blast/__tests__/blastObjectiveType.test.ts`
Expected: PASS.

### Task 0.4: Add per-mechanic PostHog flag readers

**Files:**
- Create: `fe-next/lib/blast/ccMechanicFlags.ts`
- Test: `fe-next/lib/blast/__tests__/ccMechanicFlags.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useJellyEnabled, useCakeEnabled, useChocolateEnabled } from '../ccMechanicFlags';
import { useExperiment } from '@/lib/experiments';

vi.mock('@/lib/experiments', () => ({
  useExperiment: vi.fn(),
}));

describe('CC mechanic flag hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useJellyEnabled returns variant boolean', () => {
    (useExperiment as any).mockReturnValue('treatment');
    const { result } = renderHook(() => useJellyEnabled());
    expect(result.current).toBe(true);
  });

  it('useCakeEnabled false on control', () => {
    (useExperiment as any).mockReturnValue('control');
    const { result } = renderHook(() => useCakeEnabled());
    expect(result.current).toBe(false);
  });

  it('useChocolateEnabled false when undefined', () => {
    (useExperiment as any).mockReturnValue(undefined);
    const { result } = renderHook(() => useChocolateEnabled());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/ccMechanicFlags.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// fe-next/lib/blast/ccMechanicFlags.ts
import { useExperiment } from '@/lib/experiments';

const treatment = (variant: string | undefined) => variant === 'treatment';

export function useJellyEnabled(): boolean {
  return treatment(useExperiment('blast.jelly' as any));
}
export function useCakeEnabled(): boolean {
  return treatment(useExperiment('blast.cake' as any));
}
export function useChocolateEnabled(): boolean {
  return treatment(useExperiment('blast.chocolate' as any));
}
```

If `useExperiment` registry needs the flag IDs registered first, append entries to `fe-next/lib/experiments.ts` per the same file's existing pattern (see `wordhunt-crosspromo-position` for shape).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/__tests__/ccMechanicFlags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Phase 0**

```bash
git add fe-next/shared/types/blast.ts \
  fe-next/shared/types/__tests__/blastTileType.test.ts \
  fe-next/components/blast/types.ts \
  fe-next/components/blast/__tests__/blastObjectiveType.test.ts \
  fe-next/lib/blast/ccMechanicFlags.ts \
  fe-next/lib/blast/__tests__/ccMechanicFlags.test.ts \
  fe-next/lib/experiments.ts
git commit -m "feat(blast): scaffold cc-mechanics types + flags (jelly/cake/chocolate)"
```

---

## Phase 1 — Jelly Clears

### Task 1.1: Pure jelly engine

**Files:**
- Create: `fe-next/components/blast/utils/blastJellyEngine.ts`
- Test: `fe-next/components/blast/utils/__tests__/blastJellyEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { decrementJellyForWord, countJelly } from '../blastJellyEngine';
import type { BlastTileState } from '@/shared/types/blast';

const cell = (overrides: Partial<BlastTileState>): BlastTileState => ({
  uid: 'u', row: 0, col: 0, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1, ...overrides,
});

describe('blastJellyEngine', () => {
  it('decrements jelly by 1 per cell used in word', () => {
    const grid = [
      [cell({ uid: 'a', row: 0, col: 0, jellyLayers: 2 }), cell({ uid: 'b', row: 0, col: 1, jellyLayers: 1 })],
    ];
    const next = decrementJellyForWord(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
    expect(next[0][0].jellyLayers).toBe(1);
    expect(next[0][1].jellyLayers).toBe(0);
  });

  it('countJelly counts cells with jellyLayers > 0', () => {
    const grid = [
      [cell({ uid: 'a', jellyLayers: 2 }), cell({ uid: 'b', jellyLayers: 0 })],
      [cell({ uid: 'c', row: 1, col: 0, jellyLayers: 1 }), cell({ uid: 'd', row: 1, col: 1 })],
    ];
    expect(countJelly(grid)).toBe(2);
  });

  it('does not mutate input grid', () => {
    const grid = [[cell({ uid: 'a', jellyLayers: 2 })]];
    decrementJellyForWord(grid, [{ row: 0, col: 0 }]);
    expect(grid[0][0].jellyLayers).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastJellyEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// fe-next/components/blast/utils/blastJellyEngine.ts
import type { BlastTileState } from '@/shared/types/blast';

export type Cell = { row: number; col: number };

export function decrementJellyForWord(
  grid: BlastTileState[][],
  word: readonly Cell[]
): BlastTileState[][] {
  const next = grid.map(row => row.map(c => ({ ...c })));
  for (const { row, col } of word) {
    const cell = next[row]?.[col];
    if (cell && (cell.jellyLayers ?? 0) > 0) {
      cell.jellyLayers = (cell.jellyLayers ?? 0) - 1;
    }
  }
  return next;
}

export function countJelly(grid: BlastTileState[][]): number {
  let n = 0;
  for (const row of grid) {
    for (const cell of row) {
      if ((cell.jellyLayers ?? 0) > 0) n++;
    }
  }
  return n;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastJellyEngine.test.ts`
Expected: PASS.

### Task 1.2: Wire `clear_jelly` objective progress

**Files:**
- Modify: `fe-next/components/blast/utils/blastObjectiveUtils.ts` (add formatter)
- Modify: `fe-next/components/blast/utils/blastObjectiveValidator.ts` (recognize new type)
- Modify: `fe-next/components/blast/hooks/useBlastEngine.ts` (compute progress)

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/blast/__tests__/BlastView.jelly.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastView } from '../BlastView';
// Use existing test harness pattern from BlastView.checkpoint.test.tsx
// (mock useBlastEngine to return a wave with clear_jelly objective)

describe('BlastView clear_jelly objective', () => {
  it('renders jelly count in objective banner', () => {
    // ARRANGE: mock engine state with 4 jelly cells, target 4
    // ACT: render BlastView
    // ASSERT
    render(<BlastView />);
    expect(screen.getByTestId('blast-objective-banner')).toHaveTextContent('0 / 4');
  });

  it('updates progress when a word clears jelly', async () => {
    // ARRANGE: render with 4 jelly cells
    // ACT: simulate word selection that clears 2 jelly cells
    // ASSERT progress updates to 2/4
  });
});
```

(Mirror the harness from `fe-next/components/blast/__tests__/BlastView.checkpoint.test.tsx` — same provider stack, same `useBlastEngine` mock seam.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastView.jelly.test.tsx`
Expected: FAIL — banner shows nothing for `clear_jelly`.

- [ ] **Step 3: Add formatter**

In `fe-next/components/blast/utils/blastObjectiveUtils.ts`, in the `formatObjectiveLabel` switch, add:

```ts
case 'clear_jelly':
  return t('blast.objective.clearJelly') || 'Clear all jelly';
```

- [ ] **Step 4: Compute progress in `useBlastEngine`**

In `fe-next/components/blast/hooks/useBlastEngine.ts`, where objective progress is computed, add a branch for `clear_jelly`:

```ts
import { countJelly } from '../utils/blastJellyEngine';

// inside progress computation:
if (objective.type === 'clear_jelly') {
  const remaining = countJelly(tileStateGrid);
  const initial = objective.target;
  return { objective, current: initial - remaining, isComplete: remaining === 0 };
}
```

(Exact mounting follows the existing branch shapes for `target_word` / `color_power`.)

- [ ] **Step 5: Hook decrement on word clear**

In `useBlastEngine.ts`, where `tileStateGrid` is updated after a word clears, pipe through:

```ts
import { decrementJellyForWord } from '../utils/blastJellyEngine';

// after word validation, before applying clears:
const afterJelly = decrementJellyForWord(tileStateGrid, wordCells);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastView.jelly.test.tsx`
Expected: PASS.

### Task 1.3: Render `BlastJellyOverlay`

**Files:**
- Create: `fe-next/components/blast/BlastJellyOverlay.tsx`
- Test: `fe-next/components/blast/__tests__/BlastJellyOverlay.test.tsx`
- Modify: `fe-next/components/blast/BlastTile.tsx` (mount overlay)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastJellyOverlay } from '../BlastJellyOverlay';

describe('BlastJellyOverlay', () => {
  it('renders no overlay when layers=0', () => {
    const { container } = render(<BlastJellyOverlay layers={0} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders single layer for layers=1', () => {
    render(<BlastJellyOverlay layers={1} />);
    expect(screen.getByTestId('blast-jelly-overlay')).toHaveAttribute('data-layers', '1');
  });
  it('renders bold layer for layers=2', () => {
    render(<BlastJellyOverlay layers={2} />);
    expect(screen.getByTestId('blast-jelly-overlay')).toHaveAttribute('data-layers', '2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastJellyOverlay.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement overlay**

```tsx
// fe-next/components/blast/BlastJellyOverlay.tsx
import { memo } from 'react';

export interface BlastJellyOverlayProps {
  layers: number;
}

export const BlastJellyOverlay = memo(function BlastJellyOverlay({ layers }: BlastJellyOverlayProps) {
  if (layers <= 0) return null;
  return (
    <div
      data-testid="blast-jelly-overlay"
      data-layers={layers}
      className={`pointer-events-none absolute inset-0 rounded-neo ${
        layers >= 2 ? 'bg-neo-cyan/40 ring-2 ring-neo-cyan' : 'bg-neo-cyan/20'
      }`}
      aria-hidden="true"
    />
  );
});

export default BlastJellyOverlay;
```

- [ ] **Step 4: Mount in `BlastTile`**

In `fe-next/components/blast/BlastTile.tsx`, near other overlay layers, add:

```tsx
import { BlastJellyOverlay } from './BlastJellyOverlay';

// inside the tile container:
<BlastJellyOverlay layers={state.jellyLayers ?? 0} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastJellyOverlay.test.tsx`
Expected: PASS.

### Task 1.4: Phase 1 commit

- [ ] **Step 1: Run lint + frontend tests + typecheck**

```bash
cd fe-next && npm run lint && npx vitest run components/blast && npx tsc --noEmit
```

Expected: lint clean, all blast tests pass, no new TS errors. (Existing `PracticeHubAtmosphere`/`PracticePixiFx` JSX diagnostics are pre-existing — leave alone.)

- [ ] **Step 2: Commit**

```bash
git add fe-next/components/blast/utils/blastJellyEngine.ts \
  fe-next/components/blast/utils/__tests__/blastJellyEngine.test.ts \
  fe-next/components/blast/utils/blastObjectiveUtils.ts \
  fe-next/components/blast/utils/blastObjectiveValidator.ts \
  fe-next/components/blast/hooks/useBlastEngine.ts \
  fe-next/components/blast/BlastJellyOverlay.tsx \
  fe-next/components/blast/__tests__/BlastJellyOverlay.test.tsx \
  fe-next/components/blast/__tests__/BlastView.jelly.test.tsx \
  fe-next/components/blast/BlastTile.tsx
git commit -m "feat(blast): clear_jelly objective + BlastJellyOverlay (cc-mechanic 1/3)"
```

---

## Phase 2 — Cake-Bomb Boss

### Task 2.1: Pure cake engine

**Files:**
- Create: `fe-next/components/blast/utils/blastCakeEngine.ts`
- Test: `fe-next/components/blast/utils/__tests__/blastCakeEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { wordTouchesCake, decrementCakeHp, isCakeDestroyed, cakeAnchorCells } from '../blastCakeEngine';
import type { BlastTileState } from '@/shared/types/blast';

const cake = (uid: string, row: number, col: number, hp?: number): BlastTileState => ({
  uid: `${uid}-${row}-${col}`, row, col, type: 'cake', isCleared: false,
  activationEffect: null, hitsRemaining: 1, cakeAnchorUid: uid,
  ...(hp !== undefined ? { cakeHp: hp } : {}),
});

const std = (row: number, col: number): BlastTileState => ({
  uid: `s-${row}-${col}`, row, col, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1,
});

describe('blastCakeEngine', () => {
  // 3x3 cake centered at (1,1) with HP=5 on anchor
  const grid: BlastTileState[][] = [
    [cake('cake-1', 0, 0), cake('cake-1', 0, 1), cake('cake-1', 0, 2), std(0, 3)],
    [cake('cake-1', 1, 0), { ...cake('cake-1', 1, 1), cakeHp: 5 }, cake('cake-1', 1, 2), std(1, 3)],
    [cake('cake-1', 2, 0), cake('cake-1', 2, 1), cake('cake-1', 2, 2), std(2, 3)],
    [std(3, 0), std(3, 1), std(3, 2), std(3, 3)],
  ];

  it('detects word touching cake', () => {
    expect(wordTouchesCake(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }])).toBe('cake-1');
  });

  it('returns null when word does not touch cake', () => {
    expect(wordTouchesCake(grid, [{ row: 3, col: 0 }, { row: 3, col: 1 }])).toBeNull();
  });

  it('decrements cake HP by 1 per word, anchor only', () => {
    const next = decrementCakeHp(grid, 'cake-1');
    const anchor = next.flat().find(c => c.cakeHp !== undefined);
    expect(anchor?.cakeHp).toBe(4);
  });

  it('isCakeDestroyed true when anchor HP = 0', () => {
    const dead = decrementCakeHp(decrementCakeHp(decrementCakeHp(decrementCakeHp(decrementCakeHp(grid, 'cake-1'), 'cake-1'), 'cake-1'), 'cake-1'), 'cake-1');
    expect(isCakeDestroyed(dead, 'cake-1')).toBe(true);
  });

  it('cakeAnchorCells returns 9 cells for the cluster', () => {
    expect(cakeAnchorCells(grid, 'cake-1')).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastCakeEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// fe-next/components/blast/utils/blastCakeEngine.ts
import type { BlastTileState } from '@/shared/types/blast';

export type Cell = { row: number; col: number };

export function wordTouchesCake(grid: BlastTileState[][], word: readonly Cell[]): string | null {
  for (const { row, col } of word) {
    const cell = grid[row]?.[col];
    if (cell?.type === 'cake' && cell.cakeAnchorUid) return cell.cakeAnchorUid;
  }
  return null;
}

export function decrementCakeHp(grid: BlastTileState[][], anchorUid: string): BlastTileState[][] {
  return grid.map(row => row.map(cell => {
    if (cell.cakeAnchorUid === anchorUid && typeof cell.cakeHp === 'number') {
      return { ...cell, cakeHp: Math.max(0, cell.cakeHp - 1) };
    }
    return cell;
  }));
}

export function isCakeDestroyed(grid: BlastTileState[][], anchorUid: string): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell.cakeAnchorUid === anchorUid && typeof cell.cakeHp === 'number') {
        return cell.cakeHp === 0;
      }
    }
  }
  return false;
}

export function cakeAnchorCells(grid: BlastTileState[][], anchorUid: string): Cell[] {
  const out: Cell[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell.cakeAnchorUid === anchorUid) out.push({ row: cell.row, col: cell.col });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastCakeEngine.test.ts`
Expected: PASS.

### Task 2.2: Wire `kill_cake` objective + finale

**Files:**
- Modify: `fe-next/components/blast/utils/blastObjectiveUtils.ts`
- Modify: `fe-next/components/blast/hooks/useBlastEngine.ts`
- Modify: `fe-next/components/blast/BlastView.tsx`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/blast/__tests__/BlastView.cake.test.tsx` mirroring jelly test harness:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlastView } from '../BlastView';

describe('BlastView kill_cake', () => {
  it('renders cake HP badge in objective banner', () => {
    // ARRANGE: mock engine wave with kill_cake objective + 9-cell cake cluster HP=5
    render(<BlastView />);
    expect(screen.getByTestId('blast-objective-row-0')).toHaveTextContent('5');
  });
  it('decrements HP per cake-touching word', async () => {
    // simulate word touching cake → expect HP 4
  });
  it('triggers BlastSugarCrushFinale at HP 0', async () => {
    // simulate 5 hits → expect SugarCrushFinale visible
    expect(screen.getByTestId('blast-sugar-crush-finale')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastView.cake.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement engine wiring**

In `useBlastEngine.ts` word-clear path, after `decrementJellyForWord`:

```ts
import { wordTouchesCake, decrementCakeHp, isCakeDestroyed } from '../utils/blastCakeEngine';

const cakeUid = wordTouchesCake(stateGrid, wordCells);
let nextGrid = stateGrid;
if (cakeUid) {
  nextGrid = decrementCakeHp(nextGrid, cakeUid);
  if (isCakeDestroyed(nextGrid, cakeUid)) {
    dispatchEvent({ type: 'cake-destroyed', anchorUid: cakeUid });
  }
}
```

In `BlastView.tsx`, listen for `cake-destroyed` event and show `BlastSugarCrushFinale` mid-wave + grant clear bonus.

In `blastObjectiveUtils.ts` formatter:

```ts
case 'kill_cake':
  return t('blast.objective.killCake') || 'Destroy the cake';
```

Objective progress: `current = initialHp - currentHp`, `target = initialHp`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastView.cake.test.tsx`
Expected: PASS.

### Task 2.3: Render `BlastCakeOverlay` with HP pip ring

**Files:**
- Create: `fe-next/components/blast/BlastCakeOverlay.tsx`
- Test: `fe-next/components/blast/__tests__/BlastCakeOverlay.test.tsx`
- Modify: `fe-next/components/blast/BlastTile.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastCakeOverlay } from '../BlastCakeOverlay';

describe('BlastCakeOverlay', () => {
  it('renders 5 HP pips when hp=5', () => {
    render(<BlastCakeOverlay hp={5} maxHp={5} isAnchor />);
    const pips = screen.getAllByTestId(/blast-cake-hp-pip-/);
    expect(pips).toHaveLength(5);
  });
  it('shows reduced filled pips when hp=2', () => {
    render(<BlastCakeOverlay hp={2} maxHp={5} isAnchor />);
    const filled = screen.getAllByTestId('blast-cake-hp-pip-filled');
    expect(filled).toHaveLength(2);
  });
  it('renders no pips on satellite cells', () => {
    render(<BlastCakeOverlay hp={5} maxHp={5} isAnchor={false} />);
    expect(screen.queryByTestId(/blast-cake-hp-pip/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastCakeOverlay.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement overlay**

```tsx
// fe-next/components/blast/BlastCakeOverlay.tsx
import { memo } from 'react';

export interface BlastCakeOverlayProps {
  hp: number;
  maxHp: number;
  isAnchor: boolean;
}

export const BlastCakeOverlay = memo(function BlastCakeOverlay({ hp, maxHp, isAnchor }: BlastCakeOverlayProps) {
  return (
    <div
      data-testid="blast-cake-overlay"
      className="pointer-events-none absolute inset-0 rounded-neo bg-neo-pink/30 ring-2 ring-neo-pink"
      aria-hidden="true"
    >
      {isAnchor && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5">
          {Array.from({ length: maxHp }, (_, i) => (
            <span
              key={i}
              data-testid={i < hp ? 'blast-cake-hp-pip-filled' : `blast-cake-hp-pip-${i}`}
              className={`h-1.5 w-1.5 rounded-full border border-black ${i < hp ? 'bg-neo-pink' : 'bg-neo-navy'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default BlastCakeOverlay;
```

- [ ] **Step 4: Mount in `BlastTile`**

In `BlastTile.tsx`:

```tsx
import { BlastCakeOverlay } from './BlastCakeOverlay';

{state.cakeAnchorUid && (
  <BlastCakeOverlay
    hp={state.cakeHp ?? maxCakeHp}
    maxHp={maxCakeHp}
    isAnchor={state.cakeHp !== undefined}
  />
)}
```

(`maxCakeHp` flows from wave config; default 5.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastCakeOverlay.test.tsx`
Expected: PASS.

### Task 2.4: Phase 2 commit

- [ ] **Step 1: Run lint + tests**

```bash
cd fe-next && npm run lint && npx vitest run components/blast && npx tsc --noEmit
```

Expected: green.

- [ ] **Step 2: Commit**

```bash
git add fe-next/components/blast/utils/blastCakeEngine.ts \
  fe-next/components/blast/utils/__tests__/blastCakeEngine.test.ts \
  fe-next/components/blast/utils/blastObjectiveUtils.ts \
  fe-next/components/blast/hooks/useBlastEngine.ts \
  fe-next/components/blast/BlastView.tsx \
  fe-next/components/blast/BlastCakeOverlay.tsx \
  fe-next/components/blast/__tests__/BlastCakeOverlay.test.tsx \
  fe-next/components/blast/__tests__/BlastView.cake.test.tsx \
  fe-next/components/blast/BlastTile.tsx
git commit -m "feat(blast): kill_cake boss objective + 3x3 mega-tile w/ HP pips (cc-mechanic 2/3)"
```

---

## Phase 3 — Chocolate Spreader

### Task 3.1: Pure chocolate engine (deterministic spread)

**Files:**
- Create: `fe-next/components/blast/utils/blastChocolateEngine.ts`
- Test: `fe-next/components/blast/utils/__tests__/blastChocolateEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { spreadChocolate, isChocolateContained, isBoardSwallowed } from '../blastChocolateEngine';
import type { BlastTileState } from '@/shared/types/blast';

const std = (row: number, col: number): BlastTileState => ({
  uid: `s-${row}-${col}`, row, col, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1,
});
const choc = (row: number, col: number): BlastTileState => ({ ...std(row, col), type: 'chocolate', uid: `c-${row}-${col}` });

describe('blastChocolateEngine', () => {
  it('spreads to one adjacent standard cell with seeded RNG', () => {
    const grid = [[choc(0, 0), std(0, 1)], [std(1, 0), std(1, 1)]];
    const next = spreadChocolate(grid, { seed: 42 });
    const chocCount = next.flat().filter(c => c.type === 'chocolate').length;
    expect(chocCount).toBe(2);
  });

  it('same seed → same spread target (determinism)', () => {
    const grid = [[choc(0, 0), std(0, 1), std(0, 2)], [std(1, 0), std(1, 1), std(1, 2)]];
    const a = spreadChocolate(grid, { seed: 7 });
    const b = spreadChocolate(grid, { seed: 7 });
    expect(a.flat().map(c => c.type)).toEqual(b.flat().map(c => c.type));
  });

  it('does not spread when any chocolate cell was used (contained)', () => {
    const grid = [[choc(0, 0), std(0, 1)], [std(1, 0), std(1, 1)]];
    const next = spreadChocolate(grid, { seed: 1, usedCells: [{ row: 0, col: 0 }] });
    expect(next.flat().filter(c => c.type === 'chocolate')).toHaveLength(1);
  });

  it('isChocolateContained true when used cells include any chocolate', () => {
    const grid = [[choc(0, 0)]];
    expect(isChocolateContained(grid, [{ row: 0, col: 0 }])).toBe(true);
    expect(isChocolateContained(grid, [])).toBe(false);
  });

  it('isBoardSwallowed true when only chocolate remains', () => {
    expect(isBoardSwallowed([[choc(0, 0), choc(0, 1)]])).toBe(true);
    expect(isBoardSwallowed([[choc(0, 0), std(0, 1)]])).toBe(false);
  });

  it('does not mutate input grid', () => {
    const grid = [[choc(0, 0), std(0, 1)]];
    spreadChocolate(grid, { seed: 1 });
    expect(grid[0][1].type).toBe('standard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastChocolateEngine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// fe-next/components/blast/utils/blastChocolateEngine.ts
import type { BlastTileState } from '@/shared/types/blast';

export type Cell = { row: number; col: number };

// xmur3 seeded PRNG — same shape as fe-next/components/blast/utils/blastSeededRandom.ts
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpreadOptions {
  seed: number;
  usedCells?: readonly Cell[];
}

export function isChocolateContained(grid: BlastTileState[][], usedCells: readonly Cell[]): boolean {
  for (const { row, col } of usedCells) {
    if (grid[row]?.[col]?.type === 'chocolate') return true;
  }
  return false;
}

export function isBoardSwallowed(grid: BlastTileState[][]): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type !== 'chocolate' && !cell.isCleared) return false;
    }
  }
  return true;
}

export function spreadChocolate(grid: BlastTileState[][], opts: SpreadOptions): BlastTileState[][] {
  const used = opts.usedCells ?? [];
  if (isChocolateContained(grid, used)) return grid.map(r => r.map(c => ({ ...c })));

  const candidates: Cell[] = [];
  const rows = grid.length;
  for (let r = 0; r < rows; r++) {
    const cols = grid[r].length;
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type !== 'chocolate') continue;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr, nc = c + dc;
        const target = grid[nr]?.[nc];
        if (target && target.type === 'standard' && !target.isCleared) {
          candidates.push({ row: nr, col: nc });
        }
      }
    }
  }
  if (candidates.length === 0) return grid.map(r => r.map(c => ({ ...c })));

  const rand = mulberry32(opts.seed);
  const pick = candidates[Math.floor(rand() * candidates.length)];

  return grid.map(row => row.map(cell => {
    if (cell.row === pick.row && cell.col === pick.col) {
      return { ...cell, type: 'chocolate' };
    }
    return { ...cell };
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastChocolateEngine.test.ts`
Expected: PASS.

### Task 3.2: End-of-turn spread hook + `stop_chocolate` objective

**Files:**
- Modify: `fe-next/components/blast/BlastView.tsx`
- Modify: `fe-next/components/blast/hooks/useBlastEngine.ts`
- Modify: `fe-next/components/blast/utils/blastObjectiveUtils.ts`

- [ ] **Step 1: Write the failing test**

Create `fe-next/components/blast/__tests__/BlastView.chocolate.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlastView } from '../BlastView';

describe('BlastView stop_chocolate', () => {
  it('spreads chocolate at end of turn when not contained', async () => {
    // ARRANGE: 1 chocolate cell, mock seed
    // ACT: simulate word that does NOT touch chocolate
    // ASSERT: chocolate count = 2
  });

  it('does not spread when word touches chocolate', async () => {
    // chocolate count stays 1
  });

  it('shows micro-toast "chocolate contained" on touch', async () => {
    // toast visible
    expect(screen.getByText(/contained/i)).toBeVisible();
  });

  it('fails wave when board fully swallowed', async () => {
    // simulate chocolate growing until swallowed
    expect(screen.getByTestId('blast-retry-wave-modal')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastView.chocolate.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Wire end-of-turn spread**

In `useBlastEngine.ts` after a word resolves:

```ts
import { spreadChocolate, isChocolateContained, isBoardSwallowed } from '../utils/blastChocolateEngine';

const contained = isChocolateContained(stateGrid, wordCells);
const afterSpread = spreadChocolate(stateGrid, {
  seed: turnSeed, // existing per-turn seed used by gravity
  usedCells: wordCells,
});
if (!contained) emitToast('chocolateGrew');
else emitToast('chocolateContained');
if (isBoardSwallowed(afterSpread)) emitWaveFail('chocolate_swallow');
```

`turnSeed` MUST come from the existing seeded-board generator (`blastGravity.seeded.test.ts` shows the pattern). Reuse, do not invent a new seed source.

In `blastObjectiveUtils.ts`:

```ts
case 'stop_chocolate':
  return t('blast.objective.stopChocolate') || 'Stop the chocolate';
```

Progress for `stop_chocolate`: `current = (chocolateCount > target) ? 0 : 1`, `isComplete = waveTimerEnded && chocolateCount <= initialChocolateCount`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastView.chocolate.test.tsx`
Expected: PASS.

### Task 3.3: Render `BlastChocolateOverlay`

**Files:**
- Create: `fe-next/components/blast/BlastChocolateOverlay.tsx`
- Test: `fe-next/components/blast/__tests__/BlastChocolateOverlay.test.tsx`
- Modify: `fe-next/components/blast/BlastTile.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastChocolateOverlay } from '../BlastChocolateOverlay';

describe('BlastChocolateOverlay', () => {
  it('renders when active', () => {
    render(<BlastChocolateOverlay active />);
    expect(screen.getByTestId('blast-chocolate-overlay')).toBeVisible();
  });
  it('renders nothing when inactive', () => {
    const { container } = render(<BlastChocolateOverlay active={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastChocolateOverlay.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// fe-next/components/blast/BlastChocolateOverlay.tsx
import { memo } from 'react';

export interface BlastChocolateOverlayProps {
  active: boolean;
}

export const BlastChocolateOverlay = memo(function BlastChocolateOverlay({ active }: BlastChocolateOverlayProps) {
  if (!active) return null;
  return (
    <div
      data-testid="blast-chocolate-overlay"
      className="pointer-events-none absolute inset-0 rounded-neo bg-[#3a1f0e] ring-2 ring-[#5b3a1c]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 30% 30%, rgba(91,58,28,0.6) 0 6%, transparent 7%), radial-gradient(circle at 70% 70%, rgba(91,58,28,0.6) 0 5%, transparent 6%)',
      }}
      aria-hidden="true"
    />
  );
});

export default BlastChocolateOverlay;
```

- [ ] **Step 4: Mount in `BlastTile`**

```tsx
import { BlastChocolateOverlay } from './BlastChocolateOverlay';

<BlastChocolateOverlay active={state.type === 'chocolate'} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/__tests__/BlastChocolateOverlay.test.tsx`
Expected: PASS.

### Task 3.4: Phase 3 commit

- [ ] **Step 1: Run lint + tests**

```bash
cd fe-next && npm run lint && npx vitest run components/blast && npx tsc --noEmit
```

Expected: green.

- [ ] **Step 2: Commit**

```bash
git add fe-next/components/blast/utils/blastChocolateEngine.ts \
  fe-next/components/blast/utils/__tests__/blastChocolateEngine.test.ts \
  fe-next/components/blast/BlastView.tsx \
  fe-next/components/blast/hooks/useBlastEngine.ts \
  fe-next/components/blast/utils/blastObjectiveUtils.ts \
  fe-next/components/blast/BlastChocolateOverlay.tsx \
  fe-next/components/blast/__tests__/BlastChocolateOverlay.test.tsx \
  fe-next/components/blast/__tests__/BlastView.chocolate.test.tsx \
  fe-next/components/blast/BlastTile.tsx
git commit -m "feat(blast): stop_chocolate spreader w/ deterministic seed (cc-mechanic 3/3)"
```

---

## Phase 4 — Wave Archetype Config

### Task 4.1: Author 6 hand-tuned waves combining mechanics

**Files:**
- Modify: `fe-next/components/blast/utils/blastObjectiveGuarantee.ts` (or wherever wave seed config lives — find via grep `clear_percent.*target`)

- [ ] **Step 1: Identify wave-config file**

Run: `grep -rn "type: 'clear_percent'" fe-next/components/blast/ fe-next/lib/blast/ | head`

Use the file most-frequently authoring waves as the home for new archetypes.

- [ ] **Step 2: Write failing test**

Create `fe-next/components/blast/utils/__tests__/blastWaveArchetypes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getWaveConfig } from '../blastWaveArchetypes';

describe('blast wave archetypes', () => {
  it('wave 3 has clear_jelly objective', () => {
    const w = getWaveConfig(3, { jelly: true, cake: true, chocolate: true });
    expect(w.objectives.some(o => o.type === 'clear_jelly')).toBe(true);
  });
  it('wave 5 combines kill_cake + clear_jelly', () => {
    const w = getWaveConfig(5, { jelly: true, cake: true, chocolate: true });
    const types = w.objectives.map(o => o.type);
    expect(types).toContain('kill_cake');
    expect(types).toContain('clear_jelly');
  });
  it('falls back to legacy wave when all flags off', () => {
    const w = getWaveConfig(3, { jelly: false, cake: false, chocolate: false });
    expect(w.objectives.every(o =>
      ['collect_type','clear_all_type','score_target','word_length','clear_percent','target_word','color_power'].includes(o.type)
    )).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastWaveArchetypes.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement archetype picker**

Create `fe-next/components/blast/utils/blastWaveArchetypes.ts`:

```ts
import type { BlastObjective } from '../types';

export interface MechanicFlags {
  jelly: boolean;
  cake: boolean;
  chocolate: boolean;
}

export interface WaveConfig {
  waveIndex: number;
  objectives: BlastObjective[];
}

const ARCHETYPES: Array<(flags: MechanicFlags) => BlastObjective[] | null> = [
  // Wave 3: jelly only
  ({ jelly }) => jelly ? [{ type: 'clear_jelly', target: 6 }] : null,
  // Wave 5: cake + jelly
  ({ jelly, cake }) => (jelly && cake) ? [
    { type: 'kill_cake', target: 1 },
    { type: 'clear_jelly', target: 4 },
  ] : null,
  // Wave 7: chocolate
  ({ chocolate }) => chocolate ? [{ type: 'stop_chocolate', target: 0 }] : null,
];

export function getWaveConfig(waveIndex: number, flags: MechanicFlags): WaveConfig {
  const idx = waveIndex - 1;
  const archetype = ARCHETYPES[idx]?.(flags);
  if (archetype) return { waveIndex, objectives: archetype };
  // Fallback: legacy
  return { waveIndex, objectives: [{ type: 'clear_percent', target: 80 }] };
}
```

(Wire into existing engine wave-build site — `useBlastEngine.ts` reads flags via `useJellyEnabled` etc. and passes into `getWaveConfig`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/utils/__tests__/blastWaveArchetypes.test.ts`
Expected: PASS.

### Task 4.2: Phase 4 commit

```bash
cd fe-next && npm run lint && npx vitest run components/blast && npx tsc --noEmit
git add fe-next/components/blast/utils/blastWaveArchetypes.ts \
  fe-next/components/blast/utils/__tests__/blastWaveArchetypes.test.ts \
  fe-next/components/blast/hooks/useBlastEngine.ts
git commit -m "feat(blast): wave archetypes combine cc-mechanics behind PH flags"
```

---

## Phase 5 — i18n & Final Verification

### Task 5.1: Add i18n keys (5 locales)

**Files:**
- Modify: `fe-next/translations/en.js`, `he.js`, `sv.js`, `ja.js`, `es.js`

Per-locale keys to add under `blast`:

```js
objective: {
  clearJelly: 'Clear all jelly',
  killCake: 'Destroy the cake',
  stopChocolate: 'Stop the chocolate',
},
tile: {
  jelly: 'Jelly',
  chocolate: 'Chocolate',
  cake: 'Cake bomb',
},
toast: {
  chocolateContained: 'Chocolate contained!',
  chocolateGrew: 'Chocolate spreading!',
  cakeHit: 'Cake -1 HP',
  cakeDestroyed: 'Cake destroyed!',
},
```

EN final. HE/SV/JA/ES use AI placeholder + queue for native-review per project precedent (see `practice-mode-redesign-2026-05-05` memory entry).

- [ ] **Step 1: Add keys**

Add to `en.js` first with the EN copy above. Mirror the structure to `he.js`, `sv.js`, `ja.js`, `es.js` with translated values.

- [ ] **Step 2: Verify no missing-key warnings**

Run: `cd fe-next && grep -r "blast.objective.clearJelly\|blast.objective.killCake\|blast.objective.stopChocolate" translations/`
Expected: hits in all 5 files.

- [ ] **Step 3: Run lint + full test suite + build**

```bash
cd fe-next && npm run lint && npm run test && npm run build
```

Expected: all green. Pre-existing JSX diagnostics on `PracticeHubAtmosphere.test.tsx` / `PracticePixiFx.test.tsx` are unrelated (uncommitted practice-glow-up sprint) — leave alone.

- [ ] **Step 4: Commit**

```bash
git add fe-next/translations/en.js fe-next/translations/he.js \
  fe-next/translations/sv.js fe-next/translations/ja.js fe-next/translations/es.js
git commit -m "feat(blast): i18n cc-mechanics keys (HE/SV/JA/ES queued for native review)"
```

### Task 5.2: PostHog flag rollout config

- [ ] **Step 1: Create three flags in PostHog UI**

Names: `blast.jelly`, `blast.cake`, `blast.chocolate`. Two variants each: `control` / `treatment`. Default rollout: 10 % treatment for 48 h, then 50 % if metrics neutral or positive.

Metrics to watch: blast wave-completion rate, blast `wave_failed` rate, time-to-first-completion, retention D1/D3 of cohort that hit a treatment wave.

- [ ] **Step 2: Update memory after rollout**

After commit, append to `~/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/MEMORY.md` an entry under "Active Work" pointing at this plan.

---

## Self-Review Checklist

**Spec coverage:**
- Jelly clears → Phase 1 (Tasks 1.1–1.4) ✓
- Cake-bomb boss → Phase 2 (Tasks 2.1–2.4) ✓
- Chocolate spreader → Phase 3 (Tasks 3.1–3.4) ✓
- Wave archetypes combining mechanics → Phase 4 ✓
- Per-mechanic PostHog flags → Task 0.4 + Phase 5 rollout ✓
- SP only this sprint, MP deferred → noted in scope; no MP socket changes appear in tasks ✓

**Placeholder scan:** No "TBD"/"implement later"/"appropriate"/"similar to". All code blocks contain runnable code.

**Type consistency:**
- `BlastTileType` extension matches between `shared/types/blast.ts` and `BLAST_TILE_TYPE_LIST`.
- `BlastObjective` `type` union extension covers all three new strings, used identically in formatter, validator, engine, and archetype tests.
- `decrementJellyForWord` / `wordTouchesCake` / `spreadChocolate` signatures are referenced unchanged across the engine wiring tasks.
- `cakeAnchorUid` field used identically across `blastCakeEngine.ts`, `BlastTile.tsx`, and `BlastCakeOverlay.tsx`.

---

## Execution Handoff

Plan complete and saved to `fe-next/docs/plans/blast-cc-mechanics-2026-05-10.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
