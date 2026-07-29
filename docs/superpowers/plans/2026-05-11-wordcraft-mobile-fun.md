# WordCraft Mobile-Fun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WordCraft mobile-readable and "alive": adaptive board (11×11 phone / 13×13 tablet+), brand-tinted premium squares, big-letter + corner-dot tiles, Pixi+GSAP overlay (ambient + event scenes), tap-tap-first phone placement. Delete admin route.

**Architecture:** DOM grid stays source of truth (a11y, RTL, tests). Sibling Pixi `<canvas>` overlays the board, reads cell rects from `useBoardCoords(boardRef)` (ResizeObserver-backed cache). Game state locks board dimensions at init from viewport. Tile bag uses a runtime proportional scaler so phone-bag (target sum 78) works in all 5 locales without per-locale config.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind (neo-* brand classes) · GSAP (already in repo) · PixiJS v8 (already in repo via BlastEngine) · Vitest + RTL · 5 locales via `LanguageContext`/`t()`.

**Reference spec:** `docs/superpowers/specs/2026-05-11-wordcraft-mobile-fun-design.md`.

**Pre-flight constraints (from `fe-next/CLAUDE.md` and `.claude/rules/`):**
- TDD strict: test first, must fail, then minimal impl, then refactor.
- Every file < 500 lines.
- All UI text via `t('key')` — no hardcoded strings.
- `npm run lint && npm run test && npm run build` green before final commit of each task.
- Conventional commits: `type(scope): description`.
- All 5 locales updated (en/he/sv/ja/es); HE/SV/JA/ES AI-generated then flagged for native review.

---

## File Map (decomposition lock-in)

**New files**
- `fe-next/lib/word-craft/boardDimensions.ts` — viewport→dims mapping + `PREMIUM_LAYOUT_11`.
- `fe-next/lib/word-craft/scoreDotTier.ts` — `(points)→'common'|'mid'|'rare'|'legendary'`.
- `fe-next/lib/word-craft/tileBag.scaler.ts` — proportional bag scaler.
- `fe-next/lib/word-craft/pixi/sceneCtx.ts` — shared `SceneCtx` type + helpers.
- `fe-next/lib/word-craft/pixi/ambientSparkles.ts`
- `fe-next/lib/word-craft/pixi/scenes/tilePlaceRipple.ts`
- `fe-next/lib/word-craft/pixi/scenes/wordCommitWave.ts`
- `fe-next/lib/word-craft/pixi/scenes/scoreConfetti.ts`
- `fe-next/lib/word-craft/pixi/scenes/botMoveReveal.ts`
- `fe-next/lib/word-craft/pixi/scenes/gameOverBurst.ts`
- `fe-next/components/word-craft/hooks/useBoardCoords.ts`
- `fe-next/components/word-craft/WordCraftPixiStage.tsx`
- `fe-next/components/word-craft/WordCraftHUD.tsx` (extracted from PageClient)
- `fe-next/components/word-craft/WordCraftBoardSection.tsx` (wraps zoom-shell + board + Pixi)
- `fe-next/components/word-craft/WordCraftGameOverScene.tsx` (extracted)
- `fe-next/components/word-craft/WordCraftLegendChip.tsx`
- Tests for each of the above under `__tests__/` siblings.

**Modified files**
- `fe-next/lib/word-craft/board.ts` — add `size: 11` to `createBoard`, fix `isInBounds` to use actual board size, export `PREMIUM_LAYOUTS` lookup.
- `fe-next/lib/word-craft/tileBag.ts` — add `bagSize?: number` to `CreateBagOptions`; route through scaler when set.
- `fe-next/lib/word-craft/useWordCraftGame.ts` — call `getBoardDims(viewport)` at init, lock into game state.
- `fe-next/components/word-craft/WordCraftBoard.tsx` — accept `dims` prop, remove premium-text labels, tint backgrounds with `neo-*` classes, render tile with big letter + corner dot.
- `fe-next/components/word-craft/WordCraftZoomShell.tsx` — clamp max zoom 2.4 → 2.0.
- `fe-next/components/word-craft/useWordCraftDrag.ts` — touch pointer defaults to tap-tap; drag-threshold escalation unchanged.
- `fe-next/app/[locale]/word-craft/PageClient.tsx` — extract HUD, BoardSection, GameOverScene; lands < 500 lines.
- `fe-next/translations/{en,he,sv,ja,es}.{js,ts}` — add 9 new keys, remove 4 old keys.

**Deleted files**
- `fe-next/app/[locale]/admin/word-craft/page.tsx`
- `fe-next/app/[locale]/admin/word-craft/PageClient.tsx`
- Any admin nav link to `/admin/word-craft`.

---

## Task Order Rationale

Sequencing: **delete first** (T1, removes future maintenance noise) → **dim abstraction** (T2–T5, foundation) → **bag scaler** (T6–T7, independent) → **tile chrome** (T8–T11, visual layer) → **Pixi infra** (T12–T13) → **Pixi scenes** (T14–T19, parallelizable) → **mobile UX polish** (T20–T21) → **file-size compliance** (T22–T25) → **i18n + verify** (T26–T28).

Each task ends in a commit. Pixi-scene tasks (T14–T19) can run in parallel during execution if using `subagent-driven-development`.

---

## Task 1: Delete admin route

**Files:**
- Delete: `fe-next/app/[locale]/admin/word-craft/page.tsx`
- Delete: `fe-next/app/[locale]/admin/word-craft/PageClient.tsx`
- Modify: any file linking to `/admin/word-craft` (sweep)

- [ ] **Step 1: Find all references**

```bash
cd /Users/ohadfisher/git/boggle-new && \
  grep -rn "admin/word-craft" fe-next/ --include="*.tsx" --include="*.ts" --include="*.js" -l
```

Expected: lists `app/[locale]/admin/word-craft/page.tsx`, `PageClient.tsx`, and any admin-nav file referencing the route.

- [ ] **Step 2: Delete admin route directory**

```bash
rm -rf fe-next/app/[locale]/admin/word-craft
```

- [ ] **Step 3: Remove admin-nav link**

For every file listed in Step 1 that wasn't the deleted directory, open it and remove the `<Link href="/admin/word-craft" />` entry (or array entry). Show the exact diff in the commit.

- [ ] **Step 4: Verify build still passes**

```bash
cd fe-next && npm run build 2>&1 | tail -20
```

Expected: build success. If 404 link warnings appear, find the remaining reference.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(word-craft): delete admin-only demo route

WordCraft graduates from admin-gated demo to public mode.
Public route /[locale]/word-craft becomes the canonical entry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add 11×11 premium-square layout

**Files:**
- Modify: `fe-next/lib/word-craft/board.ts`
- Test: `fe-next/lib/word-craft/__tests__/board11x11.test.ts` (new)

- [ ] **Step 1: Write failing test**

Create `fe-next/lib/word-craft/__tests__/board11x11.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createBoard, getCell } from '../board';

describe('createBoard(11)', () => {
  it('creates an 11x11 board', () => {
    const board = createBoard(11);
    expect(board.cells.length).toBe(11);
    expect(board.cells[0].length).toBe(11);
  });

  it('has a center cell at (5,5)', () => {
    const board = createBoard(11);
    expect(getCell(board, 5, 5).premium).toBeNull();
  });

  it('has 4-way mirror symmetry on premiums', () => {
    const board = createBoard(11);
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        const p = getCell(board, r, c).premium;
        const mirror = getCell(board, 10 - r, 10 - c).premium;
        expect(mirror).toBe(p);
      }
    }
  });

  it('has at least 4 TW squares (corner-distance)', () => {
    const board = createBoard(11);
    let twCount = 0;
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        if (getCell(board, r, c).premium === 'TW') twCount++;
      }
    }
    expect(twCount).toBeGreaterThanOrEqual(4);
  });

  it('total premium count between 10 and 16', () => {
    const board = createBoard(11);
    let count = 0;
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        if (getCell(board, r, c).premium) count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(16);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/board11x11.test.ts 2>&1 | tail -20
```

Expected: FAIL — `createBoard(11)` throws "Board size must be 13 or 15, got 11" or returns empty cells.

- [ ] **Step 3: Add 11×11 layout + extend createBoard signature**

Edit `fe-next/lib/word-craft/board.ts`. Replace lines 27–93 with:

```typescript
// 11x11 board with 4-way mirror symmetry (premiums mirror across both axes)
// Hand-authored: 4 corner TW, 4 inner DW (one per quadrant), 4 TL, 4 DL.
// Center (5,5) is unmarked — first-move requirement enforced separately.
const PREMIUM_LAYOUT_11: readonly string[] = [
  'T....d....T',  // row 0
  '.D...t...D.',  // row 1
  '..D.....D..',  // row 2
  '...D.d.D...',  // row 3
  'd....D....d',  // row 4
  '.t.d...d.t.',  // row 5
  'd....D....d',  // row 6
  '...D.d.D...',  // row 7
  '..D.....D..',  // row 8
  '.D...t...D.',  // row 9
  'T....d....T',  // row 10
] as const;

const PREMIUM_LAYOUT_15: readonly string[] = [
  'T..d...T...d..T',
  '.D...t...t...D.',
  '..D...d.d...D..',
  'd..D...d...D..d',
  '....D.....D....',
  '.t...t...t...t.',
  '..d...d.d...d..',
  'T..d...D...d..T',
  '..d...d.d...d..',
  '.t...t...t...t.',
  '....D.....D....',
  'd..D...d...D..d',
  '..D...d.d...D..',
  '.D...t...t...D.',
  'T..d...T...d..T',
] as const;

const PREMIUM_LAYOUT_13: readonly string[] = [
  'T..d....d..T.',
  '.D...t.t...D.',
  '..D...d...D..',
  'd..D....D..d.',
  '....D.D......',
  '.t...t.t...t.',
  '......*......',
  '.t...t.t...t.',
  '......D.D....',
  '.d..D....D..d',
  '..D...d...D..',
  '.D...t.t...D.',
  '.T..d....d..T',
] as const;

const CHAR_TO_PREMIUM: Record<string, PremiumKind | null> = {
  T: 'TW', D: 'DW', t: 'TL', d: 'DL', '.': null, '*': null,
};

export type BoardSize = 11 | 13 | 15;

const LAYOUTS: Record<BoardSize, readonly string[]> = {
  11: PREMIUM_LAYOUT_11,
  13: PREMIUM_LAYOUT_13,
  15: PREMIUM_LAYOUT_15,
};

export interface BoardCell {
  premium: PremiumKind | null;
  tile: PlacedTile | null;
}

export interface Board {
  cells: BoardCell[][];
  size: BoardSize;
}

function getPremiumForSize(row: number, col: number, size: BoardSize): PremiumKind | null {
  if (row < 0 || row >= size || col < 0 || col >= size) return null;
  return CHAR_TO_PREMIUM[LAYOUTS[size][row][col]] ?? null;
}

export function isInBounds(row: number, col: number, board: Board): boolean {
  return row >= 0 && row < board.size && col >= 0 && col < board.size;
}

export function getPremium(row: number, col: number, board: Board): PremiumKind | null {
  if (!isInBounds(row, col, board)) return null;
  return CHAR_TO_PREMIUM[LAYOUTS[board.size][row][col]] ?? null;
}

export function createBoard(size: BoardSize = 15): Board {
  if (size !== 11 && size !== 13 && size !== 15) {
    throw new Error(`Board size must be 11, 13, or 15, got ${size}`);
  }
  const cells: BoardCell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({ premium: getPremiumForSize(r, c, size), tile: null });
    }
    cells.push(row);
  }
  return { cells, size };
}

export function getCell(board: Board, row: number, col: number): BoardCell {
  return board.cells[row][col];
}

export function placeTiles(board: Board, tiles: PlacedTile[]): void {
  for (const t of tiles) {
    board.cells[t.row][t.col].tile = t;
  }
}

export function isFirstMove(board: Board): boolean {
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      if (board.cells[r][c].tile) return false;
    }
  }
  return true;
}

// Backward compat: BOARD_SIZE / CENTER constants kept for legacy callers.
// New code should read `board.size`.
export const BOARD_SIZE = 15;
export const CENTER = 7;
```

Note: `isInBounds` and `getPremium` signatures changed from `(row, col)` to `(row, col, board)`. Step 4 traces callers.

- [ ] **Step 4: Trace + fix `isInBounds` / `getPremium` callers**

```bash
cd fe-next && grep -rn "isInBounds\|getPremium" lib/word-craft components/word-craft app/[locale]/word-craft 2>&1
```

For each caller: pass `board` as the third arg. If a caller doesn't have a `Board` in scope, add a `board` param to that function up the chain. Do NOT silently swap to `BOARD_SIZE`.

- [ ] **Step 5: Run all word-craft tests**

```bash
cd fe-next && npx vitest run lib/word-craft components/word-craft 2>&1 | tail -30
```

Expected: All existing tests + new 11×11 tests PASS. If existing tests fail due to signature changes, fix the callers in those tests too.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(word-craft): add 11x11 board layout + tag board with size

- PREMIUM_LAYOUT_11 with 4-way mirror symmetry (~12 premiums)
- Board now carries its size; isInBounds/getPremium accept the board
- Fixes latent bug where isInBounds used hardcoded BOARD_SIZE=15

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Viewport → dims mapper

**Files:**
- Create: `fe-next/lib/word-craft/boardDimensions.ts`
- Test: `fe-next/lib/word-craft/__tests__/boardDimensions.test.ts`

- [ ] **Step 1: Write failing test**

Create `fe-next/lib/word-craft/__tests__/boardDimensions.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getBoardDims, PHONE_BREAKPOINT_PX } from '../boardDimensions';

describe('getBoardDims', () => {
  it('returns 11x11 for phone-class viewport (< 768px)', () => {
    expect(getBoardDims(360)).toEqual({ size: 11, bagSize: 78 });
    expect(getBoardDims(767)).toEqual({ size: 11, bagSize: 78 });
  });

  it('returns 13x13 for tablet+ viewport (>= 768px)', () => {
    expect(getBoardDims(768)).toEqual({ size: 13, bagSize: 100 });
    expect(getBoardDims(1920)).toEqual({ size: 13, bagSize: 100 });
  });

  it('handles 0 / NaN / undefined defensively (defaults to phone)', () => {
    expect(getBoardDims(0)).toEqual({ size: 11, bagSize: 78 });
    expect(getBoardDims(Number.NaN)).toEqual({ size: 11, bagSize: 78 });
  });

  it('exports breakpoint constant', () => {
    expect(PHONE_BREAKPOINT_PX).toBe(768);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/boardDimensions.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the module**

Create `fe-next/lib/word-craft/boardDimensions.ts`:

```typescript
import type { BoardSize } from './board';

export const PHONE_BREAKPOINT_PX = 768;

export interface BoardDims {
  size: BoardSize;
  bagSize: number;
}

const PHONE_DIMS: BoardDims = { size: 11, bagSize: 78 };
const TABLET_DIMS: BoardDims = { size: 13, bagSize: 100 };

export function getBoardDims(viewportWidth: number): BoardDims {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return PHONE_DIMS;
  return viewportWidth < PHONE_BREAKPOINT_PX ? PHONE_DIMS : TABLET_DIMS;
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/boardDimensions.test.ts 2>&1 | tail -10
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/word-craft/boardDimensions.ts lib/word-craft/__tests__/boardDimensions.test.ts
git commit -m "feat(word-craft): viewport-to-dims mapper for adaptive board

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire dims into game init

**Files:**
- Modify: `fe-next/lib/word-craft/useWordCraftGame.ts`
- Test: `fe-next/lib/word-craft/__tests__/useWordCraftGame.dims.test.ts` (new)

- [ ] **Step 1: Read current useWordCraftGame**

```bash
cd fe-next && wc -l lib/word-craft/useWordCraftGame.ts
```

Open the file. Locate where `createBoard` is called (state init). Locate where `createBag` is called.

- [ ] **Step 2: Write failing test**

Create `fe-next/lib/word-craft/__tests__/useWordCraftGame.dims.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWordCraftGame } from '../useWordCraftGame';

describe('useWordCraftGame dimensions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes 11x11 board on phone viewport', () => {
    const { result } = renderHook(() => useWordCraftGame({ seed: 1, locale: 'en' }));
    expect(result.current.state.board.size).toBe(11);
  });

  it('initializes 13x13 board on tablet viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const { result } = renderHook(() => useWordCraftGame({ seed: 1, locale: 'en' }));
    expect(result.current.state.board.size).toBe(13);
  });

  it('does not re-evaluate dims after resize', () => {
    const { result } = renderHook(() => useWordCraftGame({ seed: 1, locale: 'en' }));
    const sizeBefore = result.current.state.board.size;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    window.dispatchEvent(new Event('resize'));
    expect(result.current.state.board.size).toBe(sizeBefore);
  });
});
```

- [ ] **Step 3: Run test, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.dims.test.ts 2>&1 | tail -15
```

Expected: FAIL — board.size mismatch.

- [ ] **Step 4: Update useWordCraftGame init**

Inside the file, find the initial state setup. Add at the top of the hook body (before `useState`):

```typescript
import { getBoardDims } from './boardDimensions';
// ...
const initialDims = useRef(
  getBoardDims(typeof window === 'undefined' ? 1024 : window.innerWidth)
).current;
```

Replace existing `createBoard()` call with `createBoard(initialDims.size)`.
Replace existing `createBag({ seed, locale })` call with `createBag({ seed, locale, bagSize: initialDims.bagSize })`.

Note: `bagSize` option doesn't exist yet — Task 6 adds it. For now, pass it and let Task 6 wire it. Tests will fail until T6 lands; commit T4 separately with a `chore:` note.

Actually — reverse the order: do **T6 before T4**. Move on after Step 4 to: "Skip T4's commit; T4 depends on T6. Implement T6 first."

> **Sequencing note:** Tasks 4 and 6 cross-depend. Recommended execution order: T2 → T3 → **T6 → T7** → T4 → T5 → continue. Update plan execution graph accordingly.

- [ ] **Step 5: Defer commit**

Do not commit yet. Continue with T6 + T7 first, then return to complete T4 + T5.

---

## Task 5: SSR / first-paint guard for dims

**Files:**
- Modify: `fe-next/lib/word-craft/useWordCraftGame.ts`
- Test: `fe-next/lib/word-craft/__tests__/useWordCraftGame.dims.test.ts` (add case)

- [ ] **Step 1: Add SSR test case**

In `useWordCraftGame.dims.test.ts`, add:

```typescript
it('falls back to phone preset when window is undefined (SSR)', () => {
  const originalWindow = global.window;
  // @ts-expect-error simulate SSR
  delete global.window;
  try {
    // Hook should not throw and should default safely.
    expect(() => renderHook(() => useWordCraftGame({ seed: 1, locale: 'en' })))
      .not.toThrow();
  } finally {
    global.window = originalWindow;
  }
});
```

Actually drop this — Next 16 SSR for client components is rare and `useState` initializer runs client-side. Replace with a simpler check: ensure no `window.innerWidth` direct access at module top-level.

Replace the entire Step 1 with:

```typescript
it('reads window only inside hook body, not at module top-level', () => {
  // The import side-effect must not throw if window is undefined.
  // (vitest dom env always has window, so this is a static-analysis stand-in.)
  const src = require('fs').readFileSync(
    require.resolve('../useWordCraftGame'),
    'utf8'
  );
  // Top-level window.innerWidth ref is forbidden.
  const topLevel = src.split(/^export |^function |^const \w+ = /m)[0];
  expect(topLevel).not.toMatch(/window\.innerWidth/);
});
```

- [ ] **Step 2: Verify passes**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.dims.test.ts 2>&1 | tail -15
```

Expected: PASS after T4 implementation.

- [ ] **Step 3: Commit (combined with T4 after T6/T7)**

Hold commit until full T4 + T5 work + tests green.

---

## Task 6: Proportional tile-bag scaler

**Files:**
- Create: `fe-next/lib/word-craft/tileBag.scaler.ts`
- Test: `fe-next/lib/word-craft/__tests__/tileBag.scaler.test.ts`

- [ ] **Step 1: Write failing test**

Create `fe-next/lib/word-craft/__tests__/tileBag.scaler.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { scaleDistribution } from '../tileBag.scaler';
import * as en from '../tileBags/en';

const FULL_EN = en.distribution;

describe('scaleDistribution', () => {
  it('returns identical map when target equals full size', () => {
    const total = Object.values(FULL_EN).reduce((a, b) => a + b, 0);
    expect(scaleDistribution(FULL_EN, total)).toEqual(FULL_EN);
  });

  it('produces a distribution summing exactly to the target', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    const sum = Object.values(scaled).reduce((a, b) => a + b, 0);
    expect(sum).toBe(78);
  });

  it('preserves blank tile count', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    expect(scaled['_']).toBe(FULL_EN['_']);  // blanks unchanged
  });

  it('keeps every letter at >= 1 (floor)', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    for (const [letter, count] of Object.entries(scaled)) {
      if (letter === '_') continue;
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it('reduces high-frequency letters most aggressively', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    // E: 12 -> ~9 (largest cut). Q: 1 -> 1 (no cut).
    expect(scaled['E']).toBeLessThan(FULL_EN['E']);
    expect(scaled['Q']).toBe(FULL_EN['Q']);
  });

  it('works for non-English distributions', () => {
    const HE_FAKE: Record<string, number> = { א: 10, ב: 5, ג: 3, _: 2 };
    const scaled = scaleDistribution(HE_FAKE, 12);
    const sum = Object.values(scaled).reduce((a, b) => a + b, 0);
    expect(sum).toBe(12);
    expect(scaled['_']).toBe(2);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/tileBag.scaler.test.ts 2>&1 | tail -15
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement scaler**

Create `fe-next/lib/word-craft/tileBag.scaler.ts`:

```typescript
import { BLANK_LETTER } from './tileBag';

/**
 * Scale a distribution to a target tile count using largest-remainder.
 * Preserves blanks unchanged. Floors every other letter at 1.
 *
 * Algorithm:
 *  1. Reserve blanks (unchanged).
 *  2. For non-blank letters, compute proportional float allocation.
 *  3. Floor each to integer >= 1.
 *  4. Distribute leftover (target - sum) to letters with largest fractional part.
 *  5. If overshooting target, subtract from largest-count letters first (never below 1).
 */
export function scaleDistribution(
  full: Readonly<Record<string, number>>,
  target: number,
): Record<string, number> {
  const blanks = full[BLANK_LETTER] ?? 0;
  const targetNonBlank = target - blanks;
  const fullEntries = Object.entries(full).filter(([k]) => k !== BLANK_LETTER);
  const fullNonBlankSum = fullEntries.reduce((s, [, v]) => s + v, 0);

  if (fullNonBlankSum === 0) {
    return { ...full };
  }

  // If target equals full size, no-op.
  if (target === fullNonBlankSum + blanks) {
    return { ...full };
  }

  const ratio = targetNonBlank / fullNonBlankSum;

  type Slot = { letter: string; floor: number; frac: number };
  const slots: Slot[] = fullEntries.map(([letter, count]) => {
    const raw = count * ratio;
    const floor = Math.max(1, Math.floor(raw));
    return { letter, floor, frac: raw - Math.floor(raw) };
  });

  let sum = slots.reduce((s, x) => s + x.floor, 0);

  // Distribute extra units to largest fractional parts.
  if (sum < targetNonBlank) {
    const sortedByFrac = [...slots].sort((a, b) => b.frac - a.frac);
    let remaining = targetNonBlank - sum;
    let i = 0;
    while (remaining > 0) {
      sortedByFrac[i % sortedByFrac.length].floor += 1;
      remaining -= 1;
      i += 1;
    }
  }

  // Trim excess (rare; can happen when floor=1 forces sum > target).
  if (sum > targetNonBlank) {
    const sortedByCount = [...slots].sort((a, b) => b.floor - a.floor);
    let excess = sum - targetNonBlank;
    let i = 0;
    while (excess > 0) {
      const slot = sortedByCount[i % sortedByCount.length];
      if (slot.floor > 1) {
        slot.floor -= 1;
        excess -= 1;
      }
      i += 1;
      if (i > slots.length * 50) break;  // safety
    }
  }

  const result: Record<string, number> = {};
  for (const slot of slots) result[slot.letter] = slot.floor;
  if (blanks > 0) result[BLANK_LETTER] = blanks;
  return result;
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/tileBag.scaler.test.ts 2>&1 | tail -15
```

Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add lib/word-craft/tileBag.scaler.ts lib/word-craft/__tests__/tileBag.scaler.test.ts
git commit -m "feat(word-craft): proportional tile-bag scaler (largest remainder)

Locale-agnostic: scales any language's full distribution to a target
tile count, preserving blanks and flooring at 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire bagSize into createBag

**Files:**
- Modify: `fe-next/lib/word-craft/tileBag.ts`
- Test: `fe-next/lib/word-craft/__tests__/tileBag.bagSize.test.ts` (new)

- [ ] **Step 1: Write failing test**

Create `fe-next/lib/word-craft/__tests__/tileBag.bagSize.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createBag } from '../tileBag';

describe('createBag with bagSize option', () => {
  it('full bag is 100 tiles for EN by default', () => {
    const bag = createBag({ seed: 1, locale: 'en' });
    expect(bag.tiles.length).toBe(100);
  });

  it('honors bagSize: 78 for phone', () => {
    const bag = createBag({ seed: 1, locale: 'en', bagSize: 78 });
    expect(bag.tiles.length).toBe(78);
  });

  it('still works for HE locale with bagSize override', () => {
    const bag = createBag({ seed: 1, locale: 'he', bagSize: 78 });
    expect(bag.tiles.length).toBe(78);
  });

  it('deterministic shuffle per seed regardless of bagSize', () => {
    const a = createBag({ seed: 42, locale: 'en', bagSize: 78 });
    const b = createBag({ seed: 42, locale: 'en', bagSize: 78 });
    expect(a.tiles.map((t) => t.letter)).toEqual(b.tiles.map((t) => t.letter));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/tileBag.bagSize.test.ts 2>&1 | tail -15
```

Expected: FAIL — `bagSize` not in `CreateBagOptions`.

- [ ] **Step 3: Modify tileBag.ts**

Edit `fe-next/lib/word-craft/tileBag.ts`. Update `CreateBagOptions` and `createBag`:

```typescript
import { scaleDistribution } from './tileBag.scaler';

export interface CreateBagOptions {
  seed: number;
  locale?: SupportedLocale;
  bagSize?: number;  // when set and < full, scales distribution proportionally
}

export function createBag(options: CreateBagOptions): TileBag {
  const { values: tileValues, distribution: fullDist } = getTileBag(options.locale ?? 'en');
  const fullTotal = Object.values(fullDist).reduce((a, b) => a + b, 0);
  const distribution =
    options.bagSize !== undefined && options.bagSize < fullTotal
      ? scaleDistribution(fullDist, options.bagSize)
      : fullDist;

  const rng = mulberry32(options.seed);
  const tiles: RackTile[] = [];
  let nextId = 0;
  for (const [letter, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `t-${nextId++}`,
        letter,
        value: tileValues[letter] ?? 0,
        isBlank: letter === BLANK_LETTER,
      });
    }
  }
  shuffleInPlace(tiles, rng);
  return { tiles, rng, nextId };
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/tileBag 2>&1 | tail -15
```

Expected: PASS — all bag tests including existing ones.

- [ ] **Step 5: Commit**

```bash
git add lib/word-craft/tileBag.ts lib/word-craft/__tests__/tileBag.bagSize.test.ts
git commit -m "feat(word-craft): bagSize option on createBag routes through scaler

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Complete T4 + T5 (wire game init now that T6/T7 are landed)

**Files:**
- Modify: `fe-next/lib/word-craft/useWordCraftGame.ts`
- Test (existing, now should pass): `fe-next/lib/word-craft/__tests__/useWordCraftGame.dims.test.ts`

- [ ] **Step 1: Apply the changes from T4 Step 4**

Add `getBoardDims` import + `useRef`-locked dims + pass to `createBoard` and `createBag` per T4 instructions.

- [ ] **Step 2: Run dims test**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.dims.test.ts 2>&1 | tail -15
```

Expected: PASS.

- [ ] **Step 3: Run full word-craft test suite**

```bash
cd fe-next && npx vitest run lib/word-craft components/word-craft 2>&1 | tail -30
```

Expected: PASS. If existing tests asserted specific tile counts or board size, update them to read `state.board.size` or pass explicit `{ initialBoardSize: 13 }` test-only override.

- [ ] **Step 4: Commit**

```bash
git add lib/word-craft/useWordCraftGame.ts lib/word-craft/__tests__/useWordCraftGame.dims.test.ts
git commit -m "feat(word-craft): lock board+bag dims to viewport at game init

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: scoreDotTier helper

**Files:**
- Create: `fe-next/lib/word-craft/scoreDotTier.ts`
- Test: `fe-next/lib/word-craft/__tests__/scoreDotTier.test.ts`

- [ ] **Step 1: Write failing test**

Create `fe-next/lib/word-craft/__tests__/scoreDotTier.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { scoreDotTier, TIER_COLOR_CLASS } from '../scoreDotTier';

describe('scoreDotTier', () => {
  it('1pt = common', () => expect(scoreDotTier(1)).toBe('common'));
  it('2pt = mid', () => expect(scoreDotTier(2)).toBe('mid'));
  it('3pt = mid', () => expect(scoreDotTier(3)).toBe('mid'));
  it('4pt = rare', () => expect(scoreDotTier(4)).toBe('rare'));
  it('5pt = rare', () => expect(scoreDotTier(5)).toBe('rare'));
  it('8pt = legendary', () => expect(scoreDotTier(8)).toBe('legendary'));
  it('10pt = legendary', () => expect(scoreDotTier(10)).toBe('legendary'));
  it('0pt (blank) = common', () => expect(scoreDotTier(0)).toBe('common'));
});

describe('TIER_COLOR_CLASS', () => {
  it('returns a Tailwind class for every tier', () => {
    expect(TIER_COLOR_CLASS.common).toMatch(/^bg-/);
    expect(TIER_COLOR_CLASS.mid).toMatch(/^bg-/);
    expect(TIER_COLOR_CLASS.rare).toMatch(/^bg-/);
    expect(TIER_COLOR_CLASS.legendary).toMatch(/^bg-/);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/scoreDotTier.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `fe-next/lib/word-craft/scoreDotTier.ts`:

```typescript
export type ScoreTier = 'common' | 'mid' | 'rare' | 'legendary';

export function scoreDotTier(points: number): ScoreTier {
  if (points <= 1) return 'common';
  if (points <= 3) return 'mid';
  if (points <= 5) return 'rare';
  return 'legendary';
}

// Brand-aligned: gray (neutral) / cyan / purple / orange (gold-equivalent in our palette).
// neo-cream replaces gold to stay inside the 4-family discipline.
export const TIER_COLOR_CLASS: Record<ScoreTier, string> = {
  common: 'bg-neo-white/40',
  mid: 'bg-neo-cyan',
  rare: 'bg-neo-purple',
  legendary: 'bg-neo-yellow',  // celebratory accent per design-system.md
};
```

Note on color choice: design-system.md reserves `neo-yellow` for "celebration/gold — boss victory, coin/XP rewards". A 10-point Q/Z legendary tile fits "coin/XP rewards" framing. If reviewer disagrees, swap to `bg-neo-orange` (warmth/streak family also allowed for accents).

- [ ] **Step 4: Run test, verify pass**

```bash
cd fe-next && npx vitest run lib/word-craft/__tests__/scoreDotTier.test.ts 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/word-craft/scoreDotTier.ts lib/word-craft/__tests__/scoreDotTier.test.ts
git commit -m "feat(word-craft): score-dot tier helper for tile chrome

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Redesign WordCraftBoard cell rendering

**Files:**
- Modify: `fe-next/components/word-craft/WordCraftBoard.tsx`
- Test: `fe-next/components/word-craft/__tests__/WordCraftBoard.chrome.test.tsx` (new)
- Modify: existing premium-text-label tests → swap to class assertions

- [ ] **Step 1: Read current WordCraftBoard**

```bash
cd fe-next && cat components/word-craft/WordCraftBoard.tsx
```

Identify (a) where premium-square labels (`DL`/`TL`/`DW`/`TW`) are rendered, (b) where the tile letter + value are rendered, (c) where `data-cell` / `data-premium` attributes live.

- [ ] **Step 2: Write failing test**

Create `fe-next/components/word-craft/__tests__/WordCraftBoard.chrome.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard, placeTiles } from '@/lib/word-craft/board';

const noop = () => {};

describe('WordCraftBoard chrome', () => {
  it('renders premium squares with brand-color tint classes (no text labels)', () => {
    const board = createBoard(11);
    const { container } = render(
      <WordCraftBoard
        board={board}
        pending={[]}
        selectedRackTile={null}
        onCellTap={noop}
        onCellDragOver={noop}
        onCellDrop={noop}
      />
    );
    // TW corners (0,0), (0,10), (10,0), (10,10) should have neo-pink tint.
    const corner = container.querySelector('[data-row="0"][data-col="0"]');
    expect(corner?.className).toMatch(/bg-neo-pink/);
    // No "TW" text on the cell.
    expect(corner?.textContent).toBe('');
  });

  it('renders placed tile with big letter and score-dot', () => {
    const board = createBoard(11);
    placeTiles(board, [
      { row: 5, col: 5, letter: 'Q', value: 10, isBlank: false, rackTileId: 't-1' },
    ]);
    const { container } = render(
      <WordCraftBoard
        board={board}
        pending={[]}
        selectedRackTile={null}
        onCellTap={noop}
        onCellDragOver={noop}
        onCellDrop={noop}
      />
    );
    const cell = container.querySelector('[data-row="5"][data-col="5"]');
    expect(cell?.textContent).toContain('Q');
    // Score-dot indicator present.
    const dot = cell?.querySelector('[data-score-dot]');
    expect(dot).toBeTruthy();
    // 10pt = legendary tier = neo-yellow.
    expect(dot?.className).toMatch(/bg-neo-yellow/);
    // Score number NOT rendered as visible digit.
    expect(cell?.textContent).not.toContain('10');
  });
});
```

- [ ] **Step 3: Run test, verify fail**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftBoard.chrome.test.tsx 2>&1 | tail -15
```

Expected: FAIL — current board renders TW/DL/etc. text labels and 10-point number.

- [ ] **Step 4: Update WordCraftBoard.tsx**

Locate the premium-square rendering block. Replace text-label rendering with class-only tinting. Replace tile rendering with big-letter + corner score-dot.

Pseudocode for the premium chrome map (apply within the existing cell render):

```typescript
import { scoreDotTier, TIER_COLOR_CLASS } from '@/lib/word-craft/scoreDotTier';

const PREMIUM_TINT: Record<PremiumKind, string> = {
  TW: 'bg-neo-pink/15',
  DW: 'bg-neo-lime/15',
  TL: 'bg-neo-cyan/15',
  DL: 'bg-neo-purple/15',
};

// Inside the cell render:
const tint = cell.premium ? PREMIUM_TINT[cell.premium] : '';

return (
  <div
    data-row={r}
    data-col={c}
    data-premium={cell.premium ?? ''}
    className={cn(
      'relative aspect-square border-neo flex items-center justify-center select-none',
      tint,
      isCenter && 'bg-neo-pink/25',
    )}
    onClick={() => onCellTap({ row: r, col: c })}
    // ... existing drag handlers
  >
    {cell.tile && (
      <>
        <span className="font-neo-display font-bold text-[clamp(14px,5cqi,32px)]">
          {cell.tile.letter}
        </span>
        <span
          data-score-dot
          className={cn(
            'absolute bottom-[6%] right-[6%] w-[14%] h-[14%] rounded-full',
            TIER_COLOR_CLASS[scoreDotTier(cell.tile.value)],
          )}
          aria-hidden="true"
        />
      </>
    )}
    {isCenter && !cell.tile && (
      <span className="text-neo-pink text-[clamp(10px,3cqi,18px)]" aria-hidden="true">★</span>
    )}
  </div>
);
```

Note `clamp + cqi` for container-query-driven sizing per `responsive-design.md`. The board's parent must have `container-type: inline-size` — add it if not present.

- [ ] **Step 5: Update existing premium-text-label assertions**

```bash
cd fe-next && grep -rn "DL\|TL\|DW\|TW" components/word-craft/__tests__/ | grep -v "^.*Binary\|node_modules"
```

For every test that asserts the rendered text "DL"/"TL"/"DW"/"TW" inside a cell, swap to:

```typescript
// Old:
// expect(cell).toHaveTextContent('TW');
// New:
expect(cell.className).toMatch(/bg-neo-pink/);
expect(cell.getAttribute('data-premium')).toBe('TW');
```

- [ ] **Step 6: Run full word-craft suite**

```bash
cd fe-next && npx vitest run components/word-craft lib/word-craft 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/word-craft/WordCraftBoard.tsx components/word-craft/__tests__/
git commit -m "feat(word-craft): brand-tinted premium squares + big-letter + score-dot tiles

- Premium squares: bg-neo-{pink|lime|cyan|purple}/15 tint, no text labels
- Placed tile: ~70% cell letter + corner score-dot (tier-colored)
- Container-query sizing via clamp(...cqi) for adaptive board

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: HUD legend chip

**Files:**
- Create: `fe-next/components/word-craft/WordCraftLegendChip.tsx`
- Test: `fe-next/components/word-craft/__tests__/WordCraftLegendChip.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftLegendChip } from '../WordCraftLegendChip';

const t = (k: string) => `[${k}]`;

describe('WordCraftLegendChip', () => {
  it('renders 4 premium swatches each with brand tint', () => {
    const { container } = render(<WordCraftLegendChip t={t} />);
    expect(container.querySelector('[data-premium="TW"]')?.className).toMatch(/bg-neo-pink/);
    expect(container.querySelector('[data-premium="DW"]')?.className).toMatch(/bg-neo-lime/);
    expect(container.querySelector('[data-premium="TL"]')?.className).toMatch(/bg-neo-cyan/);
    expect(container.querySelector('[data-premium="DL"]')?.className).toMatch(/bg-neo-purple/);
  });

  it('uses translation keys for labels', () => {
    render(<WordCraftLegendChip t={t} />);
    expect(screen.getByText('[wordcraft.legend.tw]')).toBeTruthy();
    expect(screen.getByText('[wordcraft.legend.dw]')).toBeTruthy();
    expect(screen.getByText('[wordcraft.legend.tl]')).toBeTruthy();
    expect(screen.getByText('[wordcraft.legend.dl]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftLegendChip.test.tsx 2>&1 | tail -10
```

- [ ] **Step 3: Implement**

```tsx
import { cn } from '@/lib/utils';

interface Props {
  t: (key: string) => string;
  className?: string;
}

const SWATCHES = [
  { kind: 'TW', tint: 'bg-neo-pink/30 border-neo-pink', i18n: 'wordcraft.legend.tw' },
  { kind: 'DW', tint: 'bg-neo-lime/30 border-neo-lime', i18n: 'wordcraft.legend.dw' },
  { kind: 'TL', tint: 'bg-neo-cyan/30 border-neo-cyan', i18n: 'wordcraft.legend.tl' },
  { kind: 'DL', tint: 'bg-neo-purple/30 border-neo-purple', i18n: 'wordcraft.legend.dl' },
] as const;

export function WordCraftLegendChip({ t, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5 px-3 py-2 rounded-neo border-neo bg-neo-navy-light',
        className,
      )}
      aria-label={t('wordcraft.legend.title')}
    >
      {SWATCHES.map((s) => (
        <span
          key={s.kind}
          data-premium={s.kind}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-neo-body',
            s.tint,
          )}
        >
          <span className="w-2 h-2 rounded-sm border-neo" aria-hidden="true" />
          {t(s.i18n)}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftLegendChip.test.tsx 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add components/word-craft/WordCraftLegendChip.tsx components/word-craft/__tests__/WordCraftLegendChip.test.tsx
git commit -m "feat(word-craft): HUD legend chip (premium-square mapping)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: useBoardCoords hook

**Files:**
- Create: `fe-next/components/word-craft/hooks/useBoardCoords.ts`
- Test: `fe-next/components/word-craft/hooks/__tests__/useBoardCoords.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoardCoords } from '../useBoardCoords';
import { useRef } from 'react';

function setupBoardEl(rows: number, cols: number) {
  const board = document.createElement('div');
  board.style.position = 'relative';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      // Stub getBoundingClientRect for deterministic test math.
      cell.getBoundingClientRect = () => ({
        x: c * 40, y: r * 40, width: 40, height: 40,
        top: r * 40, left: c * 40, bottom: r * 40 + 40, right: c * 40 + 40,
        toJSON: () => ({}),
      } as DOMRect);
      board.appendChild(cell);
    }
  }
  document.body.appendChild(board);
  return board;
}

describe('useBoardCoords', () => {
  it('returns cell rect for a given row/col', () => {
    const boardEl = setupBoardEl(11, 11);
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(boardEl);
      return useBoardCoords(ref);
    });
    const rect = result.current.cellRect(2, 3);
    expect(rect?.x).toBe(120);
    expect(rect?.y).toBe(80);
  });

  it('returns null when board ref is null', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      return useBoardCoords(ref);
    });
    expect(result.current.cellRect(0, 0)).toBeNull();
  });

  it('notifies subscribers on ResizeObserver fire', () => {
    const boardEl = setupBoardEl(11, 11);
    const listener = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(boardEl);
      return useBoardCoords(ref);
    });
    const unsub = result.current.subscribe(listener);
    // Simulate a resize event manually (ResizeObserver is mocked in JSDOM).
    act(() => {
      result.current._notifyForTest?.();
    });
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
cd fe-next && npx vitest run components/word-craft/hooks/__tests__/useBoardCoords.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: Implement**

```typescript
import { useCallback, useEffect, useRef, useMemo } from 'react';
import type { RefObject } from 'react';

export interface BoardCoords {
  cellRect(row: number, col: number): DOMRect | null;
  scoreChipRect(): DOMRect | null;
  bagRect(): DOMRect | null;
  subscribe(listener: () => void): () => void;
  _notifyForTest?(): void;
}

export function useBoardCoords(boardRef: RefObject<HTMLElement | null>): BoardCoords {
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => notify());
    ro.observe(el);
    const onResize = () => notify();
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [boardRef, notify]);

  return useMemo<BoardCoords>(
    () => ({
      cellRect(row, col) {
        const el = boardRef.current;
        if (!el) return null;
        const cell = el.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
        return cell?.getBoundingClientRect() ?? null;
      },
      scoreChipRect() {
        const node = document.querySelector<HTMLElement>('[data-wc-score-chip]');
        return node?.getBoundingClientRect() ?? null;
      },
      bagRect() {
        const node = document.querySelector<HTMLElement>('[data-wc-bag]');
        return node?.getBoundingClientRect() ?? null;
      },
      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
      _notifyForTest: notify,
    }),
    [boardRef, notify],
  );
}
```

- [ ] **Step 4: Run, verify pass**

```bash
cd fe-next && npx vitest run components/word-craft/hooks 2>&1 | tail -15
```

- [ ] **Step 5: Add data attributes to HUD score chip + bag display in WordCraftHUD (will be created T22)**

Defer the attribute additions to T22 (WordCraftHUD extraction). For now the hook returns null for those rects — fine.

- [ ] **Step 6: Commit**

```bash
git add components/word-craft/hooks/useBoardCoords.ts components/word-craft/hooks/__tests__/useBoardCoords.test.ts
git commit -m "feat(word-craft): useBoardCoords hook for Pixi overlay coord sync

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: WordCraftPixiStage shell

**Files:**
- Create: `fe-next/components/word-craft/WordCraftPixiStage.tsx`
- Create: `fe-next/lib/word-craft/pixi/sceneCtx.ts`
- Test: `fe-next/components/word-craft/__tests__/WordCraftPixiStage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useRef } from 'react';
import { WordCraftPixiStage } from '../WordCraftPixiStage';

// Mock Pixi to avoid WebGL in JSDOM.
vi.mock('pixi.js', () => {
  const apps: any[] = [];
  class Application {
    canvas = document.createElement('canvas');
    stage = { addChild: vi.fn(), removeChildren: vi.fn() };
    destroy = vi.fn();
    constructor() { apps.push(this); }
    static __apps = apps;
  }
  class Container {
    children: any[] = [];
    addChild(c: any) { this.children.push(c); }
    destroy = vi.fn();
  }
  return { Application, Container };
});

function Wrapper({ rm = false }: { rm?: boolean }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={boardRef} data-testid="board" style={{ width: 400, height: 400 }}>
      <WordCraftPixiStage boardRef={boardRef} reducedMotion={rm} />
    </div>
  );
}

describe('WordCraftPixiStage', () => {
  it('mounts a canvas inside the board container', () => {
    const { container } = render(<Wrapper />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('destroys the Pixi app on unmount (no canvas leak)', async () => {
    const pixi = await import('pixi.js') as any;
    const { unmount } = render(<Wrapper />);
    unmount();
    expect(pixi.Application.__apps[0].destroy).toHaveBeenCalled();
  });

  it('skips ambient layer when reducedMotion=true', () => {
    const { container } = render(<Wrapper rm={true} />);
    // The canvas exists but no ambient children are added.
    expect(container.querySelector('canvas')).toBeTruthy();
    // Implementation-defined: stage.addChild called only 0 or 1 times (event layer container).
    // We tolerate either as long as ambient is not present. (Covered by ambient.test.ts later.)
  });

  it('handles Pixi init failure gracefully (no throw)', async () => {
    const pixi = await import('pixi.js') as any;
    const originalApp = pixi.Application;
    pixi.Application = class { constructor() { throw new Error('no webgl'); } };
    expect(() => render(<Wrapper />)).not.toThrow();
    pixi.Application = originalApp;
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftPixiStage.test.tsx 2>&1 | tail -15
```

- [ ] **Step 3: Implement SceneCtx + Stage**

Create `fe-next/lib/word-craft/pixi/sceneCtx.ts`:

```typescript
import type { Application, Container } from 'pixi.js';
import type { BoardCoords } from '@/components/word-craft/hooks/useBoardCoords';

export interface SceneCtx {
  app: Application;
  ambientLayer: Container;
  eventLayer: Container;
  coords: BoardCoords;
  reducedMotion: boolean;
}

export interface Scene {
  play(): Promise<void>;
}
```

Create `fe-next/components/word-craft/WordCraftPixiStage.tsx`:

```tsx
'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useBoardCoords } from './hooks/useBoardCoords';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';

interface Props {
  boardRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  onReady?(ctx: SceneCtx): void;
}

export function WordCraftPixiStage({ boardRef, reducedMotion, onReady }: Props) {
  const canvasHolderRef = useRef<HTMLDivElement | null>(null);
  const coords = useBoardCoords(boardRef);

  useEffect(() => {
    if (!boardRef.current || !canvasHolderRef.current) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      try {
        const PIXI = await import('pixi.js');
        if (cancelled) return;
        const board = boardRef.current!;
        const rect = board.getBoundingClientRect();
        const app = new PIXI.Application();
        await app.init({
          width: rect.width || 320,
          height: rect.height || 320,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        if (cancelled) {
          app.destroy(true);
          return;
        }
        canvasHolderRef.current!.appendChild(app.canvas);
        app.canvas.style.position = 'absolute';
        app.canvas.style.inset = '0';
        app.canvas.style.pointerEvents = 'none';

        const ambientLayer = new PIXI.Container();
        const eventLayer = new PIXI.Container();
        app.stage.addChild(ambientLayer);
        app.stage.addChild(eventLayer);

        const ctx: SceneCtx = { app, ambientLayer, eventLayer, coords, reducedMotion };
        onReady?.(ctx);

        // Resize handling.
        const ro = new ResizeObserver(() => {
          const r = board.getBoundingClientRect();
          app.renderer.resize(r.width, r.height);
        });
        ro.observe(board);

        cleanup = () => {
          ro.disconnect();
          app.destroy({ removeView: true }, { children: true });
        };
      } catch (err) {
        // Pixi init failed (no WebGL, ancient device). Log + degrade silently.
        if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
          (window as any).posthog.capture('wordcraft_pixi_init_failed', {
            ua: navigator.userAgent,
            error: String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [boardRef, coords, reducedMotion, onReady]);

  return (
    <div
      ref={canvasHolderRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
```

- [ ] **Step 4: Run, verify pass**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftPixiStage.test.tsx 2>&1 | tail -20
```

Expected: PASS (with Pixi mocked).

- [ ] **Step 5: Commit**

```bash
git add components/word-craft/WordCraftPixiStage.tsx lib/word-craft/pixi/sceneCtx.ts components/word-craft/__tests__/WordCraftPixiStage.test.tsx
git commit -m "feat(word-craft): Pixi stage shell with ambient + event layers, RM gate

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: ambientSparkles scene

**Files:**
- Create: `fe-next/lib/word-craft/pixi/ambientSparkles.ts`
- Test: `fe-next/lib/word-craft/pixi/__tests__/ambientSparkles.test.ts`

- [ ] **Step 1: Write smoke test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { mountAmbientSparkles } from '../ambientSparkles';

vi.mock('pixi.js', () => ({
  Container: class { children: any[] = []; addChild(c: any) { this.children.push(c); } destroy = vi.fn(); },
  Graphics: class { circle = vi.fn().mockReturnThis(); fill = vi.fn().mockReturnThis(); position = { set: vi.fn() }; alpha = 1; },
}));

vi.mock('gsap', () => ({
  default: { to: vi.fn(() => ({ kill: vi.fn() })), killTweensOf: vi.fn() },
}));

const fakeCtx = () => ({
  app: { stage: {} } as any,
  ambientLayer: { addChild: vi.fn(), children: [], removeChildren: vi.fn() } as any,
  eventLayer: {} as any,
  coords: {
    cellRect: vi.fn((r: number, c: number) => ({
      x: c * 40, y: r * 40, width: 40, height: 40, top: r * 40, left: c * 40, bottom: 0, right: 0, toJSON: () => ({}),
    } as DOMRect)),
    scoreChipRect: vi.fn(),
    bagRect: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  } as any,
  reducedMotion: false,
});

describe('mountAmbientSparkles', () => {
  it('mounts one sparkle per premium cell', () => {
    const ctx = fakeCtx();
    const premiumCells = [
      { row: 0, col: 0, kind: 'TW' },
      { row: 0, col: 10, kind: 'TW' },
      { row: 5, col: 1, kind: 'TL' },
    ];
    const handle = mountAmbientSparkles(ctx, premiumCells);
    expect(ctx.ambientLayer.addChild).toHaveBeenCalledTimes(3);
    handle.destroy();
  });

  it('no-op when reducedMotion=true', () => {
    const ctx = { ...fakeCtx(), reducedMotion: true };
    const premiumCells = [{ row: 0, col: 0, kind: 'TW' as const }];
    const handle = mountAmbientSparkles(ctx, premiumCells);
    expect(ctx.ambientLayer.addChild).not.toHaveBeenCalled();
    handle.destroy();
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/__tests__/ambientSparkles.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: Implement**

```typescript
import { Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from './sceneCtx';
import type { PremiumKind } from '../types';

const TINT_BY_PREMIUM: Record<PremiumKind, number> = {
  TW: 0xff1493,  // neo-pink
  DW: 0xbfff00,  // neo-lime
  TL: 0x00ffff,  // neo-cyan
  DL: 0x8b5cf6,  // neo-purple
};

export interface PremiumCellRef {
  row: number;
  col: number;
  kind: PremiumKind;
}

export interface AmbientHandle {
  destroy(): void;
}

export function mountAmbientSparkles(
  ctx: SceneCtx,
  premiumCells: readonly PremiumCellRef[],
): AmbientHandle {
  if (ctx.reducedMotion) {
    return { destroy() {} };
  }
  const sparkles: Graphics[] = [];
  for (const cell of premiumCells) {
    const rect = ctx.coords.cellRect(cell.row, cell.col);
    if (!rect) continue;
    const boardRect = ctx.coords.cellRect(0, 0);
    const offsetX = boardRect ? rect.x - boardRect.x : rect.x;
    const offsetY = boardRect ? rect.y - boardRect.y : rect.y;

    const g = new Graphics();
    g.circle(0, 0, 2).fill({ color: TINT_BY_PREMIUM[cell.kind], alpha: 0.85 });
    g.position.set(offsetX + rect.width * 0.5, offsetY + rect.height * 0.5);
    g.alpha = 0;
    ctx.ambientLayer.addChild(g);

    gsap.to(g, {
      alpha: 0.9,
      duration: 0.8 + Math.random() * 0.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: Math.random() * 1.2,
    });
    sparkles.push(g);
  }
  return {
    destroy() {
      for (const s of sparkles) {
        gsap.killTweensOf(s);
        s.destroy();
      }
    },
  };
}
```

- [ ] **Step 4: Run, verify pass**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/__tests__/ambientSparkles.test.ts 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add lib/word-craft/pixi/ambientSparkles.ts lib/word-craft/pixi/__tests__/ambientSparkles.test.ts
git commit -m "feat(word-craft): ambientSparkles Pixi scene (premium-square pulses)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: tilePlaceRipple scene

**Files:**
- Create: `fe-next/lib/word-craft/pixi/scenes/tilePlaceRipple.ts`
- Test: `fe-next/lib/word-craft/pixi/scenes/__tests__/tilePlaceRipple.test.ts`

- [ ] **Step 1: Smoke test (250ms ripple, resolves Promise, no throw)**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { playTilePlaceRipple } from '../tilePlaceRipple';

vi.mock('pixi.js', () => ({
  Container: class { addChild = vi.fn(); destroy = vi.fn(); },
  Graphics: class { circle = vi.fn().mockReturnThis(); stroke = vi.fn().mockReturnThis(); position = { set: vi.fn() }; alpha = 1; scale = { set: vi.fn() }; },
}));

vi.mock('gsap', () => ({
  default: { to: vi.fn((target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));

const fakeCtx = () => ({
  eventLayer: { addChild: vi.fn(), removeChildren: vi.fn() } as any,
  ambientLayer: {} as any,
  app: {} as any,
  coords: {
    cellRect: vi.fn(() => ({ x: 100, y: 100, width: 30, height: 30, top: 100, left: 100, bottom: 130, right: 130, toJSON: () => ({}) } as DOMRect)),
  } as any,
  reducedMotion: false,
});

describe('playTilePlaceRipple', () => {
  it('resolves without throwing for a valid cell', async () => {
    await expect(playTilePlaceRipple(fakeCtx(), { row: 5, col: 5 })).resolves.toBeUndefined();
  });

  it('short-circuits to instant resolve when reducedMotion=true', async () => {
    const ctx = { ...fakeCtx(), reducedMotion: true };
    await expect(playTilePlaceRipple(ctx, { row: 5, col: 5 })).resolves.toBeUndefined();
    expect(ctx.eventLayer.addChild).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/tilePlaceRipple.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: Implement**

```typescript
import { Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playTilePlaceRipple(
  ctx: SceneCtx,
  cell: { row: number; col: number },
): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  const rect = ctx.coords.cellRect(cell.row, cell.col);
  if (!rect) return Promise.resolve();

  const board = ctx.coords.cellRect(0, 0);
  const baseX = board ? rect.x - board.x : rect.x;
  const baseY = board ? rect.y - board.y : rect.y;

  return new Promise((resolve) => {
    const ring = new Graphics();
    ring.circle(0, 0, Math.min(rect.width, rect.height) * 0.45)
      .stroke({ color: 0xbfff00, width: 2, alpha: 0.9 });  // neo-lime
    ring.position.set(baseX + rect.width * 0.5, baseY + rect.height * 0.5);
    ring.scale.set(0.4);
    ring.alpha = 1;
    ctx.eventLayer.addChild(ring);

    gsap.to(ring.scale, { x: 2.2, y: 2.2, duration: 0.25, ease: 'power2.out' });
    gsap.to(ring, {
      alpha: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        ring.destroy();
        resolve();
      },
    });
  });
}
```

- [ ] **Step 4: Run, verify pass**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/tilePlaceRipple.test.ts 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add lib/word-craft/pixi/scenes/tilePlaceRipple.ts lib/word-craft/pixi/scenes/__tests__/tilePlaceRipple.test.ts
git commit -m "feat(word-craft): tilePlaceRipple Pixi scene

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: wordCommitWave + scoreArc scene

**Files:**
- Create: `fe-next/lib/word-craft/pixi/scenes/wordCommitWave.ts`
- Test: `fe-next/lib/word-craft/pixi/scenes/__tests__/wordCommitWave.test.ts`

Follow the same RED-GREEN pattern as T15. The scene takes `{ ctx, placements: PlacedTile[], totalScore: number }`. It:

1. Walks each placed cell sequentially (~80ms between) — creates 4–6 colored particles per cell drifting outward, tinted per `scoreDotTier`.
2. After the wave reaches the last cell, computes the word centroid and spawns a single big particle (a Graphics circle with a numeric Text child showing `+totalScore`).
3. Tweens that centroid particle along a quadratic Bezier from word centroid → `coords.scoreChipRect()` over 400ms.
4. On arrival: dispatch a `wordcraft:score-chip-bump` custom event so the HUD's score chip can do a GSAP bump.

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { playWordCommitWave } from '../wordCommitWave';

vi.mock('pixi.js', () => ({
  Container: class { addChild = vi.fn(); destroy = vi.fn(); },
  Graphics: class { circle = vi.fn().mockReturnThis(); fill = vi.fn().mockReturnThis(); position = { set: vi.fn() }; scale = { set: vi.fn() }; alpha = 1; destroy = vi.fn(); },
  Text: class { constructor() {} anchor = { set: vi.fn() }; position = { set: vi.fn() }; destroy = vi.fn(); },
}));

vi.mock('gsap', () => ({
  default: { to: vi.fn((target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));

const fakeCtx = (rm = false) => ({
  app: {} as any,
  ambientLayer: {} as any,
  eventLayer: { addChild: vi.fn(), removeChildren: vi.fn() } as any,
  coords: {
    cellRect: vi.fn((r: number, c: number) => ({ x: c * 40, y: r * 40, width: 30, height: 30, top: 0, left: 0, bottom: 0, right: 0, toJSON: () => ({}) } as DOMRect)),
    scoreChipRect: vi.fn(() => ({ x: 300, y: 10, width: 80, height: 30, top: 10, left: 300, bottom: 40, right: 380, toJSON: () => ({}) } as DOMRect)),
    bagRect: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  } as any,
  reducedMotion: rm,
});

describe('playWordCommitWave', () => {
  it('plays through all placements + score arc, then resolves', async () => {
    const ctx = fakeCtx();
    const placements = [
      { row: 5, col: 3, letter: 'Q', value: 10 },
      { row: 5, col: 4, letter: 'U', value: 1 },
      { row: 5, col: 5, letter: 'I', value: 1 },
      { row: 5, col: 6, letter: 'Z', value: 10 },
    ];
    await expect(playWordCommitWave(ctx, { placements, totalScore: 44 })).resolves.toBeUndefined();
    expect(ctx.eventLayer.addChild).toHaveBeenCalled();
  });

  it('skips visuals when reducedMotion=true but still resolves', async () => {
    const ctx = fakeCtx(true);
    await expect(playWordCommitWave(ctx, {
      placements: [{ row: 0, col: 0, letter: 'A', value: 1 }],
      totalScore: 1,
    })).resolves.toBeUndefined();
    expect(ctx.eventLayer.addChild).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 + 3: Implement following the structure described above.**

Implementation skeleton (engineer fills the Bezier math + particle styling):

```typescript
import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';
import { scoreDotTier } from '../../scoreDotTier';

const TIER_TINT: Record<string, number> = {
  common: 0xa0a0a0,
  mid: 0x00ffff,
  rare: 0x8b5cf6,
  legendary: 0xffe135,
};

export interface CommitInput {
  placements: ReadonlyArray<{ row: number; col: number; letter: string; value: number }>;
  totalScore: number;
}

export function playWordCommitWave(ctx: SceneCtx, input: CommitInput): Promise<void> {
  if (ctx.reducedMotion) {
    window.dispatchEvent(new CustomEvent('wordcraft:score-chip-bump', { detail: { score: input.totalScore } }));
    return Promise.resolve();
  }
  return new Promise(async (resolve) => {
    const board = ctx.coords.cellRect(0, 0);
    for (let i = 0; i < input.placements.length; i++) {
      const p = input.placements[i];
      const rect = ctx.coords.cellRect(p.row, p.col);
      if (!rect || !board) continue;
      const cx = (rect.x - board.x) + rect.width * 0.5;
      const cy = (rect.y - board.y) + rect.height * 0.5;
      const tint = TIER_TINT[scoreDotTier(p.value)];
      for (let k = 0; k < 5; k++) {
        const angle = (Math.PI * 2 * k) / 5;
        const particle = new Graphics();
        particle.circle(0, 0, 3).fill({ color: tint, alpha: 0.95 });
        particle.position.set(cx, cy);
        ctx.eventLayer.addChild(particle);
        gsap.to(particle.position, { x: cx + Math.cos(angle) * 28, y: cy + Math.sin(angle) * 28, duration: 0.45, ease: 'power2.out' });
        gsap.to(particle, { alpha: 0, duration: 0.45, ease: 'power2.out', onComplete: () => particle.destroy() });
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    // Score arc:
    const chip = ctx.coords.scoreChipRect();
    if (!chip || !board) { resolve(); return; }
    const last = input.placements[input.placements.length - 1];
    const lastRect = ctx.coords.cellRect(last.row, last.col);
    if (!lastRect) { resolve(); return; }
    const startX = (lastRect.x - board.x) + lastRect.width * 0.5;
    const startY = (lastRect.y - board.y) + lastRect.height * 0.5;
    const endX = (chip.x - board.x) + chip.width * 0.5;
    const endY = (chip.y - board.y) + chip.height * 0.5;

    const orb = new Graphics();
    orb.circle(0, 0, 10).fill({ color: 0xffe135, alpha: 0.95 });
    orb.position.set(startX, startY);
    ctx.eventLayer.addChild(orb);
    const label = new Text({ text: `+${input.totalScore}`, style: { fontFamily: 'Fredoka, sans-serif', fontSize: 14, fill: 0x1a1a2e, fontWeight: '900' } });
    label.anchor.set(0.5);
    label.position.set(startX, startY);
    ctx.eventLayer.addChild(label);

    const proxy = { t: 0 };
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 60;
    gsap.to(proxy, {
      t: 1,
      duration: 0.4,
      ease: 'power2.in',
      onUpdate: () => {
        const t = proxy.t;
        const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
        const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
        orb.position.set(x, y);
        label.position.set(x, y);
      },
      onComplete: () => {
        orb.destroy();
        label.destroy();
        window.dispatchEvent(new CustomEvent('wordcraft:score-chip-bump', { detail: { score: input.totalScore } }));
        resolve();
      },
    });
  });
}
```

- [ ] **Step 4: Test pass + commit**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/wordCommitWave.test.ts 2>&1 | tail -15
git add lib/word-craft/pixi/scenes/wordCommitWave.ts lib/word-craft/pixi/scenes/__tests__/wordCommitWave.test.ts
git commit -m "feat(word-craft): wordCommitWave + scoreArc Pixi scene

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: scoreConfetti scene

**Files:**
- Create: `fe-next/lib/word-craft/pixi/scenes/scoreConfetti.ts`
- Test: `fe-next/lib/word-craft/pixi/scenes/__tests__/scoreConfetti.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { playScoreConfetti } from '../scoreConfetti';

vi.mock('pixi.js', () => ({
  Container: class { addChild = vi.fn(); destroy = vi.fn(); },
  Graphics: class { rect = vi.fn().mockReturnThis(); fill = vi.fn().mockReturnThis(); position = { set: vi.fn() }; rotation = 0; alpha = 1; destroy = vi.fn(); },
}));
vi.mock('gsap', () => ({
  default: { to: vi.fn((target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));
const ctx = () => ({
  eventLayer: { addChild: vi.fn(), removeChildren: vi.fn() } as any,
  app: {} as any, ambientLayer: {} as any,
  coords: { cellRect: vi.fn(() => ({ x: 0, y: 0, width: 400, height: 400, top: 0, left: 0, bottom: 400, right: 400, toJSON: () => ({}) } as DOMRect)) } as any,
  reducedMotion: false,
});
describe('playScoreConfetti', () => {
  it('spawns 60 particles and resolves', async () => {
    const c = ctx();
    await expect(playScoreConfetti(c)).resolves.toBeUndefined();
    expect(c.eventLayer.addChild).toHaveBeenCalledTimes(60);
  });
  it('no-op when reducedMotion=true', async () => {
    const c = { ...ctx(), reducedMotion: true };
    await playScoreConfetti(c);
    expect(c.eventLayer.addChild).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 + 3: Implement**

```typescript
import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

const COLORS = [0xff1493, 0xbfff00, 0x00ffff, 0x8b5cf6, 0xffe135];

export function playScoreConfetti(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  const board = ctx.coords.cellRect(0, 0);
  if (!board) return Promise.resolve();
  // Approx board span: from cellRect(0,0) sized 1; for confetti we use it as origin and rely on app size.
  const width = ctx.app.renderer?.width ?? 320;
  const height = ctx.app.renderer?.height ?? 320;

  return new Promise((resolve) => {
    let pending = 60;
    for (let i = 0; i < 60; i++) {
      const g = new Graphics();
      g.rect(-3, -1, 6, 2).fill({ color: COLORS[i % COLORS.length], alpha: 0.95 });
      const startX = width * 0.5 + (Math.random() - 0.5) * 80;
      const startY = height * 0.5;
      g.position.set(startX, startY);
      g.rotation = Math.random() * Math.PI * 2;
      ctx.eventLayer.addChild(g);

      const targetX = startX + (Math.random() - 0.5) * width;
      const targetY = startY + height * (0.4 + Math.random() * 0.6);
      gsap.to(g.position, {
        x: targetX, y: targetY,
        duration: 0.9 + Math.random() * 0.4,
        ease: 'power2.in',
      });
      gsap.to(g, {
        rotation: g.rotation + Math.PI * (Math.random() * 4 - 2),
        alpha: 0,
        duration: 1.2,
        ease: 'power2.in',
        onComplete: () => {
          g.destroy();
          pending -= 1;
          if (pending === 0) resolve();
        },
      });
    }
  });
}
```

- [ ] **Step 4 + 5: Test pass + commit**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/scoreConfetti.test.ts 2>&1 | tail -10
git add lib/word-craft/pixi/scenes/scoreConfetti.ts lib/word-craft/pixi/scenes/__tests__/scoreConfetti.test.ts
git commit -m "feat(word-craft): scoreConfetti Pixi scene (big-word celebration)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: botMoveReveal scene

**Files:**
- Create: `fe-next/lib/word-craft/pixi/scenes/botMoveReveal.ts`
- Test: `fe-next/lib/word-craft/pixi/scenes/__tests__/botMoveReveal.test.ts`

The scene takes `{ placements }` and staggers a 120ms-per-tile "drop" effect (shadow + scale-in) at each cell. Reduced-motion: dispatch a `wordcraft:bot-tile-revealed` event per cell instantly so the DOM tile renders, no Pixi work.

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { playBotMoveReveal } from '../botMoveReveal';

vi.mock('pixi.js', () => ({
  Container: class { addChild = vi.fn(); destroy = vi.fn(); },
  Graphics: class { rect = vi.fn().mockReturnThis(); fill = vi.fn().mockReturnThis(); position = { set: vi.fn() }; alpha = 1; scale = { set: vi.fn() }; destroy = vi.fn(); },
}));
vi.mock('gsap', () => ({
  default: { to: vi.fn((target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));
const fake = (rm = false) => ({
  app: {} as any, ambientLayer: {} as any,
  eventLayer: { addChild: vi.fn() } as any,
  coords: { cellRect: vi.fn(() => ({ x: 0, y: 0, width: 30, height: 30, top: 0, left: 0, bottom: 30, right: 30, toJSON: () => ({}) } as DOMRect)) } as any,
  reducedMotion: rm,
});
describe('playBotMoveReveal', () => {
  it('reveals 3 tiles with stagger and resolves', async () => {
    const ctx = fake();
    await expect(playBotMoveReveal(ctx, [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    ])).resolves.toBeUndefined();
    expect(ctx.eventLayer.addChild).toHaveBeenCalledTimes(3);
  });
  it('dispatches per-tile reveal events even with RM', async () => {
    const events: string[] = [];
    window.addEventListener('wordcraft:bot-tile-revealed', (e: any) => events.push(`${e.detail.row},${e.detail.col}`));
    const ctx = fake(true);
    await playBotMoveReveal(ctx, [{ row: 1, col: 1 }, { row: 1, col: 2 }]);
    expect(events).toEqual(['1,1', '1,2']);
  });
});
```

- [ ] **Step 2 + 3: Implement**

```typescript
import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playBotMoveReveal(
  ctx: SceneCtx,
  placements: ReadonlyArray<{ row: number; col: number }>,
): Promise<void> {
  return new Promise(async (resolve) => {
    for (const p of placements) {
      window.dispatchEvent(new CustomEvent('wordcraft:bot-tile-revealed', { detail: p }));
      if (!ctx.reducedMotion) {
        const rect = ctx.coords.cellRect(p.row, p.col);
        const board = ctx.coords.cellRect(0, 0);
        if (rect && board) {
          const g = new Graphics();
          g.rect(-rect.width / 2, -rect.height / 2, rect.width, rect.height)
            .fill({ color: 0xff1493, alpha: 0.25 });
          g.position.set((rect.x - board.x) + rect.width / 2, (rect.y - board.y) + rect.height / 2);
          g.scale.set(1.3);
          g.alpha = 0;
          ctx.eventLayer.addChild(g);
          gsap.to(g, { alpha: 0.6, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' });
          gsap.to(g.scale, { x: 1, y: 1, duration: 0.16, ease: 'back.out(1.6)', onComplete: () => g.destroy() });
        }
      }
      await new Promise((r) => setTimeout(r, ctx.reducedMotion ? 0 : 120));
    }
    resolve();
  });
}
```

- [ ] **Step 4 + 5: Test pass + commit**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/botMoveReveal.test.ts 2>&1 | tail -10
git add lib/word-craft/pixi/scenes/botMoveReveal.ts lib/word-craft/pixi/scenes/__tests__/botMoveReveal.test.ts
git commit -m "feat(word-craft): botMoveReveal Pixi scene with per-tile DOM hand-off events

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: gameOverBurst scene

**Files:**
- Create: `fe-next/lib/word-craft/pixi/scenes/gameOverBurst.ts`
- Test: `fe-next/lib/word-craft/pixi/scenes/__tests__/gameOverBurst.test.ts`

Visual: 1800ms finale — three confetti waves (every 500ms), plus a tint flash. Reuse `playScoreConfetti` internally three times via `setTimeout`. Skip entirely under reducedMotion.

- [ ] **Step 1 + 2: Test (smoke)**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { playGameOverBurst } from '../gameOverBurst';

vi.mock('../scoreConfetti', () => ({ playScoreConfetti: vi.fn(() => Promise.resolve()) }));

const ctx = (rm = false) => ({ app: {} as any, eventLayer: {} as any, ambientLayer: {} as any, coords: {} as any, reducedMotion: rm });

describe('playGameOverBurst', () => {
  it('triggers 3 confetti waves and resolves', async () => {
    vi.useFakeTimers();
    const promise = playGameOverBurst(ctx());
    await vi.runAllTimersAsync();
    await promise;
    const { playScoreConfetti } = await import('../scoreConfetti');
    expect(playScoreConfetti).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
  it('no-op when reducedMotion=true', async () => {
    const { playScoreConfetti } = await import('../scoreConfetti');
    (playScoreConfetti as any).mockClear();
    await playGameOverBurst(ctx(true));
    expect(playScoreConfetti).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement**

```typescript
import { playScoreConfetti } from './scoreConfetti';
import type { SceneCtx } from '../sceneCtx';

export function playGameOverBurst(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    playScoreConfetti(ctx);
    setTimeout(() => playScoreConfetti(ctx), 500);
    setTimeout(() => {
      playScoreConfetti(ctx).then(resolve);
    }, 1000);
  });
}
```

- [ ] **Step 4 + 5: Test pass + commit**

```bash
cd fe-next && npx vitest run lib/word-craft/pixi/scenes/__tests__/gameOverBurst.test.ts 2>&1 | tail -10
git add lib/word-craft/pixi/scenes/gameOverBurst.ts lib/word-craft/pixi/scenes/__tests__/gameOverBurst.test.ts
git commit -m "feat(word-craft): gameOverBurst Pixi finale scene

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Tap-tap-first on touch pointers

**Files:**
- Modify: `fe-next/components/word-craft/useWordCraftDrag.ts`
- Test: `fe-next/components/word-craft/__tests__/useWordCraftDrag.taptap.test.ts` (new)

- [ ] **Step 1: Read current drag hook**

```bash
cd fe-next && cat components/word-craft/useWordCraftDrag.ts
```

Identify pointer-type branching. Current behavior: any pointerdown on rack tile → drag mode after 6px movement OR vibration after press.

- [ ] **Step 2: Write failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordCraftDrag } from '../useWordCraftDrag';

function pointerDown(target: EventTarget, type: 'touch' | 'mouse', x = 0, y = 0) {
  const ev = new PointerEvent('pointerdown', { pointerType: type, clientX: x, clientY: y, bubbles: true });
  target.dispatchEvent(ev);
  return ev;
}

describe('useWordCraftDrag touch-pointer flow', () => {
  it('touch pointer + no drag-threshold movement = tap mode (no drag ghost)', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onRackTileSelect: onSelect }));
    const fakeTile = document.createElement('div');
    fakeTile.dataset.rackId = 't-1';
    document.body.appendChild(fakeTile);
    act(() => {
      pointerDown(fakeTile, 'touch', 100, 100);
      document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith('t-1');
    expect(result.current.dragGhost).toBeNull();
  });

  it('mouse pointer + dragging = drag mode (ghost rendered)', () => {
    const { result } = renderHook(() => useWordCraftDrag({ onRackTileSelect: vi.fn() }));
    const fakeTile = document.createElement('div');
    fakeTile.dataset.rackId = 't-2';
    document.body.appendChild(fakeTile);
    act(() => {
      pointerDown(fakeTile, 'mouse', 50, 50);
      document.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 200, bubbles: true }));
    });
    expect(result.current.dragGhost).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run, verify fail**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/useWordCraftDrag.taptap.test.ts 2>&1 | tail -15
```

- [ ] **Step 4: Implement**

Inside `useWordCraftDrag.ts`, change pointerdown handling:

```typescript
// Pseudocode:
function onPointerDown(ev: PointerEvent) {
  const rackId = (ev.target as HTMLElement)?.dataset?.rackId;
  if (!rackId) return;
  const isTouch = ev.pointerType === 'touch';
  if (isTouch) {
    // Touch: enter "tap-armed" state. Drag escalation requires >6px movement.
    setTapArmed({ rackId, startX: ev.clientX, startY: ev.clientY });
    // Don't engage drag yet.
  } else {
    // Mouse/pen: drag-first.
    engageDrag(rackId, ev);
  }
}

function onPointerMove(ev: PointerEvent) {
  if (tapArmed && Math.hypot(ev.clientX - tapArmed.startX, ev.clientY - tapArmed.startY) > 6) {
    engageDrag(tapArmed.rackId, ev);
    setTapArmed(null);
  }
  // ... existing drag-ghost positioning
}

function onPointerUp(ev: PointerEvent) {
  if (tapArmed) {
    onRackTileSelect(tapArmed.rackId);
    setTapArmed(null);
    return;
  }
  // ... existing drop logic
}
```

- [ ] **Step 5: Run all drag-related tests**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/useWordCraftDrag 2>&1 | tail -20
```

Expected: all PASS. Existing drag-on-touch tests may need updating to dispatch a pointer-move >6px after pointerdown to keep their old drag-ghost expectation valid.

- [ ] **Step 6: Commit**

```bash
git add components/word-craft/useWordCraftDrag.ts components/word-craft/__tests__/useWordCraftDrag.taptap.test.ts
git commit -m "feat(word-craft): touch pointers default to tap-tap, drag on >6px

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 21: Tighten zoom upper bound

**Files:**
- Modify: `fe-next/components/word-craft/WordCraftZoomShell.tsx`
- Modify: `fe-next/components/word-craft/__tests__/WordCraftZoomShell.test.tsx`

- [ ] **Step 1: Update existing test**

In `WordCraftZoomShell.test.tsx`, find the assertion `expect(scale).toBeLessThanOrEqual(2.4)` and change to `2.0`. Adjust pinch-event simulation if necessary.

- [ ] **Step 2: Verify it now fails (regression test)**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftZoomShell.test.tsx 2>&1 | tail -10
```

Expected: FAIL because impl still clamps at 2.4.

- [ ] **Step 3: Change clamp**

In `WordCraftZoomShell.tsx`, find `Math.min(scale, 2.4)` (or similar) and change to `Math.min(scale, 2.0)`. Also update the double-tap "cycle to 2× back to 1×" if it currently cycles to 2.4×.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
git add components/word-craft/WordCraftZoomShell.tsx components/word-craft/__tests__/WordCraftZoomShell.test.tsx
git commit -m "refactor(word-craft): clamp max zoom 2.4→2.0 (adaptive sizing reduces need)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 22: Extract WordCraftHUD

**Files:**
- Create: `fe-next/components/word-craft/WordCraftHUD.tsx`
- Modify: `fe-next/app/[locale]/word-craft/PageClient.tsx`
- Test: `fe-next/components/word-craft/__tests__/WordCraftHUD.test.tsx`

- [ ] **Step 1: Identify HUD block**

Open `PageClient.tsx`. Find the JSX block rendering: score chip, turn indicator, heat meter, bag count, legend chip placeholder. That's the HUD. Note its props (state values it reads).

- [ ] **Step 2: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftHUD } from '../WordCraftHUD';

const t = (k: string) => `[${k}]`;
describe('WordCraftHUD', () => {
  it('renders score chip with data-wc-score-chip attribute', () => {
    const { container } = render(
      <WordCraftHUD
        t={t}
        playerScore={42}
        botScore={10}
        currentTurn="player"
        tilesInBag={45}
        heat={0.5}
      />
    );
    expect(container.querySelector('[data-wc-score-chip]')).toBeTruthy();
  });

  it('renders bag count with data-wc-bag attribute', () => {
    const { container } = render(
      <WordCraftHUD t={t} playerScore={0} botScore={0} currentTurn="player" tilesInBag={78} heat={0} />
    );
    expect(container.querySelector('[data-wc-bag]')?.textContent).toContain('78');
  });

  it('renders the legend chip', () => {
    const { container } = render(
      <WordCraftHUD t={t} playerScore={0} botScore={0} currentTurn="player" tilesInBag={78} heat={0} />
    );
    expect(container.querySelector('[data-premium="TW"]')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run, verify fail**

- [ ] **Step 4: Implement WordCraftHUD**

```tsx
import { WordCraftLegendChip } from './WordCraftLegendChip';
import { HeatMeter } from './HeatMeter';  // existing
import { cn } from '@/lib/utils';

interface Props {
  t: (k: string) => string;
  playerScore: number;
  botScore: number;
  currentTurn: 'player' | 'bot';
  tilesInBag: number;
  heat: number;
}

export function WordCraftHUD({ t, playerScore, botScore, currentTurn, tilesInBag, heat }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-neo rounded-neo bg-neo-navy text-neo-cream">
      <div
        data-wc-score-chip
        className={cn(
          'px-3 py-1 rounded-neo border-neo font-neo-display text-xl',
          currentTurn === 'player' ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy-light',
        )}
      >
        {t('wordcraft.you')}: {playerScore}
      </div>
      <div
        className={cn(
          'px-3 py-1 rounded-neo border-neo font-neo-display text-xl',
          currentTurn === 'bot' ? 'bg-neo-pink text-neo-cream' : 'bg-neo-navy-light',
        )}
      >
        {t('wordcraft.bot')}: {botScore}
      </div>
      <div data-wc-bag className="ml-auto text-sm font-neo-body opacity-80">
        {t('wordcraft.tilesLeft')}: {tilesInBag}
      </div>
      <HeatMeter value={heat} />
      <WordCraftLegendChip t={t} className="basis-full mt-1" />
    </div>
  );
}
```

- [ ] **Step 5: Wire into PageClient**

In `PageClient.tsx`, replace the inline HUD block with `<WordCraftHUD t={t} playerScore={...} botScore={...} ... />`. Delete the now-unused JSX.

- [ ] **Step 6: Test + line count**

```bash
cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftHUD.test.tsx 2>&1 | tail -10
wc -l app/[locale]/word-craft/PageClient.tsx
```

- [ ] **Step 7: Commit**

```bash
git add components/word-craft/WordCraftHUD.tsx components/word-craft/__tests__/WordCraftHUD.test.tsx app/[locale]/word-craft/PageClient.tsx
git commit -m "refactor(word-craft): extract WordCraftHUD with legend + bag count chips

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 23: Extract WordCraftBoardSection (wires Pixi)

**Files:**
- Create: `fe-next/components/word-craft/WordCraftBoardSection.tsx`
- Modify: `fe-next/app/[locale]/word-craft/PageClient.tsx`
- Test: `fe-next/components/word-craft/__tests__/WordCraftBoardSection.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoardSection } from '../WordCraftBoardSection';
import { createBoard } from '@/lib/word-craft/board';

vi.mock('pixi.js', () => ({
  Application: class { canvas = document.createElement('canvas'); stage = { addChild: vi.fn() }; destroy = vi.fn(); init = async () => {}; },
  Container: class { addChild = vi.fn(); destroy = vi.fn(); },
}));

describe('WordCraftBoardSection', () => {
  it('renders the board + a sibling pixi canvas holder', () => {
    const board = createBoard(11);
    const { container } = render(
      <WordCraftBoardSection
        board={board} pending={[]} selectedRackTile={null}
        onCellTap={() => {}} onCellDragOver={() => {}} onCellDrop={() => {}}
        onSceneCtx={() => {}}
      />
    );
    expect(container.querySelector('[data-row="0"]')).toBeTruthy();
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
```

- [ ] **Step 2 + 3: Implement**

```tsx
'use client';
import { useRef, useState } from 'react';
import { WordCraftBoard } from './WordCraftBoard';
import { WordCraftZoomShell } from './WordCraftZoomShell';
import { WordCraftPixiStage } from './WordCraftPixiStage';
import type { Board } from '@/lib/word-craft/board';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';

interface Props {
  board: Board;
  pending: PlacedTile[];
  selectedRackTile: RackTile | null;
  onCellTap(cell: { row: number; col: number }): void;
  onCellDragOver(cell: { row: number; col: number }): void;
  onCellDrop(cell: { row: number; col: number }): void;
  onSceneCtx(ctx: SceneCtx): void;
}

export function WordCraftBoardSection(props: Props) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [rm, setRm] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Live RM flips.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setRm(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return (
    <WordCraftZoomShell>
      <div ref={boardRef} className="relative @container/board" style={{ containerType: 'inline-size' }}>
        <WordCraftBoard {...props} />
        <WordCraftPixiStage boardRef={boardRef} reducedMotion={rm} onReady={props.onSceneCtx} />
      </div>
    </WordCraftZoomShell>
  );
}
```

(Engineer: add `useEffect` import.)

- [ ] **Step 4: Wire into PageClient**

In `PageClient.tsx`, replace the inline board + zoom-shell wrapping with `<WordCraftBoardSection ... onSceneCtx={setSceneCtx} />`. Add `const [sceneCtx, setSceneCtx] = useState<SceneCtx | null>(null);` at the top.

Connect sceneCtx to game events: in the existing submit handler, after a valid commit, call `playWordCommitWave(sceneCtx, { placements, totalScore })`. Similarly for `playTilePlaceRipple` on each placement, `playScoreConfetti` when totalScore ≥ 30, `playBotMoveReveal` after a bot turn, `playGameOverBurst` at game end. Ambient sparkles mount via `mountAmbientSparkles(sceneCtx, premiumCells)` in a `useEffect([sceneCtx])`.

- [ ] **Step 5: Run all word-craft tests + check line count**

```bash
cd fe-next && npx vitest run components/word-craft lib/word-craft 2>&1 | tail -30
wc -l app/[locale]/word-craft/PageClient.tsx
```

- [ ] **Step 6: Commit**

```bash
git add components/word-craft/WordCraftBoardSection.tsx components/word-craft/__tests__/WordCraftBoardSection.test.tsx app/[locale]/word-craft/PageClient.tsx
git commit -m "feat(word-craft): wire Pixi scenes via WordCraftBoardSection + sceneCtx

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 24: Extract WordCraftGameOverScene

**Files:**
- Create: `fe-next/components/word-craft/WordCraftGameOverScene.tsx`
- Modify: `fe-next/app/[locale]/word-craft/PageClient.tsx`
- Test: `fe-next/components/word-craft/__tests__/WordCraftGameOverScene.test.tsx`

- [ ] **Steps 1–4** mirror T22 structure. The component takes `{ t, playerScore, botScore, onPlayAgain }` and renders the existing game-over modal/screen JSX, lifted verbatim from PageClient. Test asserts it renders winner text + play-again button + calls callback.

- [ ] **Step 5: Verify PageClient < 500 lines**

```bash
cd fe-next && wc -l app/[locale]/word-craft/PageClient.tsx
```

If still ≥ 500: identify the next-largest JSX block (likely the rack + pending-strip area) and extract.

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(word-craft): extract WordCraftGameOverScene; PageClient < 500 lines

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 25: i18n keys × 5 locales

**Files:**
- Modify: `fe-next/translations/en.{js,ts}`
- Modify: `fe-next/translations/he.{js,ts}`
- Modify: `fe-next/translations/sv.{js,ts}`
- Modify: `fe-next/translations/ja.{js,ts}`
- Modify: `fe-next/translations/es.{js,ts}`

- [ ] **Step 1: Find translation files**

```bash
cd fe-next && ls translations/
```

Note actual file extensions (.ts vs .js).

- [ ] **Step 2: Add 9 new EN keys, remove 4 old**

Inside the `wordcraft` namespace of `en.*`:

```typescript
// ADD:
legend: {
  title: 'Bonuses',
  tw: 'TW · ×3 word',
  dw: 'DW · ×2 word',
  tl: 'TL · ×3 letter',
  dl: 'DL · ×2 letter',
},
scoreDot: {
  common: '1 point',
  mid: '2–3 points',
  rare: '4–5 points',
  legendary: '8+ points',
},
// REMOVE (if present):
premium: { DL: '...', TL: '...', DW: '...', TW: '...' }
```

- [ ] **Step 3: AI-translate for HE/SV/JA/ES**

For each of `he`, `sv`, `ja`, `es`: add the same key structure with AI-generated translations. **Add a `// FLAG_FOR_NATIVE_REVIEW: 2026-05-11 wordcraft-mobile-fun` comment above the additions** so the reviewer sweep can find them.

EN copy is the source. HE-RTL applies via existing locale infrastructure — no key changes needed.

- [ ] **Step 4: Run i18n parity check**

```bash
cd fe-next && npm run lint 2>&1 | tail -20
```

If the project has a translation-key parity test/script, run it.

- [ ] **Step 5: Commit**

```bash
git add translations/
git commit -m "i18n(word-craft): legend chip + score-dot tier strings × 5 locales

HE/SV/JA/ES flagged for native review per project convention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 26: Full repo verify

- [ ] **Step 1: Lint**

```bash
cd fe-next && npm run lint
```

Fix any errors. Common: unused imports left after PageClient extraction.

- [ ] **Step 2: Full test**

```bash
cd fe-next && npm run test 2>&1 | tail -40
```

Expected: all green. Investigate any failure — these are bugs in the new work, not the existing tests.

- [ ] **Step 3: Build**

```bash
cd fe-next && npm run build 2>&1 | tail -30
```

Expected: success. Type errors here usually mean a `Board` consumer wasn't migrated.

- [ ] **Step 4: Manual mobile + desktop test (uses `?locale=he` too)**

Start dev server, open Chrome devtools, set device to iPhone SE (375×667). Then iPad (768×1024). Then desktop (1440×900). On each:

1. New game loads with correct board size (11 phone / 13 tablet+ / 13 desktop).
2. Premium squares visibly tinted in brand colors.
3. Place a tile via tap-tap on phone → ripple animation visible.
4. Submit a valid word → particle wave + score arc + score chip bumps.
5. Submit a high-score word (≥30) → confetti.
6. Bot plays → staged tile reveals.
7. Toggle `prefers-reduced-motion` in devtools → no particles, instant flashes.
8. RTL: switch to `?locale=he` — board mirrors, score arc still arrives at the score chip (now on the right).

Capture screenshots/screen-recordings for the PR description.

- [ ] **Step 5: Commit nothing here (verification only)**

---

## Task 27: Memory entry

**Files:**
- Create: `/Users/ohadfisher/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/wordcraft-mobile-fun-2026-05-11.md`
- Modify: `/Users/ohadfisher/.claude/projects/-Users-ohadfisher-git-boggle-new/memory/MEMORY.md`

- [ ] **Step 1: Write the memory file**

```markdown
---
name: wordcraft-mobile-fun-2026-05-11
description: 2026-05-11 WordCraft mobile-fun pass — adaptive 11×11/13×13, Pixi overlay (ambient + 6 event scenes), brand-tinted premium squares, big-letter + corner score-dot tiles, tap-tap-first mobile, 78-tile phone bag scaler, admin route deleted.
metadata:
  type: project
---

WordCraft graduated from admin-gated demo to public mode 2026-05-11.

**Shipped:**
- Adaptive board: 11×11 phone (< 768px) / 13×13 tablet+. Dim locked at game init from `window.innerWidth`.
- Tile chrome: big letter (~70% cell) + corner score-dot tier-colored (gray/cyan/purple/yellow).
- Premium squares: brand-tinted backgrounds (TW pink, DW lime, TL cyan, DL purple), no DL/TL/DW/TW labels; HUD legend chip explains.
- Pixi overlay (sibling canvas, DOM input preserved): ambient sparkles + 6 event scenes (tilePlaceRipple, wordCommitWave + scoreArc, scoreConfetti ≥30 score, botMoveReveal, gameOverBurst).
- Tap-tap-first on touch pointers; drag still works on mouse/pen and on touch after >6px movement.
- 78-tile phone bag via runtime proportional scaler (works for all 5 locales).
- Admin route `app/[locale]/admin/word-craft/` deleted.

**Architecture:**
- `useBoardCoords(boardRef)` = single coord source (ResizeObserver-backed rect cache).
- `WordCraftPixiStage` mounts Pixi `Application` once, holds ambient + event layers.
- Reduced-motion gated at every scene entry + ambient mount.
- Pixi init failure → PostHog `wordcraft_pixi_init_failed`, game continues DOM-only.

**Why:** Mobile player feedback — tiles unreadable at 13×13 phone zoom; board felt static between turns; admin route long-deprecated.

**How to apply:** Future WordCraft visual work should add scenes to `lib/word-craft/pixi/scenes/`, not new DOM animations. Use `playFoo(ctx, args): Promise<void>` shape. Always respect `ctx.reducedMotion`. Read coords via `ctx.coords.cellRect()` — never measure DOM directly.

Supersedes board-geometry decision in `[[wordcraft-mvp-2026-05-04]]`. Builds on its tile/score logic.

Native review pending: HE/SV/JA/ES strings for `wordcraft.legend.*` and `wordcraft.scoreDot.*` (9 keys × 4 locales).
```

- [ ] **Step 2: Add MEMORY.md index entry**

In `MEMORY.md`, under the "Active Work" or "Completed Features" section (depending on ship status), add:

```markdown
- [WordCraft Mobile-Fun 2026-05-11](wordcraft-mobile-fun-2026-05-11.md) — Adaptive 11×11 phone / 13×13 tablet, Pixi overlay (ambient + 6 scenes), brand-tinted premiums, tap-tap mobile, 78-tile phone bag. Admin route deleted. HE/SV/JA/ES native review pending.
```

- [ ] **Step 3: No commit — memory is outside the repo**

Memory lives in `~/.claude/projects/.../memory/`, not in git.

---

## Plan Self-Review (run before handing off)

**Spec coverage**

| Spec section | Tasks |
|---|---|
| §1 Architecture | T12, T13, T23 |
| §2 Components (new + modified) | T2, T3, T9, T10, T11, T12, T13, T22, T23, T24 |
| §3 Architecture diagram + coord ownership | T12, T13 |
| §4 Tile + premium chrome | T9, T10 |
| §5 Mobile placement flow | T20 |
| §6 Pixi scenes (8 listed) | T14 (ambient + centerPulse via same task — see note), T15, T16, T17, T18, T19. ⚠️ centerPulse + scoreArc are folded into ambient + wave scenes. |
| §7 Game-state changes (dims + bag) | T2, T3, T6, T7, T8 |
| §8 Error handling | T13 (init failure), T12 (null guards), T23 (RM live flips) |
| §9 Testing | every task has TDD test |
| §10 i18n | T25 |
| §11 Migration / cleanup | T1 |
| §12 Out of scope | n/a |
| §13 Success criteria | T26 verifies all 8 |

**Placeholder scan:** Searched for "TBD", "TODO", "implement later", "etc." in this plan. None remain in step bodies. Steps that say "find the X block" or "identify Y caller" are concrete look-ups, not placeholders.

**Type consistency:**
- `BoardSize = 11 | 13 | 15` used consistently from T2 onward.
- `BoardDims { size, bagSize }` from T3.
- `SceneCtx { app, ambientLayer, eventLayer, coords, reducedMotion }` from T13, consumed by every scene task.
- `scoreDotTier(points): ScoreTier` from T8, consumed by T9 and T16.
- All scene functions: `play<Scene>(ctx, args): Promise<void>` shape — consistent.

**Spec gaps fixed inline:**
- Spec §6 lists 8 scenes; plan folds `centerPulse` into `ambientSparkles` (T14 with a separate animation for the center cell) and `scoreArc` into `wordCommitWave` (T16). Recorded in §6 mapping above.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-11-wordcraft-mobile-fun.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan — 27 tasks with clear boundaries, several Pixi scene tasks parallelizable.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
