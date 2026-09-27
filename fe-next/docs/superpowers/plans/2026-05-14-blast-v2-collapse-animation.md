# Blast v2 Collapse Animation Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Blast v2 tiles visibly *fall* when a word is cleared, instead of the board teleporting from its pre-collapse to post-collapse layout in a single frame.

**Architecture:** `BlastTile` is already a framer-motion `motion.div` with `layout` enabled — framer will interpolate a tile's position automatically *if its React `key` is stable across the collapse*. Today `BlastBoard` keys each tile by `cellId(col, row)` (its grid position), so a tile that falls from row 3 to row 0 looks like an unmount + remount to framer — no animation. The fix: give every tile a stable identity string that travels with it through collapses. We add a `tileIds: string[][]` slice to the `useBlastV2` reducer state (parallel to `level.columns`), transform it with the same gravity `collapseCells` applies to the tiles, and key `BlastBoard` by `tileIds[col][row]` instead of position. The synchronous reducer update *is* the animation trigger — framer's `layout` animates the resulting layout diff. No intermediate `collapsing` status, no state machine, no `setTimeout`.

**Tech Stack:** TypeScript, React `useReducer`, framer-motion `layout` / `LayoutGroup` / `AnimatePresence`, Vitest + `@testing-library/react`.

**Why this approach (and what was rejected):**
- *Rejected — implement the `playGravityCollapseFx` Pixi stub:* `lib/blast/v2/fx/burst.ts:252` is a bare stub (`// No Pixi FX`). Driving the collapse from a separate PixiJS sprite layer means duplicating every tile's letter/color/flag rendering in Pixi over a frozen DOM board — large, fragile, and `BlastFxOverlay` doesn't even call `useBlastFx` yet.
- *Rejected — change the data model:* turning `BlastColumn.tiles: Letter[]` into `{id,letter}[]` would ripple through `collapseCells`, validation, the generator, every pack JSON, and ~466 tests.
- *Chosen — reducer-side `tileIds` slice:* identity lives only in reducer state + one `BlastBoard` key. No data-model change, no pack change, no validation/generator change. Existing tests exercise `foundWords` / `coins` / `cascadeCount`, not React keys, so they are unaffected.

**Out of scope (deferred — do NOT build these here):**
- Chain-beat / level-complete-card timing offset. `useChainEventBus` only fires when `chainDepth >= 2` (uncommon under Plan A's mechanic) and `useCompleteCardDelay` already waits ≥700ms (longer than the ~300ms fall), so the un-offset timing is acceptable for now. A follow-up "Plan B-timing" can add a `COLLAPSE_ANIM_MS` offset to `useChainEventBus.ts` and `useCompleteCardDelay.ts`.
- Cleared-tile shrink-out (`BlastTile`'s `exit` animation for the `just-cleared` state is wired but never triggered — leaving it).
- Thawed-cell flash, lateral-slide sparkle, level-complete confetti — separate FX plans.
- Wiring `useBlastFx` / implementing the `playGravityCollapseFx` stub.

**Unchanged:** the v2 access gate (`ohadf2015@gmail.com` + `?v2=force`). `data-cell-id` on each tile stays position-based (`cellId(col,row)`) — only the React `key` changes — so `BlastBoard`'s pointer hit-testing and `getCellCenter` are untouched.

---

### Task 1: Surface the row-remap from `collapseCells` (engine)

`collapseCells` already computes, internally, a per-column map of old-row → new-row for every surviving tile (the variable `flagRemapByCol`, `lib/blast/v2/engine/collapse.ts:13` and populated at `:23`). It is currently only used to re-emit tile flags. We expose it on the result so the reducer can rebuild `tileIds` without re-deriving gravity.

**Files:**
- Modify: `lib/blast/v2/engine/collapse.ts`
- Test: `lib/blast/v2/engine/__tests__/collapse.test.ts` (existing suite — add to it; if for some reason it does not exist, create it and mirror the import style of `lib/blast/v2/engine/__tests__/cascade.test.ts`)

- [ ] **Step 1: Write the failing test**

Append this `describe` block to `lib/blast/v2/engine/__tests__/collapse.test.ts`. If the file already imports `collapseCells`, `cellId`, and `BlastLevel`, reuse those imports rather than duplicating them.

```ts
import { describe, it, expect } from 'vitest';
import { collapseCells } from '../collapse';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';

describe('collapseCells rowRemapByCol', () => {
  it('maps each surviving tile old-row to its post-collapse row', () => {
    const level: BlastLevel = {
      id: 'remap-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A', 'B', 'C', 'D'] },
        { index: 1, tiles: ['E', 'F'] },
      ],
      words: [],
      resolvableOrder: [],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    // Pop A (c0r0) and C (c0r2). Survivors in col0: B (was r1), D (was r3).
    const result = collapseCells(level, [cellId(0, 0), cellId(0, 2)]);

    const col0 = result.rowRemapByCol.get(0)!;
    expect(col0.get(1)).toBe(0); // B falls r1 -> r0
    expect(col0.get(3)).toBe(1); // D falls r3 -> r1
    expect(col0.has(0)).toBe(false); // A was popped
    expect(col0.has(2)).toBe(false); // C was popped

    const col1 = result.rowRemapByCol.get(1)!;
    expect(col1.get(0)).toBe(0); // col1 untouched
    expect(col1.get(1)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/collapse.test.ts`
Expected: FAIL — `result.rowRemapByCol` is `undefined` (`TypeError: Cannot read properties of undefined (reading 'get')`). Any pre-existing tests in the file should still pass; if a pre-existing test does an exhaustive `expect(result).toEqual({...})` on the whole `CollapseResult`, note it — Step 3 adds a field and that test will need its expected object extended in Step 3.

- [ ] **Step 3: Add `rowRemapByCol` to `CollapseResult` and return it**

In `lib/blast/v2/engine/collapse.ts`, change the `CollapseResult` type (currently lines 4-8):

```ts
export type CollapseResult = {
  level: BlastLevel;
  thawedCells: CellId[];
  slidCells: { from: CellId; to: CellId }[];
};
```

to:

```ts
export type CollapseResult = {
  level: BlastLevel;
  thawedCells: CellId[];
  slidCells: { from: CellId; to: CellId }[];
  // Per-column old-row -> new-row map for every tile that survived the collapse.
  // Keyed by column index. Reflects vertical gravity only (lateral slides are in slidCells).
  rowRemapByCol: Map<number, Map<number, number>>;
};
```

Then change the `return` statement at the end of `collapseCells` (currently `return { level: resultLevel, thawedCells: thawed, slidCells: slid };`) to:

```ts
  return { level: resultLevel, thawedCells: thawed, slidCells: slid, rowRemapByCol: flagRemapByCol };
```

`flagRemapByCol` is the `Map<number, Map<number, number>>` already built at the top of the function — no new computation. If Step 2 flagged a pre-existing exhaustive `toEqual` test, add `rowRemapByCol` to its expected object now.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/collapse.test.ts`
Expected: PASS — the new test plus all pre-existing collapse tests.

---

### Task 2: Add the `rebuildTileIds` pure function (engine)

A pure function that, given the pre-collapse columns, the pre-collapse `tileIds`, and a `CollapseResult`, produces the post-collapse `tileIds` — surviving tiles keep their id string and move to their new slot; popped tiles' ids drop out; lateral-slid tiles' ids move columns.

**Files:**
- Modify: `lib/blast/v2/engine/collapse.ts` (add the exported function)
- Modify: `lib/blast/v2/engine/index.ts` (re-export it)
- Test: `lib/blast/v2/engine/__tests__/collapse.test.ts`

- [ ] **Step 1: Write the failing test**

Append this `describe` block to `lib/blast/v2/engine/__tests__/collapse.test.ts` (reuse the imports added in Task 1; add `rebuildTileIds` to the `from '../collapse'` import):

```ts
describe('rebuildTileIds', () => {
  it('keeps surviving tile ids attached as they fall (standard gravity)', () => {
    const level: BlastLevel = {
      id: 'rebuild-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A', 'B', 'C', 'D'] },
        { index: 1, tiles: ['E'] },
      ],
      words: [],
      resolvableOrder: [],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const tileIds = [['a', 'b', 'c', 'd'], ['e']];
    const collapse = collapseCells(level, [cellId(0, 0), cellId(0, 2)]); // pop A, C

    const next = rebuildTileIds(level.columns, tileIds, collapse);

    expect(next[0]).toEqual(['b', 'd']); // B,D survive, fall to rows 0,1, keep ids
    expect(next[1]).toEqual(['e']); // col1 untouched
  });

  it('moves a tile id across columns on a lateral slide', () => {
    const level: BlastLevel = {
      id: 'rebuild-slide-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A', 'B'] },
        { index: 1, tiles: ['C'] },
      ],
      words: [],
      resolvableOrder: [],
      tileFlags: {},
      gravityMode: 'lateral-slide',
      difficulty: 1,
    };
    const tileIds = [['a', 'b'], ['c']];
    // Pop both of col0 -> col0 empty; col1 (single tile) slides into col0.
    const collapse = collapseCells(level, [cellId(0, 0), cellId(0, 1)]);

    const next = rebuildTileIds(level.columns, tileIds, collapse);

    expect(next[0]).toEqual(['c']); // C slid into col0, keeps id 'c'
    expect(next[1]).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/collapse.test.ts`
Expected: FAIL — `rebuildTileIds` is not exported (`SyntaxError`/import error or `rebuildTileIds is not a function`).

- [ ] **Step 3: Implement `rebuildTileIds`**

In `lib/blast/v2/engine/collapse.ts`, add this exported function below `collapseCells`. Note `parseCell` and the `BlastColumn` type are already imported at the top of the file (`import { parseCell, cellId } from './cell-id';` and `import type { BlastLevel, BlastColumn, CellId, TileFlag } from '../types';`) — reuse them, do not re-import.

```ts
// Produce post-collapse tileIds parallel to `collapse.level.columns`, given the
// pre-collapse columns + pre-collapse tileIds. Surviving tiles keep their id and
// move to their new slot; popped tiles' ids drop out; lateral-slid tiles' ids
// move columns. Pure — mirrors the gravity collapseCells applied to the tiles.
export function rebuildTileIds(
  oldColumns: BlastColumn[],
  oldTileIds: string[][],
  collapse: CollapseResult,
): string[][] {
  // Step 1: vertical gravity — remap each surviving tile id to its new row.
  const byColIndex = new Map<number, string[]>();
  oldColumns.forEach((col, c) => {
    const remap = collapse.rowRemapByCol.get(col.index);
    const next = new Array<string>(remap ? remap.size : 0);
    if (remap) {
      for (const [oldRow, newRow] of remap) {
        next[newRow] = oldTileIds[c]![oldRow]!;
      }
    }
    byColIndex.set(col.index, next);
  });

  // Step 2: lateral slides (gravityMode 'lateral-slide' only).
  for (const { from, to } of collapse.slidCells) {
    const moving = byColIndex.get(parseCell(from).col);
    const target = byColIndex.get(parseCell(to).col);
    if (moving && target && moving.length > 0) {
      target.push(moving[0]!);
      byColIndex.set(parseCell(from).col, []);
    }
  }

  // Emit parallel to the post-collapse column order.
  return collapse.level.columns.map((col) => byColIndex.get(col.index) ?? []);
}
```

Then in `lib/blast/v2/engine/index.ts`, change the collapse export line (currently `export { collapseCells } from './collapse';`) to:

```ts
export { collapseCells, rebuildTileIds } from './collapse';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- lib/blast/v2/engine/__tests__/collapse.test.ts`
Expected: PASS — all collapse tests including the two new `rebuildTileIds` cases.

---

### Task 3: Add the `tileIds` slice to the reducer (useBlastV2)

**Files:**
- Modify: `lib/blast/v2/useBlastV2.ts`
- Test: `lib/blast/v2/__tests__/useBlastV2.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append these two tests inside the existing `describe('useBlastV2 hook', ...)` block in `lib/blast/v2/__tests__/useBlastV2.test.tsx`. They use the `revealLevel` fixture already defined in that file (added in Plan A).

```tsx
  it('initializes tileIds parallel to the level columns', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));
    // revealLevel: col0 has 4 tiles, col1 + col2 have 1 each.
    expect(result.current.state.tileIds).toEqual([
      ['t-0-0', 't-0-1', 't-0-2', 't-0-3'],
      ['t-1-0'],
      ['t-2-0'],
    ]);
  });

  it('preserves tile identity through a collapse', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    // CAT cleared c0r0..c0r2; the tile at c0r3 ('t-0-3', the D tile) falls to
    // c0r0 keeping its id. col1 + col2 are untouched.
    expect(result.current.state.tileIds).toEqual([
      ['t-0-3'],
      ['t-1-0'],
      ['t-2-0'],
    ]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:frontend -- lib/blast/v2/__tests__/useBlastV2.test.tsx`
Expected: FAIL — `result.current.state.tileIds` is `undefined`. All pre-existing useBlastV2 tests still pass.

- [ ] **Step 3: Add `tileIds` to State, initialize it, and transform it on collapse**

In `lib/blast/v2/useBlastV2.ts`:

**3a.** Add `tileIds` to the `State` type (currently lines 12-25) — add it as the last field:

```ts
type State = {
  level: BlastLevel;
  selection: SelectionState;
  foundWords: Set<string>;
  coins: number;
  chestProgress: number;
  status: 'playing' | 'levelComplete';
  hintsUsed: number;
  cascadeCount: number;
  invalidShakeKey: number;
  lastValidation: ValidationResult | null;
  lastChainDepth: number;
  chainEventKey: number;
  tileIds: string[][];
};
```

**3b.** Add `rebuildTileIds` to the engine import (currently lines 5-8 import from `'./engine'`). Change the first imported line so it reads:

```ts
  reduceSelection, validateSelection, collapseCells, rebuildTileIds, detectAllCascades, scoreForWord,
```

**3c.** In `applyValidatedSubmit`, declare a `newTileIds` alongside the other `new*` locals. After the line `let newCoins = state.coins + outcome.coinsBase + outcome.coinsFromOverlays;` (currently line 59) add:

```ts
  let newTileIds = state.tileIds;
```

**3d.** Inside the `if (kind === 'theme')` block, capture the full `CollapseResult` so its remap can rebuild `tileIds`. The block currently reads:

```ts
  if (kind === 'theme') {
    // Target words formable on the board BEFORE this collapse (already-found excluded).
    const formableBefore = new Set(
      detectAllCascades(state.level, newFound, config).map((c) => c.word),
    );
    newLevel = collapseCells(state.level, cells).level;
    // The player still finds these manually — revealed.length feeds chain FX
    // and aggregate submission/completion telemetry, but foundWords is unchanged.
    const revealed = detectAllCascades(newLevel, newFound, config)
      .map((c) => c.word)
      .filter((w) => !formableBefore.has(w));
    newCascadeCount += revealed.length;
  }
```

Change the `newLevel = collapseCells(...)` line so the result is kept and `tileIds` is rebuilt from it:

```ts
  if (kind === 'theme') {
    // Target words formable on the board BEFORE this collapse (already-found excluded).
    const formableBefore = new Set(
      detectAllCascades(state.level, newFound, config).map((c) => c.word),
    );
    const collapse = collapseCells(state.level, cells);
    newLevel = collapse.level;
    newTileIds = rebuildTileIds(state.level.columns, state.tileIds, collapse);
    // The player still finds these manually — revealed.length feeds chain FX
    // and aggregate submission/completion telemetry, but foundWords is unchanged.
    const revealed = detectAllCascades(newLevel, newFound, config)
      .map((c) => c.word)
      .filter((w) => !formableBefore.has(w));
    newCascadeCount += revealed.length;
  }
```

**3e.** Add `tileIds` to the returned state object of `applyValidatedSubmit` (the `return { ...state, level: newLevel, ... }` block, currently lines 86-97) — add it as the last property:

```ts
    chainEventKey: state.chainEventKey + 1,
    tileIds: newTileIds,
  };
```

**3f.** Initialize `tileIds` in the `initial` state object inside `useBlastV2` (currently lines 118-131) — add it as the last field:

```ts
    chainEventKey: 0,
    tileIds: initialLevel.columns.map((col, c) => col.tiles.map((_, r) => `t-${c}-${r}`)),
  };
```

The `reducer`'s other branches (`shuffle`, and the `sel` no-submit path) already spread `...state`, so `tileIds` is carried unchanged there with no further edits.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:frontend -- lib/blast/v2/__tests__/useBlastV2.test.tsx`
Expected: PASS — the two new `tileIds` tests plus all pre-existing useBlastV2 tests (5 from Plan A).

---

### Task 4: Key `BlastBoard` tiles by `tileIds`; pass the slice from `BlastGame`

This is the wiring that actually unlocks the framer-motion fall animation. `BlastTile` is already `motion.div layout`; the only thing preventing animation today is the position-based React `key`.

**Files:**
- Modify: `components/blast/v2/BlastBoard.tsx`
- Modify: `components/blast/v2/BlastGame.tsx`

- [ ] **Step 1: Add the `tileIds` prop to `BlastBoard` and key tiles by it**

In `components/blast/v2/BlastBoard.tsx`:

**1a.** Add `tileIds` to the `Props` type (currently lines 11-20) — add as the last field:

```ts
type Props = {
  level: BlastLevel;
  selection: SelectionState;
  invalidShakeKey: number;
  onPointerDown: (cell: CellId) => void;
  onPointerEnter: (cell: CellId) => void;
  onPointerUp: () => void;
  modeColor?: string;
  almosts?: AlmostWord[];
  tileIds: string[][];
};
```

**1b.** Add `tileIds` to the destructured props in the component signature (currently lines 22-31) — add it to the destructure list, e.g. after `almosts,`.

**1c.** Change the column/tile render. It currently reads (lines 96-119):

```tsx
        {level.columns.map((col) => (
          <div key={col.index} className="flex flex-col-reverse gap-2" data-col={col.index}>
            <AnimatePresence>
              {col.tiles.map((letter, row) => {
                const id = makeCellId(col.index, row);
                const flags = level.tileFlags[id] ?? [];
                return (
                  <BlastTile
                    key={id}
                    cellId={id}
                    letter={letter}
                    displayChar={config.displayChar(letter, row, col.tiles.length)}
                    flags={flags}
                    state={tileState(id)}
                    modeColor={modeColor}
                    fontStack={config.fontStack}
                    paddingExtra={config.tileExtraPadding}
                    onPointerDown={() => onPointerDown(id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ))}
```

Change it to thread the column array-index `c` and key by `tileIds[c][row]` (the `cellId` prop and everything else stays position-based):

```tsx
        {level.columns.map((col, c) => (
          <div key={col.index} className="flex flex-col-reverse gap-2" data-col={col.index}>
            <AnimatePresence>
              {col.tiles.map((letter, row) => {
                const id = makeCellId(col.index, row);
                const flags = level.tileFlags[id] ?? [];
                const tileKey = tileIds[c]?.[row] ?? id;
                return (
                  <BlastTile
                    key={tileKey}
                    cellId={id}
                    letter={letter}
                    displayChar={config.displayChar(letter, row, col.tiles.length)}
                    flags={flags}
                    state={tileState(id)}
                    modeColor={modeColor}
                    fontStack={config.fontStack}
                    paddingExtra={config.tileExtraPadding}
                    onPointerDown={() => onPointerDown(id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ))}
```

The `?? id` fallback keeps the board rendering safely if `tileIds` is ever shorter than `columns` (it never should be, but the fallback avoids a crash and is one token).

- [ ] **Step 2: Pass `tileIds` from `BlastGame`**

In `components/blast/v2/BlastGame.tsx`, find the `<BlastBoard ... />` element (it currently passes `level={state.level}`, `selection={state.selection}`, `invalidShakeKey`, the three pointer handlers, `modeColor`, `almosts`). Add one prop:

```tsx
        <BlastBoard
          level={state.level}
          selection={state.selection}
          invalidShakeKey={state.invalidShakeKey}
          onPointerDown={handlers.onPointerDown}
          onPointerEnter={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          modeColor={modeColor}
          almosts={almosts}
          tileIds={state.tileIds}
        />
```

- [ ] **Step 3: Run the component test suites**

Run: `npm run test:frontend -- components/blast/v2/__tests__/BlastBoard.test.tsx components/blast/v2/__tests__/BlastGame.test.tsx`
Expected: PASS. `BlastBoard.test.tsx` may need a small fix: if it renders `<BlastBoard ... />` directly, `tileIds` is now a required prop and TypeScript/the test will complain. If so, add a minimal `tileIds` prop to those render calls matching the test's `level` shape (e.g. `tileIds={level.columns.map((col, c) => col.tiles.map((_, r) => \`t-${c}-${r}\`))}`). This is a test-harness fix, not a behavior change — the assertions themselves must not be weakened. If a test fails for any reason other than the new required prop, STOP and report it.

- [ ] **Step 4: Note on verification limits**

React `key` values are not observable in the DOM, so the *fall animation itself* cannot be unit-tested — the meaningful logic (`rebuildTileIds`, the `collapseCells` remap, the reducer `tileIds` transform) is fully covered by Tasks 1-3. The animation must be confirmed visually: `npm run dev` (port 3001), open `/blast?v2=force`, drag a word, and watch the tiles above the cleared cells slide down instead of snapping. Record in your report that this visual check is required and whether you were able to perform it.

---

### Task 5: Full regression + lint + commit

**Files:** none modified — verification + commit only.

- [ ] **Step 1: Run the full Blast v2 + engine suites**

Run: `npm run test:frontend -- lib/blast/v2 components/blast/v2`
Expected: PASS. Any failure outside the files this plan touched is a real regression — investigate and fix the source (not the test). Adding `rowRemapByCol` to `CollapseResult` is additive; the only plausible fallout is an exhaustive `toEqual` assertion on a `CollapseResult` somewhere, which should have been caught in Task 1.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS with no new warnings in `lib/blast/v2/engine/collapse.ts`, `lib/blast/v2/engine/index.ts`, `lib/blast/v2/useBlastV2.ts`, `components/blast/v2/BlastBoard.tsx`, `components/blast/v2/BlastGame.tsx`, or the two test files.

- [ ] **Step 3: Commit**

```bash
git add lib/blast/v2/engine/collapse.ts lib/blast/v2/engine/index.ts lib/blast/v2/engine/__tests__/collapse.test.ts lib/blast/v2/useBlastV2.ts lib/blast/v2/__tests__/useBlastV2.test.tsx components/blast/v2/BlastBoard.tsx components/blast/v2/BlastGame.tsx
git commit -m "$(cat <<'EOF'
feat(blast): animate v2 tile collapse via stable tile identity

BlastTile is already a framer-motion `layout` element, but BlastBoard
keyed tiles by grid position, so a falling tile read as unmount+remount
and never animated. Add a reducer-side `tileIds` slice that travels with
each tile through collapses (rebuilt by the same gravity collapseCells
applies), and key BlastBoard by it. The board now animates the fall.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Verify the commit**

Run: `git status` and `git log -1 --stat`
Expected: working tree clean for the 7 listed files; commit present with exactly those 7 files.

---

## Roadmap — remaining plans

- **Plan B-timing (follow-up to this plan).** Add a `COLLAPSE_ANIM_MS` constant and offset the first chain beat in `lib/blast/v2/fx/useChainEventBus.ts` and the settle formula in `lib/blast/v2/fx/useCompleteCardDelay.ts` so chain-beat flashes and the level-complete card wait for the fall to finish. Small, but touches those files' timing tests.
- **Plan C — Persistent theme banner.** `BlastLevelIntroCard` shows the theme then auto-dismisses after 1500ms; `BlastHud` renders no theme. Add a persistent theme label to `BlastHud` (`components/blast/v2/BlastHud.tsx`), translated via `t('blast.themes.<key>')`.
- **Plan D — Level progression.** `onAdvance` is a `console.log` stub (`app/[locale]/blast/v2/BlastV2PageClient.tsx:37`) and `app/[locale]/blast/page.tsx:36` hardcodes `resolve(1, locale)`. Wire real progression: fetch `max_level_cleared` from DB, resolve the correct level, persist progress on clear.
- **Plan E — Locale packs + progressive-reveal authoring.** Only `content/blast/packs/en/` exists, so `he/sv/ja/es` silently fall back to English. Author locale packs for all four languages, and re-author the onboarding packs so words become formable only *after* collapses (depends on Plan A's reveal semantics).
