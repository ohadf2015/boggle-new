# Word Craft Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Word Craft gets a pre-game setup screen (opponent + difficulty + modifier choice), a decluttered board-first game screen, auto-centered first letter, two new felt modifiers, and a drag system that does 1 layout read per pointermove instead of ~225.

**Architecture:** All client-side. Engine changes live in `fe-next/lib/word-craft/` (pure, reducer-driven, seeded — fully unit-testable). UI changes in `fe-next/components/word-craft/` + `fe-next/app/[locale]/word-craft/PageClient.tsx`, which is split into a thin phase-switcher + extracted `WordCraftGameScreen`. Spec: `docs/superpowers/specs/2026-07-03-word-craft-overhaul-design.md`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind (neo-brutalist tokens), Vitest (`npm run test:frontend`), i18n via `t()` with keys in `translations/{en,he,sv,ja,es,ru}.js`.

## Global Constraints

- ALL UI text via `t('key')` — keys added to ALL SIX locale files (en, he, sv, ja, es, ru). Native phrasing, not literal translation.
- Max 500 lines per file; components < 300 lines preferred.
- TDD mandatory: failing test first, minimal code, refactor.
- Run from `fe-next/`: `npm run lint` + `npx vitest run <paths>` per task; full `npm run test` + `npm run build` at the end.
- Dark-only neo-brutalist design tokens (`neo-*`, `shadow-hard*`, `border-neo*`, `rounded-neo`, Fredoka/Rubik).
- Do NOT commit without asking the user first (per-phase commit points marked below).
- Word Craft game locales are `en/sv/he/es/ja` (no `ru` tile bag) — but UI strings still ship in all 6 files.
- `WordCraftModifier` values must stay language-agnostic (no vowel/letter-shape rules).

---

### Task 1: Engine — `modifierOverride` option

**Files:**
- Modify: `fe-next/lib/word-craft/useWordCraftGame.ts` (buildInitial ~line 95, Action RESET ~line 91, options ~line 318, hook signature ~line 352, `reset` ~line 416)
- Test: `fe-next/lib/word-craft/__tests__/useWordCraftGame.modifierOverride.test.ts` (new)

**Interfaces:**
- Consumes: `WORDCRAFT_MODIFIERS`, `rollModifier` from `./modifiers`; `buildInitialState`, `wordCraftReducer` exports (already exported at line 350).
- Produces: `UseWordCraftGameOptions.modifierOverride?: WordCraftModifier`; `buildInitial` object arg gains `modifierOverride?`; RESET action gains `modifierOverride?`. Later tasks (Setup screen) pass this through.

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/lib/word-craft/__tests__/useWordCraftGame.modifierOverride.test.ts
import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../useWordCraftGame';

describe('modifierOverride', () => {
  it('forces the given modifier instead of rolling', () => {
    const s = buildInitialState({ seed: 42, locale: 'en', modifierOverride: 'land_grab' });
    expect(s.modifier).toBe('land_grab');
  });

  it('falls back to the seeded roll when omitted', () => {
    const a = buildInitialState({ seed: 42, locale: 'en' });
    const b = buildInitialState({ seed: 42, locale: 'en' });
    expect(a.modifier).toBe(b.modifier); // deterministic roll unchanged
  });

  it('ignores invalid override values', () => {
    // @ts-expect-error deliberately invalid runtime value
    const s = buildInitialState({ seed: 42, locale: 'en', modifierOverride: 'bogus' });
    const rolled = buildInitialState({ seed: 42, locale: 'en' });
    expect(s.modifier).toBe(rolled.modifier);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.modifierOverride.test.ts`
Expected: FAIL (modifierOverride not accepted / modifier !== 'land_grab').

- [ ] **Step 3: Implement**

In `useWordCraftGame.ts`:

```ts
// buildInitial object-arg type + body (modifier line becomes):
import { rollModifier, toScoreModifier, modifierCaptureSpread, WORDCRAFT_MODIFIERS, type WordCraftModifier } from './modifiers';

// in the init-arg type: modifierOverride?: WordCraftModifier
// in buildInitial body:
const modifierOverride = typeof init === 'number' ? undefined : init.modifierOverride;
// ... in the returned object:
modifier:
  modifierOverride && WORDCRAFT_MODIFIERS.includes(modifierOverride)
    ? modifierOverride
    : rollModifier(seed),
```

Thread the same optional field through: `Action` RESET variant, `UseWordCraftGameOptions`, the hook's destructured signature, the `initArg` useMemo, and the `reset` callback dispatch. `reset` keeps the game's current override (pass the option value, not state).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.modifierOverride.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Regression + lint**

Run: `cd fe-next && npx vitest run lib/word-craft && npm run lint -- lib/word-craft/useWordCraftGame.ts`
Expected: existing word-craft suites all green, lint 0.

---

### Task 2: Engine — auto-center first letter on select

**Files:**
- Modify: `fe-next/lib/word-craft/useWordCraftGame.ts` (state interface ~line 32, buildInitial return ~line 107, reducer `SELECT_RACK_TILE` case ~line 232, RESET)
- Test: `fe-next/lib/word-craft/__tests__/useWordCraftGame.autoCenter.test.ts` (new)

**Interfaces:**
- Consumes: `isFirstMove(board)` from `./board`, `PlacedTile` from `./types`.
- Produces: `WordCraftState.autoCenterDone: boolean`. Reducer behavior: first `SELECT_RACK_TILE` of a fresh game also places that tile pending at the center cell.

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/lib/word-craft/__tests__/useWordCraftGame.autoCenter.test.ts
import { describe, expect, it } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';

function fresh() {
  return buildInitialState({ seed: 7, locale: 'en' });
}

describe('auto-center first letter', () => {
  it('placing-selects the first tile at the center cell on move 1', () => {
    const s0 = fresh();
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: tile.id });
    const center = Math.floor(s1.board.size / 2);
    expect(s1.pendingPlacements).toHaveLength(1);
    expect(s1.pendingPlacements[0]).toMatchObject({ row: center, col: center, rackTileId: tile.id });
    expect(s1.selectedRackTileId).toBeNull(); // behaves like a placement
    expect(s1.autoCenterDone).toBe(true);
  });

  it('does NOT auto-place again after recall (no fight-the-player loop)', () => {
    const s0 = fresh();
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: tile.id });
    const s2 = wordCraftReducer(s1, { type: 'RECALL_PENDING', rackTileId: tile.id });
    const s3 = wordCraftReducer(s2, { type: 'SELECT_RACK_TILE', id: tile.id });
    expect(s3.pendingPlacements).toHaveLength(0);
    expect(s3.selectedRackTileId).toBe(tile.id); // plain selection
  });

  it('does not fire when pendings already exist or on deselect', () => {
    const s0 = fresh();
    const t0 = s0.player.rack[0];
    const t1 = s0.player.rack[1];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: t0.id }); // auto-centers t0
    const s2 = wordCraftReducer(s1, { type: 'SELECT_RACK_TILE', id: t1.id }); // pending exists → plain select
    expect(s2.pendingPlacements).toHaveLength(1);
    expect(s2.selectedRackTileId).toBe(t1.id);
    const s3 = wordCraftReducer(s2, { type: 'SELECT_RACK_TILE', id: null });
    expect(s3.selectedRackTileId).toBeNull();
  });

  it('does not fire after the first committed move (isFirstMove false)', () => {
    // Build a state whose board already has a tile: simulate via a manual cell stamp.
    const s0 = fresh();
    s0.board.cells[3][3].tile = { row: 3, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: 'x' };
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer({ ...s0, autoCenterDone: false }, { type: 'SELECT_RACK_TILE', id: tile.id });
    expect(s1.pendingPlacements).toHaveLength(0);
    expect(s1.selectedRackTileId).toBe(tile.id);
  });

  it('resets the flag on RESET', () => {
    const s0 = fresh();
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: s0.player.rack[0].id });
    const s2 = wordCraftReducer(s1, { type: 'RESET', seed: 9, boardSize: 15, locale: 'en' });
    expect(s2.autoCenterDone).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.autoCenter.test.ts`
Expected: FAIL (`autoCenterDone` undefined; no pending placement).

- [ ] **Step 3: Implement**

In `WordCraftState` add `autoCenterDone: boolean;` (doc: “first tap-select of the game auto-places at center — once”). `buildInitial` returns `autoCenterDone: false`. Reducer:

```ts
case 'SELECT_RACK_TILE': {
  // Opening nudge: the game's very first tile-select drops the tile onto the
  // center cell as a normal (recallable) pending placement, killing the
  // "where do I even start?" blank-board decision. Strictly once per game —
  // a recall hands full control back (no auto-replace tug-of-war).
  if (action.id && !state.autoCenterDone && state.pendingPlacements.length === 0 && isFirstMove(state.board)) {
    const activeRack = state.turn === 'bot' ? state.bot.rack : state.player.rack;
    const tile = activeRack.find((t) => t.id === action.id);
    const center = Math.floor(state.board.size / 2);
    if (tile && !state.board.cells[center][center].tile) {
      const placement: PlacedTile = {
        row: center, col: center,
        letter: tile.letter, value: tile.value, isBlank: tile.isBlank, rackTileId: tile.id,
      };
      return {
        ...state,
        pendingPlacements: [placement],
        selectedRackTileId: null,
        lastError: null,
        autoCenterDone: true,
      };
    }
  }
  return { ...state, selectedRackTileId: action.id, lastError: null };
}
```

RESET path: `buildInitial` already returns `autoCenterDone: false` — nothing extra.

- [ ] **Step 4: Run tests**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/useWordCraftGame.autoCenter.test.ts lib/word-craft`
Expected: new suite PASS; all existing word-craft engine suites PASS. If an existing test asserts plain-select behavior on a fresh board, examine it: the new behavior is intended — update that test ONLY if it explicitly tests “select does not place” on a fresh game (document in the test why).

- [ ] **Step 5: Lint**

Run: `cd fe-next && npm run lint`
Expected: 0 errors.

**Commit point (ask user):** `feat(wordcraft): auto-center opening tile + modifier override option`

---

### Task 3: Engine — `quick_draw` modifier (5-tile rack)

**Files:**
- Modify: `fe-next/lib/word-craft/modifiers.ts`, `fe-next/lib/word-craft/useWordCraftGame.ts` (buildInitial draws, `commitMove` line 149, swap flow line 550), `fe-next/lib/word-craft/tileBag.ts` (swap guard line 95)
- Test: `fe-next/lib/word-craft/__tests__/modifiers.quickDraw.test.ts` (new)

**Interfaces:**
- Consumes: Task 1's `modifierOverride`.
- Produces: `WordCraftModifier` union gains `'quick_draw'`; `modifierRackSize(m: WordCraftModifier): number` (7 default, 5 for quick_draw); `WordCraftState.rackSize: number`; `swap(bag, returned, rackSize?)` third param (default `RACK_SIZE`).

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/lib/word-craft/__tests__/modifiers.quickDraw.test.ts
import { describe, expect, it } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';
import { modifierRackSize } from '../modifiers';

describe('quick_draw modifier', () => {
  it('modifierRackSize maps quick_draw→5, everything else→7', () => {
    expect(modifierRackSize('quick_draw')).toBe(5);
    expect(modifierRackSize('none')).toBe(7);
    expect(modifierRackSize('land_grab')).toBe(7);
  });

  it('deals 5-tile racks to both seats', () => {
    const s = buildInitialState({ seed: 3, locale: 'en', modifierOverride: 'quick_draw' });
    expect(s.rackSize).toBe(5);
    expect(s.player.rack).toHaveLength(5);
    expect(s.bot.rack).toHaveLength(5);
  });

  it('refills only up to 5 after a commit', () => {
    const s0 = buildInitialState({ seed: 3, locale: 'en', modifierOverride: 'quick_draw' });
    const tile = s0.player.rack[0];
    const center = Math.floor(s0.board.size / 2);
    const placements = [
      { row: center, col: center, letter: tile.letter, value: tile.value, isBlank: tile.isBlank, rackTileId: tile.id },
      { row: center, col: center + 1, letter: s0.player.rack[1].letter, value: s0.player.rack[1].value, isBlank: s0.player.rack[1].isBlank, rackTileId: s0.player.rack[1].id },
    ];
    const s1 = wordCraftReducer(s0, { type: 'COMMIT_PLAYER', placements, score: 4, words: ['XX'] });
    expect(s1.player.rack).toHaveLength(5);
  });

  it('default game still deals 7', () => {
    const s = buildInitialState({ seed: 3, locale: 'en', modifierOverride: 'none' });
    expect(s.rackSize).toBe(7);
    expect(s.player.rack).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/modifiers.quickDraw.test.ts`
Expected: FAIL (`quick_draw` not a valid modifier / `modifierRackSize` missing).

- [ ] **Step 3: Implement**

`modifiers.ts`:

```ts
export type WordCraftModifier =
  | 'none' | 'bingo_bonanza' | 'long_words' | 'rich_letters' | 'land_grab'
  | 'quick_draw' | 'golden_tiles';

export const WORDCRAFT_MODIFIERS: readonly WordCraftModifier[] = [
  'none', 'bingo_bonanza', 'long_words', 'rich_letters', 'land_grab', 'quick_draw', 'golden_tiles',
];

// WEIGHTED gains one entry each (golden_tiles wired in Task 4):
const WEIGHTED: readonly WordCraftModifier[] = [
  'none', 'none', 'none',
  'bingo_bonanza', 'long_words', 'rich_letters',
  'land_grab', 'land_grab',
  'quick_draw', 'golden_tiles',
];

/** quick_draw: lighter 5-tile rack = fewer choices, faster turns. */
export function modifierRackSize(modifier: WordCraftModifier): number {
  return modifier === 'quick_draw' ? 5 : 7;
}
```

(`toScoreModifier` gains `case 'quick_draw': case 'golden_tiles': return {};` — both are rule modifiers, not scoring.)

`useWordCraftGame.ts` — in `buildInitial`, roll the modifier BEFORE dealing racks:

```ts
const modifier =
  modifierOverride && WORDCRAFT_MODIFIERS.includes(modifierOverride)
    ? modifierOverride
    : rollModifier(seed);
const rackSize = modifierRackSize(modifier);
const playerRack = draw(bag, rackSize);
const botRack = draw(bag, rackSize);
// state gains: rackSize, modifier (moved up from the bottom of the object)
```

`commitMove` line 149: `const drawCount = Math.max(0, state.rackSize - remainingRack.length);`
`swap` call site (hook, ~line 553): `swapBag(state.bag, tilesToReturn, state.rackSize)`.
`tileBag.ts swap`: `export function swap(bag: TileBag, returned: RackTile[], rackSize: number = RACK_SIZE)` with guard `if (bag.tiles.length < rackSize) return null;`.

- [ ] **Step 4: Run tests**

Run: `cd fe-next && npx vitest run lib/word-craft`
Expected: new suite PASS, all existing PASS (no existing test constructs `swap` with a third arg).

---

### Task 4: Engine — `golden_tiles` modifier (ring-capture tiles)

**Files:**
- Modify: `fe-next/lib/word-craft/modifiers.ts` (add `isGoldenTile`), `fe-next/lib/word-craft/territory.ts` (resolveCaptures option), `fe-next/lib/word-craft/useWordCraftGame.ts` (state.seed, commitMove wiring, bot extraScore wiring)
- Test: `fe-next/lib/word-craft/__tests__/modifiers.goldenTiles.test.ts` (new)

**Interfaces:**
- Consumes: tile ids `t-<n>` from `tileBag.createBag`; `resolveCaptures` pass structure (territory.ts:43).
- Produces: `isGoldenTile(seed: number, tileId: string): boolean` (~1 in 6, deterministic); `ResolveCapturesOptions.ringCenters?: readonly Coord[]` (each center captures its orthogonal ring); `WordCraftState.seed: number`.

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/lib/word-craft/__tests__/modifiers.goldenTiles.test.ts
import { describe, expect, it } from 'vitest';
import { isGoldenTile } from '../modifiers';
import { resolveCaptures } from '../territory';
import { createBoard } from '../board';
import type { PlacedTile } from '../types';

describe('isGoldenTile', () => {
  it('is deterministic for the same seed+id', () => {
    expect(isGoldenTile(42, 't-10')).toBe(isGoldenTile(42, 't-10'));
  });
  it('marks roughly 1 in 6 tiles golden (10–25% over 600 ids)', () => {
    let golden = 0;
    for (let i = 0; i < 600; i++) if (isGoldenTile(42, `t-${i}`)) golden++;
    expect(golden).toBeGreaterThan(60);
    expect(golden).toBeLessThan(150);
  });
});

describe('resolveCaptures ringCenters', () => {
  it('captures opponent cells around a ring center even when no word crosses them', () => {
    const board = createBoard(15, { premiums: false });
    // bot-owned tile at (7,6), orthogonally adjacent to the golden placement (7,7)
    const stamp = (r: number, c: number) => {
      board.cells[r][c].tile = { row: r, col: c, letter: 'B', value: 3, isBlank: false, rackTileId: `b-${r}-${c}` };
      board.cells[r][c].claim = 'bot';
    };
    stamp(7, 6);
    const placements: PlacedTile[] = [
      { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 't-1' },
      { row: 8, col: 7, letter: 'T', value: 1, isBlank: false, rackTileId: 't-2' },
    ];
    // word cells = just the placed cells (vertical word not crossing (7,6))
    const words = [[{ row: 7, col: 7 }, { row: 8, col: 7 }]];
    const without = resolveCaptures(board, placements, words, 'player', {});
    expect(without.capturedCells).toHaveLength(0);
    const withRing = resolveCaptures(board, placements, words, 'player', { ringCenters: [{ row: 7, col: 7 }] });
    expect(withRing.capturedCells).toEqual([{ row: 7, col: 6 }]);
    expect(withRing.bonus).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/modifiers.goldenTiles.test.ts`
Expected: FAIL (`isGoldenTile` not exported; ringCenters ignored).

- [ ] **Step 3: Implement**

`modifiers.ts` (reuse the file-local `hashSeed`):

```ts
/**
 * golden_tiles: a deterministic ~1-in-6 of tile ids are golden. Placing a
 * golden tile captures the opponent cells in its orthogonal ring (via
 * ResolveCapturesOptions.ringCenters). Pure function of (seed, tileId) so the
 * rack UI, board UI, and commit logic all agree with zero state plumbing.
 */
export function isGoldenTile(seed: number, tileId: string): boolean {
  let h = hashSeed(seed);
  for (let i = 0; i < tileId.length; i++) {
    h = Math.imul(h ^ tileId.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h % 6 === 0;
}
```

`territory.ts` — extend options + a pass between direct captures and land_grab spread:

```ts
export interface ResolveCapturesOptions {
  spreadToNeighbors?: boolean;
  /**
   * golden_tiles modifier: each listed coord (a golden tile placed this turn)
   * also captures the opponent cells orthogonally adjacent to it — same
   * one-ring, no-flood contract as spreadToNeighbors.
   */
  ringCenters?: readonly Coord[];
}

// in resolveCaptures, after Pass 1 (before the land_grab pass):
if (options.ringCenters) {
  for (const cell of options.ringCenters) {
    const ring: [number, number][] = [
      [cell.row - 1, cell.col], [cell.row + 1, cell.col],
      [cell.row, cell.col - 1], [cell.row, cell.col + 1],
    ];
    for (const [r, c] of ring) bonus += tryCapture(r, c);
  }
}
```

`useWordCraftGame.ts`:
- `WordCraftState` gains `seed: number;` set in `buildInitial` (and naturally on RESET via buildInitial).
- `commitMove` capture call gains ring centers:

```ts
const goldenCenters =
  state.modifier === 'golden_tiles'
    ? placements.filter((p) => isGoldenTile(state.seed, p.rackTileId)).map((p) => ({ row: p.row, col: p.col }))
    : undefined;
const capture = resolveCaptures(state.board, placements, lists, who, {
  spreadToNeighbors: modifierCaptureSpread(state.modifier),
  ringCenters: goldenCenters,
});
```

- Bot ranking `extraScore` (hook, ~line 588): same `ringCenters` computation from candidate `placements` so the bot values golden plays symmetrically.

- [ ] **Step 4: Run tests**

Run: `cd fe-next && npx vitest run lib/word-craft`
Expected: all PASS.

- [ ] **Step 5: Golden visuals (rack + board)**

Modify `fe-next/components/word-craft/WordCraftRack.tsx` and `WordCraftBoard.tsx`: both accept `isGolden?: (tileId: string) => boolean` (default undefined = never golden). Rack tile: when `isGolden?.(tile.id)`, add `data-golden` and classes `ring-2 ring-neo-yellow` plus a small `✦` badge span (`aria-hidden`, `absolute top-0.5 start-0.5 text-neo-yellow text-[10px]`). Board cell: when a pending/placed tile id is golden, add `data-golden` + `ring-2 ring-neo-yellow`. Yellow is the celebration/gold semantic — correct usage per design system.

Component test (add to the new test file):

```tsx
// fe-next/components/word-craft/__tests__/WordCraftRack.golden.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordCraftRack } from '../WordCraftRack';

it('marks golden tiles with data-golden', () => {
  const tiles = [
    { id: 't-1', letter: 'A', value: 1, isBlank: false },
    { id: 't-2', letter: 'B', value: 3, isBlank: false },
  ];
  const { container } = render(
    <WordCraftRack
      tiles={tiles} selectedId={null} pendingIds={new Set()} onSelect={vi.fn()}
      ariaLabel="rack" isGolden={(id) => id === 't-2'}
    />,
  );
  expect(container.querySelector('[data-rack-tile-id="t-2"][data-golden]')).toBeTruthy();
  expect(container.querySelector('[data-rack-tile-id="t-1"][data-golden]')).toBeNull();
});
```

Run: `cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftRack.golden.test.tsx`
Expected: PASS after implementation.

- [ ] **Step 6: i18n labels for both new modifiers**

In each of `translations/{en,he,sv,ja,es,ru}.js`, the `wordcraft.modifier` object (en.js line ~13311) gains two label entries + two `desc` entries. English:

```js
"quick_draw": "Quick Draw", "golden_tiles": "Golden Tiles",
// desc:
"quick_draw": "5-tile rack — faster turns", "golden_tiles": "Golden tiles capture their ring"
```

Write NATIVE copy for he/sv/ja/es/ru (use the fe-next:ux-writer skill if phrasing is unclear). Verify with `cd fe-next && node -e "['en','he','sv','ja','es','ru'].forEach(l => { const t = require('./translations/' + l + '.js').default; if (!t.wordcraft.modifier.quick_draw || !t.wordcraft.modifier.desc.golden_tiles) throw new Error(l); console.log('ok', l); })"`.

- [ ] **Step 7: Lint + full word-craft suites**

Run: `cd fe-next && npm run lint && npx vitest run lib/word-craft components/word-craft`
Expected: 0 lint errors, all suites green.

**Commit point (ask user):** `feat(wordcraft): quick_draw + golden_tiles felt modifiers`

---

### Task 5: Drag perf — O(1) drop resolution + imperative ghost

**Files:**
- Modify: `fe-next/components/word-craft/useWordCraftDrag.ts`, `fe-next/components/word-craft/WordCraftDragGhost.tsx`, `fe-next/app/[locale]/word-craft/PageClient.tsx` (drag wiring ~line 270, ghost ~line 1196, board `dragHoverCell` prop ~line 1032)
- Test: `fe-next/components/word-craft/__tests__/useWordCraftDrag.resolve.test.ts` (new); keep `useWordCraftDrag.taptap.test.ts` green.

**Interfaces:**
- Consumes: `[data-wc-board]` + `data-board-size` attributes (WordCraftBoard.tsx:92), cell keys `r,c`, board `p-1.5` padding + `gap: 2` + `border-neo-thick` (3px).
- Produces:
  - `resolveDropCellFast(clientX: number, clientY: number, boardEl: HTMLElement, emptyCells: ReadonlySet<string>): string | null` — exported pure helper returning a cell key or null (direct hit on empty cell, else nearest-empty-center within `SNAP_RADIUS_PX`).
  - `useWordCraftDrag({ onDrop, getEmptyCells })` — new required arg `getEmptyCells: () => ReadonlySet<string>`.
  - Hook return gains `ghostRef: (el: HTMLDivElement | null) => void`; `DragState` loses live `x`/`y` churn (kept only as the START position for initial ghost paint).

- [ ] **Step 1: Write the failing test**

```ts
// fe-next/components/word-craft/__tests__/useWordCraftDrag.resolve.test.ts
import { describe, expect, it } from 'vitest';
import { resolveDropCellFast } from '../useWordCraftDrag';

/** Fake 15×15 board element: 300×300 content box at (0,0), 3px border+6px padding, 2px gaps. */
function fakeBoard(size = 15): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-wc-board', '');
  el.setAttribute('data-board-size', String(size));
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 318, height: 318, right: 318, bottom: 318, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return el;
}
// inner = 318 - 2*(3+6) = 300; pitch = (300 + 2) / 15 ≈ 20.133; cell ≈ 18.133

describe('resolveDropCellFast', () => {
  it('maps a point inside a cell to its key', () => {
    const empty = new Set(['0,0', '7,7']);
    // center of cell (7,7): origin 9 + 7*pitch + cell/2
    const pitch = (300 + 2) / 15;
    const cx = 9 + 7 * pitch + (pitch - 2) / 2;
    expect(resolveDropCellFast(cx, cx, fakeBoard(), empty)).toBe('7,7');
  });

  it('returns null for occupied cells beyond snap radius of any empty cell', () => {
    const empty = new Set(['0,0']);
    const pitch = (300 + 2) / 15;
    const cx = 9 + 7 * pitch + (pitch - 2) / 2; // dead center of occupied (7,7)
    expect(resolveDropCellFast(cx, cx, fakeBoard(), empty)).toBeNull();
  });

  it('snaps a gap/edge point to the nearest empty cell within radius', () => {
    const empty = new Set(['7,7']);
    const pitch = (300 + 2) / 15;
    const gapX = 9 + 8 * pitch - 1; // in the gap right of (7,7)'s column… nearest center is (7,7) col
    const cy = 9 + 7 * pitch + (pitch - 2) / 2;
    expect(resolveDropCellFast(gapX, cy, fakeBoard(), empty)).toBe('7,7');
  });

  it('returns null outside the board beyond snap radius', () => {
    expect(resolveDropCellFast(1000, 1000, fakeBoard(), new Set(['7,7']))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/word-craft/__tests__/useWordCraftDrag.resolve.test.ts`
Expected: FAIL (`resolveDropCellFast` not exported).

- [ ] **Step 3: Implement `resolveDropCellFast`**

In `useWordCraftDrag.ts` (replaces `resolveDropCell`):

```ts
/** Chrome (border+padding) measured once per drag via getComputedStyle; scaled
 *  by the live rect so ZoomShell pinch scale is respected. */
function boardChrome(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  return parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
}

export function resolveDropCellFast(
  clientX: number,
  clientY: number,
  boardEl: HTMLElement,
  emptyCells: ReadonlySet<string>,
): string | null {
  const size = Number(boardEl.dataset.boardSize) || 15;
  const rect = boardEl.getBoundingClientRect(); // ONE layout read — post-transform
  const scale = rect.width / boardEl.offsetWidth || 1;
  const chrome = boardChrome(boardEl) * scale;
  const gap = 2 * scale;
  const originX = rect.left + chrome;
  const originY = rect.top + chrome;
  const inner = rect.width - 2 * chrome;
  const pitch = (inner + gap) / size;
  const cellSpan = pitch - gap;

  const cellCenter = (r: number, c: number): [number, number] => [
    originX + c * pitch + cellSpan / 2,
    originY + r * pitch + cellSpan / 2,
  ];

  const col = Math.floor((clientX - originX) / pitch);
  const row = Math.floor((clientY - originY) / pitch);
  const key = `${row},${col}`;
  if (row >= 0 && row < size && col >= 0 && col < size && emptyCells.has(key)) {
    return key;
  }
  // Snap: check the 3×3 neighborhood of the computed cell for the nearest
  // empty center within SNAP_RADIUS_PX (scaled). Bounded 9 checks, no DOM.
  let best: string | null = null;
  let bestDist = SNAP_RADIUS_PX * scale;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const k = `${r},${c}`;
      if (!emptyCells.has(k)) continue;
      const [cx, cy] = cellCenter(r, c);
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (d < bestDist) { bestDist = d; best = k; }
    }
  }
  return best;
}
```

- [ ] **Step 4: Run resolve test**

Run: `cd fe-next && npx vitest run components/word-craft/__tests__/useWordCraftDrag.resolve.test.ts`
Expected: PASS. (If the gap-snap expectation misses due to rounding, fix the TEST arithmetic, not by widening the radius.)

- [ ] **Step 5: Rewire the hook — no React state on pointermove**

In `useWordCraftDrag.ts`:
- Args: `export function useWordCraftDrag({ onDrop, getEmptyCells }: UseWordCraftDragArgs)` with `getEmptyCells: () => ReadonlySet<string>`.
- Add refs: `const ghostElRef = useRef<HTMLDivElement | null>(null);` `const boardElRef = useRef<HTMLElement | null>(null);` `const rafRef = useRef(0);` `const posRef = useRef({ x: 0, y: 0 });`
- `begin()` additionally caches `boardElRef.current = document.querySelector('[data-wc-board]')`.
- `move` handler becomes: update `posRef`, schedule ONE rAF that (a) writes `ghostElRef.current.style.transform = \`translate3d(${x}px, ${y}px, 0)\`` directly, (b) computes `hoverCell = boardElRef.current ? resolveDropCellFast(x, y, boardElRef.current, getEmptyCells()) : null`, and (c) calls `setDrag` ONLY when `active` flips or `hoverCell` differs from `lastHoverRef.current` (same activation math as today, verbatim). Keep the `vibrate(8)` on hover-cell change and the horizontal-swipe flag logic unchanged.
- `finish` uses `resolveDropCellFast(e.clientX, e.clientY, boardElRef.current, getEmptyCells())` and cancels the pending rAF.
- Return `{ drag, begin, consumeDropFlag, ghostRef }` where `ghostRef` is a stable callback ref `(el) => { ghostElRef.current = el; }`.

`WordCraftDragGhost.tsx`: accept `ghostRef` prop and attach it to the positioned wrapper; the wrapper renders at `translate3d(x0, y0, 0)` from `drag.x/y` (start position) and subsequent motion comes from the imperative transform. Remove any per-render position math.

`PageClient.tsx` wiring:

```ts
const emptyCellsRef = useRef<ReadonlySet<string>>(new Set());
useEffect(() => {
  const s = new Set<string>();
  const { board } = game.state;
  const pendingKeys = new Set(game.state.pendingPlacements.map((p) => `${p.row},${p.col}`));
  for (let r = 0; r < board.size; r++)
    for (let c = 0; c < board.size; c++)
      if (!board.cells[r][c].tile && !pendingKeys.has(`${r},${c}`)) s.add(`${r},${c}`);
  emptyCellsRef.current = s;
}, [game.state.board, game.state.pendingPlacements]);

const { drag, begin: beginTileDrag, consumeDropFlag, ghostRef } = useWordCraftDrag({
  onDrop: /* unchanged */,
  getEmptyCells: () => emptyCellsRef.current,
});
```

Pass `ghostRef` to `<WordCraftDragGhost drag={drag} ghostRef={ghostRef} locale={locale} />`.

- [ ] **Step 6: Update taptap test + run both drag suites**

`useWordCraftDrag.taptap.test.ts` calls the hook — add the new `getEmptyCells: () => new Set(['7,7'])`-style arg to its harness and a fake `[data-wc-board]` element in DOM setup (use the `fakeBoard()` helper pattern from Step 1; export it from the new test file or duplicate — duplication is fine in tests).

Run: `cd fe-next && npx vitest run components/word-craft/__tests__/useWordCraftDrag.taptap.test.ts components/word-craft/__tests__/useWordCraftDrag.resolve.test.ts`
Expected: PASS.

- [ ] **Step 7: Render-storm regression test**

Add to the resolve test file:

```ts
it('does not setState per pointermove — ≤3 renders for a 60-move storm crossing one cell', async () => {
  // Render a probe component using the hook; count renders; dispatch 60
  // pointermove events along a line inside cell (7,7). Expect renders:
  // 1 initial + 1 activation + 1 hoverCell change (±1 tolerance).
});
```

Implement with `@testing-library/react` `renderHook` + a render counter, jsdom `window.dispatchEvent(new PointerEvent('pointermove', {...}))`, and a `requestAnimationFrame` mock that runs callbacks synchronously (`vi.stubGlobal('requestAnimationFrame', (cb) => { cb(0); return 0; })`). Assert `renderCount <= 4`.

Run: `cd fe-next && npx vitest run components/word-craft/__tests__/useWordCraftDrag.resolve.test.ts`
Expected: PASS.

- [ ] **Step 8: Lint + full component suite**

Run: `cd fe-next && npm run lint && npx vitest run components/word-craft`
Expected: green.

**Commit point (ask user):** `perf(wordcraft): O(1) drop resolution + imperative drag ghost (1 layout read/move, ~0 re-renders)`

---

### Task 6: `WordCraftSetup` screen component

**Files:**
- Create: `fe-next/components/word-craft/WordCraftSetup.tsx` (~250 lines)
- Create: `fe-next/lib/word-craft/setupPrefs.ts` (~60 lines)
- Test: `fe-next/components/word-craft/__tests__/WordCraftSetup.test.tsx`, `fe-next/lib/word-craft/__tests__/setupPrefs.test.ts`

**Interfaces:**
- Consumes: `BotDifficulty`, `BOT_DIFFICULTIES`; `WordCraftModifier`, `WORDCRAFT_MODIFIERS`, `modifierLabelKey`.
- Produces:

```ts
// setupPrefs.ts
export interface WordCraftSetupChoice {
  opponent: 'bot' | 'hotseat';
  difficulty: BotDifficulty;
  modifier: WordCraftModifier | 'surprise';
}
export const DEFAULT_SETUP: WordCraftSetupChoice = { opponent: 'bot', difficulty: 'easy', modifier: 'surprise' };
export function loadSetupPrefs(): WordCraftSetupChoice;   // localStorage 'wordcraft.setup.v1', DEFAULT_SETUP on missing/corrupt
export function saveSetupPrefs(c: WordCraftSetupChoice): void;

// WordCraftSetup.tsx
export interface WordCraftSetupProps {
  initial: WordCraftSetupChoice;
  onStart: (choice: WordCraftSetupChoice) => void;
  t: (key: string, vars?: Record<string, unknown>) => string;
}
export function WordCraftSetup(props: WordCraftSetupProps): JSX.Element;
```

- [ ] **Step 1: Write failing tests**

```ts
// fe-next/lib/word-craft/__tests__/setupPrefs.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, loadSetupPrefs, saveSetupPrefs } from '../setupPrefs';

beforeEach(() => localStorage.clear());

describe('setupPrefs', () => {
  it('round-trips a choice', () => {
    saveSetupPrefs({ opponent: 'hotseat', difficulty: 'hard', modifier: 'land_grab' });
    expect(loadSetupPrefs()).toEqual({ opponent: 'hotseat', difficulty: 'hard', modifier: 'land_grab' });
  });
  it('returns defaults on missing or corrupt storage', () => {
    expect(loadSetupPrefs()).toEqual(DEFAULT_SETUP);
    localStorage.setItem('wordcraft.setup.v1', '{nope');
    expect(loadSetupPrefs()).toEqual(DEFAULT_SETUP);
  });
  it('sanitizes unknown enum values back to defaults', () => {
    localStorage.setItem('wordcraft.setup.v1', JSON.stringify({ opponent: 'alien', difficulty: 'insane', modifier: 'nope' }));
    expect(loadSetupPrefs()).toEqual(DEFAULT_SETUP);
  });
});
```

```tsx
// fe-next/components/word-craft/__tests__/WordCraftSetup.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordCraftSetup } from '../WordCraftSetup';
import { DEFAULT_SETUP } from '@/lib/word-craft/setupPrefs';

const t = (k: string) => k; // key-echo test translator

describe('WordCraftSetup', () => {
  it('renders opponent cards, difficulty control, twist picker, start CTA', () => {
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={vi.fn()} t={t} />);
    expect(screen.getByRole('radio', { name: /setup\.opponent\.bot/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /setup\.opponent\.hotseat/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /setup\.difficulty\.label/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /setup\.twist\.label/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /setup\.start/ })).toBeInTheDocument();
  });

  it('starts with the assembled choice', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={onStart} t={t} />);
    fireEvent.click(screen.getByRole('radio', { name: /difficulty\.hard/ }));
    fireEvent.click(screen.getByRole('radio', { name: /modifier\.land_grab/ }));
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith({ opponent: 'bot', difficulty: 'hard', modifier: 'land_grab' });
  });

  it('hides the difficulty control when hotseat is selected (no bot to tune)', () => {
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole('radio', { name: /setup\.opponent\.hotseat/ }));
    expect(screen.queryByRole('radiogroup', { name: /setup\.difficulty\.label/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/setupPrefs.test.ts components/word-craft/__tests__/WordCraftSetup.test.tsx`
Expected: FAIL (modules don't exist).

- [ ] **Step 3: Implement `setupPrefs.ts`**

```ts
import { BOT_DIFFICULTIES, type BotDifficulty } from './botDifficulty';
import { WORDCRAFT_MODIFIERS, type WordCraftModifier } from './modifiers';

const KEY = 'wordcraft.setup.v1';

export interface WordCraftSetupChoice {
  opponent: 'bot' | 'hotseat';
  difficulty: BotDifficulty;
  modifier: WordCraftModifier | 'surprise';
}

export const DEFAULT_SETUP: WordCraftSetupChoice = { opponent: 'bot', difficulty: 'easy', modifier: 'surprise' };

export function loadSetupPrefs(): WordCraftSetupChoice {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETUP;
    const p = JSON.parse(raw) as Partial<WordCraftSetupChoice>;
    return {
      opponent: p.opponent === 'hotseat' ? 'hotseat' : 'bot',
      difficulty: BOT_DIFFICULTIES.includes(p.difficulty as BotDifficulty) ? (p.difficulty as BotDifficulty) : DEFAULT_SETUP.difficulty,
      modifier:
        p.modifier === 'surprise' || WORDCRAFT_MODIFIERS.includes(p.modifier as WordCraftModifier)
          ? (p.modifier as WordCraftSetupChoice['modifier'])
          : 'surprise',
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

export function saveSetupPrefs(c: WordCraftSetupChoice): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ }
}
```

- [ ] **Step 4: Implement `WordCraftSetup.tsx`**

Layout (single screen, no scroll on phones, purple-family accents to match the mode):
- Title row: `t('wordcraft.setup.title')` in `font-neo-display font-black`.
- Opponent radiogroup (`role="radiogroup"` + two `role="radio"` big cards, `aria-checked`): Bot (`Bot` icon, `wordcraft.setup.opponent.bot` + one-liner `…bot.desc`), Pass & Play (`Users` icon, `…hotseat` + `…hotseat.desc`). Selected card: `bg-neo-purple text-white border-neo-thick shadow-hard-lg`; unselected: `bg-neo-navy-light`.
- When opponent = bot: difficulty radiogroup (`wordcraft.setup.difficulty.label`) of 3 pills reusing the existing labels `t('wordcraft.difficulty.easy'|'medium'|'hard')` (same keys `WordCraftDifficultySelect` uses — check that component and reuse its key names verbatim).
- Twist radiogroup (`wordcraft.setup.twist.label`): pill for `surprise` (`wordcraft.setup.twist.surprise`, `Sparkles` icon) + one pill per real modifier `WORDCRAFT_MODIFIERS.filter(m => m !== 'none')` labeled via existing `t(modifierLabelKey(m))` with `title`/second line from the existing `wordcraft.modifier.desc.<m>` keys.
- Footer: big lime START button (`wordcraft.setup.start`) calling `onStart(choice)`; under it a quiet hint row `wordcraft.setup.challengeHint` explaining beat-my-score links live on the results screen.
- Local `useState<WordCraftSetupChoice>(initial)`; pure component (no storage side effects — the page does that).

- [ ] **Step 5: Run tests**

Run: `cd fe-next && npx vitest run lib/word-craft/__tests__/setupPrefs.test.ts components/word-craft/__tests__/WordCraftSetup.test.tsx`
Expected: PASS.

- [ ] **Step 6: i18n keys ×6**

Add under `wordcraft.setup` in all six `translations/*.js` (native copy, not literal):

```js
"setup": {
  "title": "Set up your match",
  "opponent": { "bot": "Vs. Bot", "botDesc": "Play against WordBot", "hotseat": "Pass & Play", "hotseatDesc": "Two players, one device" },
  "difficulty": { "label": "Bot level" },
  "twist": { "label": "Twist", "surprise": "Surprise me" },
  "start": "Start game",
  "quickPlay": "Quick play (last settings)",
  "challengeHint": "Beat-a-friend links appear on your results screen"
}
```

(Reuse existing `wordcraft.difficulty.*` and `wordcraft.modifier.*` keys for the pills — do NOT duplicate them.)

- [ ] **Step 7: Lint**

Run: `cd fe-next && npm run lint`
Expected: 0 errors.

---

### Task 7: Wire setup phase into the page + declutter + split PageClient

**Files:**
- Modify: `fe-next/app/[locale]/word-craft/PageClient.tsx` (becomes ~150-line phase switcher)
- Create: `fe-next/components/word-craft/WordCraftGameScreen.tsx` (the extracted in-game tree, target ≤500 lines)
- Modify: `fe-next/components/word-craft/WordCraftScoreboard.tsx` (absorb modifier chip), `fe-next/components/word-craft/WordCraftGameOverScene.tsx` (mount share control)
- Test: `fe-next/components/word-craft/__tests__/WordCraftIntegration.test.tsx` (extend), `fe-next/components/word-craft/__tests__/WordCraftGameOverScene.test.tsx` (extend)

**Interfaces:**
- Consumes: Task 6's `WordCraftSetup`, `loadSetupPrefs`, `saveSetupPrefs`; Task 1's `modifierOverride`; existing `parseDuel`, `WordCraftPlayFriendControl`.
- Produces: `WordCraftGameScreen` props = everything the current in-game JSX consumes, computed in the game screen itself where possible (drag, juice, sounds, celebration state all MOVE INTO the new component; PageClient keeps only: locale/dict loading, duel/seed/setup resolution, phase state).

- [ ] **Step 1: Write the failing integration test additions**

Extend `WordCraftIntegration.test.tsx` (mock `next/navigation` as the file already does):

```tsx
it('shows the setup screen first on a plain visit, then the board after START', async () => {
  render(<WordCraftPageClient />);
  expect(await screen.findByRole('button', { name: /setup\.start|Start game/i })).toBeInTheDocument();
  expect(screen.queryByRole('grid', { name: /WordCraft board/i })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /setup\.start|Start game/i }));
  expect(await screen.findByRole('grid', { name: /WordCraft board/i })).toBeInTheDocument();
});

it('skips setup for duel links', async () => {
  // Existing duel-param test setup in this file shows how to fake window.location.search.
  // With ?duel=<payload> present, the board renders immediately, no setup screen.
});

it('skips setup for ?quick=1 and starts with persisted prefs', async () => {
  window.history.replaceState(null, '', '/word-craft?quick=1');
  localStorage.setItem('wordcraft.setup.v1', JSON.stringify({ opponent: 'bot', difficulty: 'hard', modifier: 'none' }));
  render(<WordCraftPageClient />);
  expect(await screen.findByRole('grid', { name: /WordCraft board/i })).toBeInTheDocument();
});

it('no longer renders difficulty select or friend button inside the game topbar', async () => {
  // start a game via START, then:
  expect(screen.queryByRole('button', { name: /duel\.playFriend/i })).toBeNull();
  expect(screen.queryByLabelText(/difficulty/i)).toBeNull();
});
```

Run: `cd fe-next && npx vitest run components/word-craft/__tests__/WordCraftIntegration.test.tsx`
Expected: new cases FAIL (no setup screen yet).

- [ ] **Step 2: Extract `WordCraftGameScreen.tsx`**

Mechanical move — cut everything from the current PageClient that is game-session-scoped into `components/word-craft/WordCraftGameScreen.tsx`:
- Props: `{ seed, locale, dict, hotseat, difficulty, modifierOverride, duel, challengerIdentity, onExit }` (`onExit` = router push home).
- Moves in: `useWordCraftGame` call, juice/sound/celebration hooks + state, drag hook + `emptyCellsRef` (Task 5), keyboard shortcuts, all in-game JSX from `<main>` down (scoreboard, board section, pending strip, rack, controls, toasts, handoff, blank picker, game-over scene, drag ghost).
- Stays in PageClient: `Header`, locale/dict loading, duel/seed parsing, nav hiding, setup phase state.
- Deletions while moving (the declutter): the topbar `WordCraftDifficultySelect`, the `Users` friend button + `friendPanelOpen` popover block (PageClient.tsx:895-935), their imports and state. Topbar keeps: back button, sr-only h1, `WordCraftTutor`.
- The removed imports (`WordCraftDifficultySelect`, `Users`) must go or lint fails.

- [ ] **Step 3: PageClient becomes the phase switcher**

```tsx
type Phase = { name: 'setup' } | { name: 'playing'; choice: WordCraftSetupChoice };

// inside WordCraftPageClient, after duel/seed/hotseatParam resolution:
const [phase, setPhase] = useState<Phase>(() => {
  if (typeof window === 'undefined') return { name: 'setup' };
  const params = new URLSearchParams(window.location.search);
  const prefs = loadSetupPrefs();
  if (duel) return { name: 'playing', choice: { ...prefs, opponent: 'bot' } }; // duel contract locks the rest
  if (params.get('vs') === 'human') return { name: 'playing', choice: { ...prefs, opponent: 'hotseat' } };
  if (params.get('quick') === '1') return { name: 'playing', choice: prefs };
  return { name: 'setup' };
});

const startGame = useCallback((choice: WordCraftSetupChoice) => {
  saveSetupPrefs(choice);
  trackWordCraftSetupStart(choice); // new telemetry fn, see Step 5
  setPhase({ name: 'playing', choice });
}, []);
```

Render: `phase.name === 'setup'` → `<WordCraftSetup initial={loadSetupPrefs()} onStart={startGame} t={t} />` (inside the same navy shell + Header); else `<WordCraftGameScreen …
  hotseat={phase.choice.opponent === 'hotseat'}
  difficulty={duel?.difficulty ?? phase.choice.difficulty}
  modifierOverride={phase.choice.modifier === 'surprise' ? undefined : phase.choice.modifier} …/>`.
`useWordCraftGame` inside the game screen receives `modifierOverride` (Task 1).
NOTE: duels must keep TODAY's modifier behavior (seeded roll from the shared seed) — never pass an override in a duel, or the two boards diverge.

- [ ] **Step 4: Fold modifier chip into scoreboard + share into game-over**

- `WordCraftScoreboard.tsx`: new optional prop `modifier?: { key: WordCraftModifier; label: string; desc: string }`; renders a compact `✦ {label}` pill (with `title={desc}`) at the strip's end when set and key ≠ 'none'. Game screen passes it; delete the standalone `<WordCraftModifierChip …/>` row (component file stays — `WordCraftModifierChip.tsx` may still be used by tests/gems; check `grep -rn "WordCraftModifierChip" --include="*.tsx" fe-next | grep -v __tests__` and delete the file too if the game screen was its only consumer).
- `WordCraftGameOverScene.tsx`: for the vs-bot (non-duel, non-hotseat) branch add a `WordCraftPlayFriendControl` block under the Play Again / Home buttons, receiving the same props the old topbar instance received (`seed`, `playerScore`, `locale`, `challengerName`, `challengerAvatar`, `dims`, `difficulty` — all already available as scene props except `playerScore`: pass the final `playerScore` prop it already has).

Test additions (`WordCraftGameOverScene.test.tsx`): vs-bot scene renders the challenge control (`getByText(/duel\.challengeFriend|challenge/i)`); hotseat scene does NOT.

- [ ] **Step 5: Telemetry**

In `wordCraftTelemetry.ts` add:

```ts
export function trackWordCraftSetupStart(choice: { opponent: string; difficulty: string; modifier: string }): void {
  capture('wordcraft_setup_start', choice); // follow the file's existing capture helper/pattern exactly
}
```

(Match the existing `trackWordCraft*` implementations in that file — same posthog import, same guard.)

- [ ] **Step 6: Run the full frontend word-craft suites**

Run: `cd fe-next && npx vitest run components/word-craft lib/word-craft app 2>&1 | tail -20`
Expected: all green, including the Step-1 integration cases.

- [ ] **Step 7: Line-count + lint check**

Run: `cd fe-next && wc -l app/\[locale\]/word-craft/PageClient.tsx components/word-craft/WordCraftGameScreen.tsx && npm run lint`
Expected: PageClient ≤ 300, GameScreen ≤ 500 (if GameScreen exceeds 500, extract its celebration/game-end effect block into `components/word-craft/hooks/useWordCraftGameEndEffects.ts` — mechanical, no behavior change), lint 0.

**Commit point (ask user):** `feat(wordcraft): pre-game setup screen + board-first declutter + PageClient split`

---

### Task 8: Full verification gate

**Files:** none new.

- [ ] **Step 1: Full test run**

Run: `cd fe-next && npm run test 2>&1 | tail -15`
Expected: 0 failures (pre-existing flake exception: blast/legacy mpGrid teardown OOM — rerun that shard once before treating as real).

- [ ] **Step 2: Lint + build**

Run: `cd fe-next && npm run lint && npm run build; echo "RC=$?"`
Expected: lint 0; build RC=0 (verify by the RC sentinel + fresh `.next/BUILD_ID` mtime, not by output prose).

- [ ] **Step 3: Live smoke (dev server)**

Run `npm run dev`, then drive `/en/word-craft`:
- Setup screen appears; pick Hard + Golden Tiles; START → board.
- First tile tap lands the tile on the center cell; tap it → returns to rack; next select does NOT auto-place.
- Drag a tile — ghost tracks the finger with no visible jank; drop into a gap still snaps.
- Golden tiles show the ✦ ring in the rack; committing one adjacent to a bot cell flips the ring.
- `?vs=human` skips setup into hotseat; `?quick=1` skips setup; a duel link skips setup.
- Game over (or `END_GAME` via passing twice) → challenge-a-friend control visible on the vs-bot results.
- Hebrew RTL pass: `/he/word-craft` setup + board render correctly.

- [ ] **Step 4: Update memory + ask user about commits**

Report results; ask the user to approve the per-phase commits (Tasks 2/4/5/7 messages above).

---

## Self-Review Notes

- Spec coverage: setup screen (T6+T7), declutter+split (T7), auto-center (T2), perf (T5), felt modifiers (T3+T4), modifier override plumbing (T1), telemetry (T7.5), i18n (T4.6, T6.6), game-over share relocation (T7.4). Rollout section needs no task (no flag/migration).
- Type consistency: `WordCraftSetupChoice` used by T6 and T7 verbatim; `getEmptyCells` signature identical in T5 steps; `ringCenters` name consistent between territory.ts and commitMove.
- Known judgment calls: duels never receive `modifierOverride` (board contract parity); `quick_draw`/`golden_tiles` join the surprise-roll WEIGHTED table immediately (both are symmetric + language-agnostic).
