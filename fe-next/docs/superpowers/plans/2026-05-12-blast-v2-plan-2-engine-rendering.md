# Blast v2 — Plan 2: Engine + Rendering (Streams C+B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Plan 1's `LevelSource` + types into a fully playable React board with selection state machine, validation pipeline, cascade detection, gravity collapse animation, and the `blast.v2`-flag-gated route. **This is the visual milestone — first plan where `/[locale]/blast` looks like the spec.** No DB writes, no Pixi FX, no tutorial cards, no PostHog yet.

**Architecture:** Pure-TS engine modules under `lib/blast/v2/engine/`. React components under `components/blast/v2/`. Engine is stateless reducer-style; React owns `useBlastV2` hook that wraps the reducer. Framer Motion `layout` prop drives gravity-collapse animation. SVG overlay layer paints the selection path. RTL handled via `dir="rtl"` on board root for HE locale — engine cell IDs unchanged.

**Tech Stack:** React 19, Next.js 16 App Router, Framer Motion (already a dep), `usePostHogFlag` (`@/hooks/usePostHogFlag`), `useLanguage().t()` (`@/contexts/LanguageContext`), `useReducedMotion` from framer-motion.

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — sections "Core Loop", "Visual Identity + Backgrounds" (DOM-only — Pixi spotlight is Plan 4), "Selection + Collapse Engine + Interestingness" (state machine + validation + cascade), "Locale Strategy" (HE RTL render), and "FX / Animation Catalog" (DOM/Framer items only).

**Out of scope:**
- DB tables / chest progress persistence → Plan 3
- Pixi atmosphere + burst FX layers → Plan 4
- FTUE overlay + per-mechanic unlock cards → Plan 5
- Curated packs beyond EN onboarding 3-level seed → Plan 6
- Translation key authoring (Plan 2 emits placeholder English strings inline that Plan 6 replaces with i18n calls) → Plan 6
- PostHog events / migration / rollout → Plan 7

**Integration corrections from spec (real signatures verified 2026-05-12):**
- Flag check: spec wrote `usePostHogFlag('blast.v2')` returning boolean. Real signature is `usePostHogFlag<T extends string | boolean = string>(flagKey: string, defaultValue: T): T`. Call as `usePostHogFlag<boolean>('blast.v2', false)`.
- Translations: spec assumes a `t('blast.foo')` helper. Real signature is `useLanguage().t(path, fallbackOrParams?, paramsWhenFallback?)` from `@/contexts/LanguageContext`. Plan 2 wraps strings in `t(...)` calls; Plan 6 adds the keys to `translations/<locale>.js`.
- `bonusDictionary` (lvl 25+) — Plan 2 wires per-locale via existing Practice dict loader path. Mechanic gate locked off ≤ lvl 24, so Plan 2 smoke test (onboarding lvl 1) does not exercise it; ship the wiring scaffolding but defer real bonus-dict prefetch to Plan 6.
- CellId parsing throughout the engine uses `String.match` (not regex `.exec`) for consistency and to avoid a stateful RegExp lastIndex hazard on shared regex instances.

---

## File Structure

| File | Purpose |
|---|---|
| `fe-next/lib/blast/v2/engine/cell-id.ts` | Tiny helpers `parseCell(id)`, `cellId(col, row)` shared across engine |
| `fe-next/lib/blast/v2/engine/selection-state.ts` | Selection state machine (pure reducer) |
| `fe-next/lib/blast/v2/engine/validation.ts` | 7-step validation pipeline returning ValidationResult |
| `fe-next/lib/blast/v2/engine/cascade.ts` | After-collapse cascade word detection |
| `fe-next/lib/blast/v2/engine/collapse.ts` | Gravity collapse + frozen thaw (pure data transform) |
| `fe-next/lib/blast/v2/engine/score.ts` | `scoreForWord` |
| `fe-next/lib/blast/v2/engine/index.ts` | Re-export facade |
| `fe-next/lib/blast/v2/useBlastV2.ts` | React hook wrapping engine state + handlers |
| `fe-next/lib/blast/v2/level-source-registry.ts` | App-boot factory returning `LevelSourceRegistry` |
| `fe-next/components/blast/v2/BlastTile.tsx` | Single tile + state visuals |
| `fe-next/components/blast/v2/BlastTile.module.css` | Tile styles |
| `fe-next/components/blast/v2/BlastSelectionPath.tsx` | SVG overlay drawing live selection path |
| `fe-next/components/blast/v2/BlastBoard.tsx` | Columns + tiles + Framer Motion gravity |
| `fe-next/components/blast/v2/BlastHud.tsx` | Top/bottom HUD: level, coins counter, shuffle, hint (chest preview = Plan 3 placeholder) |
| `fe-next/components/blast/v2/BlastLevelIntroCard.tsx` | "Level N · Theme · 3 words" 1.5s card |
| `fe-next/components/blast/v2/BlastLevelCompleteCard.tsx` | Stars + coins + next-level CTA |
| `fe-next/components/blast/v2/BlastGame.tsx` | Orchestrator: intro then board then complete |
| `fe-next/app/[locale]/blast/v2/BlastV2PageClient.tsx` | Entry: instantiates registry, reads first level, renders `BlastGame` |
| `fe-next/app/[locale]/blast/page.tsx` | Routes between legacy `PageClient` and `BlastV2PageClient` via flag |
| `fe-next/lib/experiments.ts` | Add `blast.v2` flag entry |
| `fe-next/components/blast/legacy/` | Move existing `components/blast/*.tsx` here in Task 14 (no code change) |

Tests under `__tests__/` next to each source file. Engine tests are pure-TS Vitest. React tests use `@testing-library/react` + Vitest (project pattern, see existing `components/practice/__tests__/`).

---

### Task 0: Shared CellId helpers

**Files:**
- Create: `fe-next/lib/blast/v2/engine/cell-id.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/cell-id.test.ts`

- [ ] Step 1: Failing test — `parseCell('c3r5')` returns `{col:3,row:5}`; `parseCell('bad')` throws; `cellId(2,4) === 'c2r4'`.
- [ ] Step 2: Run vitest, expect FAIL.
- [ ] Step 3: Implement:

```ts
import type { CellId } from '../types';

export const cellId = (col: number, row: number): CellId => `c${col}r${row}` as CellId;

export function parseCell(id: CellId): { col: number; row: number } {
  const m = id.match(/^c(\d+)r(\d+)$/);
  if (!m) throw new Error(`bad CellId: ${id}`);
  return { col: Number(m[1]), row: Number(m[2]) };
}
```

- [ ] Step 4: Run, expect PASS (3 tests).
- [ ] Step 5: Commit `feat(blast-v2): cell-id helpers (Plan 2 Task 0)`.

---

### Task 1: Selection state machine

**Files:**
- Create: `fe-next/lib/blast/v2/engine/selection-state.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/selection-state.test.ts`

**Engine types locked here:**

```ts
import type { CellId } from '../types';

export type SelectionState =
  | { kind: 'idle' }
  | { kind: 'active'; cells: CellId[]; axis: 'H' | 'V' | 'undecided'; mode: 'drag' | 'tap' };

export type SelectionEvent =
  | { type: 'pointerdown'; cell: CellId; mode: 'drag' }
  | { type: 'pointermove'; cell: CellId }
  | { type: 'pointerup' }
  | { type: 'tap'; cell: CellId }
  | { type: 'doubletap'; cell: CellId }
  | { type: 'cancel' };

export type SelectionTransition =
  | { state: SelectionState; submit?: false }
  | { state: SelectionState; submit: true; cells: CellId[]; axis: 'H' | 'V' };
```

- [ ] Step 1: Failing test covering 9 transitions: idle+pointerdown, axis-decision, non-collinear reject, drag-submit at len>=2, drag-cancel at len<2, idle+tap, tap+adjacent, doubletap-submit, cancel-from-anywhere.
- [ ] Step 2: Run vitest, expect FAIL.
- [ ] Step 3: Implement using `parseCell` from Task 0:

```ts
import type { CellId } from '../types';
import { parseCell } from './cell-id';

export type SelectionState =
  | { kind: 'idle' }
  | { kind: 'active'; cells: CellId[]; axis: 'H' | 'V' | 'undecided'; mode: 'drag' | 'tap' };

export type SelectionEvent =
  | { type: 'pointerdown'; cell: CellId; mode: 'drag' }
  | { type: 'pointermove'; cell: CellId }
  | { type: 'pointerup' }
  | { type: 'tap'; cell: CellId }
  | { type: 'doubletap'; cell: CellId }
  | { type: 'cancel' };

export type SelectionTransition =
  | { state: SelectionState; submit?: false }
  | { state: SelectionState; submit: true; cells: CellId[]; axis: 'H' | 'V' };

function detectAxis(last: CellId, cand: CellId): 'H' | 'V' | null {
  const a = parseCell(last); const b = parseCell(cand);
  if (a.col === b.col && Math.abs(a.row - b.row) === 1) return 'V';
  if (a.row === b.row && Math.abs(a.col - b.col) === 1) return 'H';
  return null;
}

function isStraightExtension(cells: CellId[], cand: CellId, axis: 'H' | 'V'): boolean {
  if (cells.length === 0) return true;
  const last = parseCell(cells[cells.length - 1]!);
  const c = parseCell(cand);
  if (axis === 'H') return c.row === last.row && Math.abs(c.col - last.col) === 1;
  return c.col === last.col && Math.abs(c.row - last.row) === 1;
}

export function reduceSelection(state: SelectionState, event: SelectionEvent): SelectionTransition {
  if (event.type === 'cancel') return { state: { kind: 'idle' } };

  if (state.kind === 'idle') {
    if (event.type === 'pointerdown') {
      return { state: { kind: 'active', cells: [event.cell], axis: 'undecided', mode: 'drag' } };
    }
    if (event.type === 'tap') {
      return { state: { kind: 'active', cells: [event.cell], axis: 'undecided', mode: 'tap' } };
    }
    return { state };
  }

  if (event.type === 'pointermove' || event.type === 'tap') {
    if (state.cells.includes(event.cell)) return { state };
    if (state.axis === 'undecided') {
      const ax = detectAxis(state.cells[state.cells.length - 1]!, event.cell);
      if (!ax) return { state };
      return { state: { ...state, cells: [...state.cells, event.cell], axis: ax } };
    }
    if (!isStraightExtension(state.cells, event.cell, state.axis)) return { state };
    return { state: { ...state, cells: [...state.cells, event.cell] } };
  }

  if (event.type === 'pointerup' && state.mode === 'drag') {
    if (state.cells.length >= 2 && state.axis !== 'undecided') {
      return { state: { kind: 'idle' }, submit: true, cells: state.cells, axis: state.axis };
    }
    return { state: { kind: 'idle' } };
  }

  if (event.type === 'doubletap' && state.mode === 'tap') {
    if (state.cells.length >= 2 && state.axis !== 'undecided') {
      return { state: { kind: 'idle' }, submit: true, cells: state.cells, axis: state.axis };
    }
    return { state: { kind: 'idle' } };
  }

  return { state };
}
```

- [ ] Step 4: Run, expect PASS (9 tests).
- [ ] Step 5: Commit `feat(blast-v2): selection state machine (Plan 2 Task 1)`.

---

### Task 2: Validation pipeline

**Files:**
- Create: `fe-next/lib/blast/v2/engine/validation.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/validation.test.ts`

`ValidationResult` lock:

```ts
export type ValidationResult =
  | { kind: 'theme_match'; word: string }
  | { kind: 'bonus'; word: string }
  | { kind: 'reject'; reason: 'length' | 'axis' | 'gap' | 'frozen' | 'duplicate' | 'unknown' };
```

- [ ] Step 1: Failing test — 9 cases:
  - cells.length<2 → reject('length')
  - cells on different axes → reject('axis')
  - cells with gap → reject('gap')
  - path crosses frozen tile → reject('frozen')
  - word already in foundWords → reject('duplicate')
  - cells form `'CAT'`, level has 'CAT' in words[], not yet found → theme_match
  - reversed of theme word → theme_match (reverse accepted per spec)
  - non-theme word IN bonus dict, mechanic on → bonus
  - non-theme + NOT in bonus dict → reject('unknown')
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import type { CellId, BlastLevel, TileFlag } from '../types';
import type { LocaleConfig } from '../locale-config';
import { parseCell } from './cell-id';

export type ValidationResult =
  | { kind: 'theme_match'; word: string }
  | { kind: 'bonus'; word: string }
  | { kind: 'reject'; reason: 'length' | 'axis' | 'gap' | 'frozen' | 'duplicate' | 'unknown' };

export type ValidationContext = {
  level: BlastLevel;
  config: LocaleConfig;
  foundWords: Set<string>;
  bonusDict: Set<string>;
  bonusDictEnabled: boolean;
};

function checkStraightContiguous(cells: CellId[]): { axis: 'H' | 'V' } | { reject: 'axis' | 'gap' } {
  const ps = cells.map(parseCell);
  const sameCol = ps.every((p) => p.col === ps[0]!.col);
  const sameRow = ps.every((p) => p.row === ps[0]!.row);
  if (!sameCol && !sameRow) return { reject: 'axis' };
  if (sameCol) {
    const rows = ps.map((p) => p.row).sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) if (rows[i]! - rows[i - 1]! !== 1) return { reject: 'gap' };
    return { axis: 'V' };
  }
  const cols = ps.map((p) => p.col).sort((a, b) => a - b);
  for (let i = 1; i < cols.length; i++) if (cols[i]! - cols[i - 1]! !== 1) return { reject: 'gap' };
  return { axis: 'H' };
}

function lettersAt(level: BlastLevel, cells: CellId[]): string[] {
  return cells.map((id) => {
    const { col, row } = parseCell(id);
    const colObj = level.columns.find((c) => c.index === col);
    return colObj?.tiles[row] ?? '';
  });
}

function hasFrozenTile(level: BlastLevel, cells: CellId[]): boolean {
  for (const id of cells) {
    const flags: TileFlag[] | undefined = level.tileFlags[id];
    if (flags?.includes('frozen')) return true;
  }
  return false;
}

export function validateSelection(cells: CellId[], ctx: ValidationContext): ValidationResult {
  if (cells.length < 2) return { kind: 'reject', reason: 'length' };
  const axisRes = checkStraightContiguous(cells);
  if ('reject' in axisRes) return { kind: 'reject', reason: axisRes.reject };
  if (hasFrozenTile(ctx.level, cells)) return { kind: 'reject', reason: 'frozen' };
  const letters = lettersAt(ctx.level, cells);
  const forward = ctx.config.normalize(letters.join(''));
  const reversed = ctx.config.normalize(letters.slice().reverse().join(''));
  const normWords = new Set(ctx.level.words.map(ctx.config.normalize));
  const normFound = new Set([...ctx.foundWords].map(ctx.config.normalize));
  for (const candidate of [forward, reversed]) {
    if (normFound.has(candidate)) return { kind: 'reject', reason: 'duplicate' };
    if (normWords.has(candidate)) {
      const original = ctx.level.words.find((w) => ctx.config.normalize(w) === candidate)!;
      return { kind: 'theme_match', word: original };
    }
  }
  if (ctx.bonusDictEnabled) {
    for (const candidate of [forward, reversed]) {
      if (ctx.bonusDict.has(candidate)) return { kind: 'bonus', word: candidate };
    }
  }
  return { kind: 'reject', reason: 'unknown' };
}
```

- [ ] Step 4: Run, expect PASS (9 tests).
- [ ] Step 5: Commit `feat(blast-v2): validation pipeline (Plan 2 Task 2)`.

---

### Task 3: Gravity collapse + frozen thaw + lateral slide

**Files:**
- Create: `fe-next/lib/blast/v2/engine/collapse.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/collapse.test.ts`

- [ ] Step 1: Failing test covering 5 cases:
  - Single H-row pop in middle row: tiles above each affected col shift down by 1
  - 3-tile V-word pop: column compacts, neighbor flags re-emit at new row indices
  - Frozen tile adjacent to pop set: frozen flag removed (thawed), other flags retained
  - Frozen tile NOT adjacent: frozen flag retained
  - `gravityMode: 'lateral-slide'`: 1-tile column with empty left neighbor → tile slides to left col, `slidCells` returned with `{from, to}`
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement (uses `parseCell` + `cellId` from Task 0):

```ts
import type { BlastLevel, BlastColumn, CellId, TileFlag } from '../types';
import { parseCell, cellId } from './cell-id';

export type CollapseResult = {
  level: BlastLevel;
  thawedCells: CellId[];
  slidCells: { from: CellId; to: CellId }[];
};

export function collapseCells(level: BlastLevel, popped: CellId[]): CollapseResult {
  const removed = new Set(popped);

  // Per-column: build new tile stack + capture flag remap (old row to new row).
  const flagRemapByCol = new Map<number, Map<number, number>>(); // col to (oldRow to newRow)
  const newCols: BlastColumn[] = [];
  for (const col of level.columns) {
    const newTiles: string[] = [];
    const rowMap = new Map<number, number>();
    for (let r = 0; r < col.tiles.length; r++) {
      const id = cellId(col.index, r);
      if (removed.has(id)) continue;
      rowMap.set(r, newTiles.length);
      newTiles.push(col.tiles[r]!);
    }
    flagRemapByCol.set(col.index, rowMap);
    newCols.push({ index: col.index, tiles: newTiles });
  }

  // Re-emit tile flags at new positions.
  const newTileFlags: Partial<Record<CellId, TileFlag[]>> = {};
  for (const [oldIdStr, flags] of Object.entries(level.tileFlags) as [CellId, TileFlag[]][]) {
    const { col, row } = parseCell(oldIdStr);
    if (removed.has(oldIdStr)) continue;
    const rowMap = flagRemapByCol.get(col);
    if (!rowMap) continue;
    const newRow = rowMap.get(row);
    if (newRow === undefined) continue;
    newTileFlags[cellId(col, newRow)] = flags;
  }

  // Frozen thaw: any frozen cell with a popped neighbor (orthogonal) loses 'frozen'.
  const thawed: CellId[] = [];
  for (const [id, flags] of Object.entries(newTileFlags) as [CellId, TileFlag[]][]) {
    if (!flags.includes('frozen')) continue;
    const { col, row } = parseCell(id);
    const neighbors: CellId[] = [
      cellId(col - 1, row), cellId(col + 1, row),
      cellId(col, row - 1), cellId(col, row + 1),
    ];
    if (neighbors.some((n) => removed.has(n))) {
      const filtered = flags.filter((f) => f !== 'frozen');
      if (filtered.length === 0) delete newTileFlags[id];
      else newTileFlags[id] = filtered;
      thawed.push(id);
    }
  }

  let resultLevel: BlastLevel = { ...level, columns: newCols, tileFlags: newTileFlags };
  const slid: { from: CellId; to: CellId }[] = [];

  if (level.gravityMode === 'lateral-slide') {
    for (const col of resultLevel.columns) {
      if (col.tiles.length !== 1) continue;
      const leftIdx = col.index - 1;
      const rightIdx = col.index + 1;
      const left = resultLevel.columns.find((c) => c.index === leftIdx);
      const right = resultLevel.columns.find((c) => c.index === rightIdx);
      const target = left && left.tiles.length === 0 ? left : right && right.tiles.length === 0 ? right : null;
      if (target) {
        const from = cellId(col.index, 0);
        const to = cellId(target.index, 0);
        target.tiles.push(col.tiles[0]!);
        col.tiles = [];
        slid.push({ from, to });
      }
    }
  }

  return { level: resultLevel, thawedCells: thawed, slidCells: slid };
}
```

- [ ] Step 4: Run, expect PASS (5 tests).
- [ ] Step 5: Commit `feat(blast-v2): gravity collapse + thaw + lateral slide (Plan 2 Task 3)`.

---

### Task 4: Cascade detection

**Files:**
- Create: `fe-next/lib/blast/v2/engine/cascade.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/cascade.test.ts`

- [ ] Step 1: Failing test — 3 cases: detect cascade in remaining words; return null when none; verify returned `cells` array.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import type { BlastLevel, CellId } from '../types';
import type { LocaleConfig } from '../locale-config';
import { cellId } from './cell-id';

export type Cascade = { word: string; cells: CellId[] };

export function detectCascade(level: BlastLevel, foundWords: Set<string>, config: LocaleConfig): Cascade | null {
  const norm = (s: string) => config.normalize(s);
  const remaining = level.words.filter((w) => !foundWords.has(w));
  if (remaining.length === 0) return null;
  const grid = new Map<CellId, string>();
  for (const col of level.columns) {
    for (let r = 0; r < col.tiles.length; r++) grid.set(cellId(col.index, r), col.tiles[r]!);
  }
  for (const word of remaining) {
    const normW = norm(word);
    for (const col of level.columns) {
      for (let r = 0; r < col.tiles.length; r++) {
        for (const dir of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
          const cells: CellId[] = [];
          let s = '';
          let ok = true;
          for (let i = 0; i < word.length; i++) {
            const cc = col.index + dir[0] * i;
            const cr = r + dir[1] * i;
            const id = cellId(cc, cr);
            const v = grid.get(id);
            if (!v) { ok = false; break; }
            s += v;
            cells.push(id);
          }
          if (ok && norm(s) === normW) return { word, cells };
        }
      }
    }
  }
  return null;
}
```

- [ ] Step 4: Run, expect PASS (3 tests).
- [ ] Step 5: Commit `feat(blast-v2): cascade detection (Plan 2 Task 4)`.

---

### Task 5: Score helpers

**Files:**
- Create: `fe-next/lib/blast/v2/engine/score.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/score.test.ts`

Score model:
- Theme word base: `wordLen * 10`
- Cascade word: `wordLen * 20` (2× per spec)
- Bonus dict word: flat `+10` coins
- `double_bonus` tile in path: `coinsBase *= 2` (theme + cascade only, not bonus)
- `coin` overlay in path: `+5` to `coinsFromOverlays`
- `gem` overlay in path: `+0.02` to `chestProgressDelta`

- [ ] Step 1: Failing test — 6 cases covering each rule.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import type { BlastLevel, CellId } from '../types';

export type ScoreOutcome = {
  coinsBase: number;
  coinsFromOverlays: number;
  chestProgressDelta: number;
  multiplier: 1 | 2;
};

export function scoreForWord(level: BlastLevel, cells: CellId[], kind: 'theme' | 'cascade' | 'bonus'): ScoreOutcome {
  const wordLen = cells.length;
  let coinsBase = kind === 'theme' ? wordLen * 10 : kind === 'cascade' ? wordLen * 20 : 10;
  let coinsFromOverlays = 0;
  let chestProgressDelta = 0;
  let multiplier: 1 | 2 = 1;
  for (const id of cells) {
    const flags = level.tileFlags[id] ?? [];
    if (flags.includes('coin')) coinsFromOverlays += 5;
    if (flags.includes('gem')) chestProgressDelta += 0.02;
    if (flags.includes('double_bonus')) multiplier = 2;
  }
  if (multiplier === 2 && kind !== 'bonus') coinsBase *= 2;
  return { coinsBase, coinsFromOverlays, chestProgressDelta, multiplier };
}
```

- [ ] Step 4: Run, expect PASS (6 tests).
- [ ] Step 5: Commit `feat(blast-v2): score helpers (Plan 2 Task 5)`.

---

### Task 6: Engine index facade

**Files:**
- Create: `fe-next/lib/blast/v2/engine/index.ts`

- [ ] Step 1: Implement (no test — re-export only):

```ts
export { reduceSelection } from './selection-state';
export type { SelectionState, SelectionEvent, SelectionTransition } from './selection-state';
export { validateSelection } from './validation';
export type { ValidationResult, ValidationContext } from './validation';
export { collapseCells } from './collapse';
export type { CollapseResult } from './collapse';
export { detectCascade } from './cascade';
export type { Cascade } from './cascade';
export { scoreForWord } from './score';
export type { ScoreOutcome } from './score';
export { parseCell, cellId } from './cell-id';
```

- [ ] Step 2: Commit `feat(blast-v2): engine index facade (Plan 2 Task 6)`.

---

### Task 7: Level source registry factory

**Files:**
- Create: `fe-next/lib/blast/v2/level-source-registry.ts`
- Test: `fe-next/lib/blast/v2/__tests__/level-source-registry.test.ts`

- [ ] Step 1: Failing test — `buildRegistry()` returns `{curated, generated}` both implementing `LevelSource`. `curated.resolve(1, 'en')` returns the seed onboarding level.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import { CuratedPackSource } from './curated-pack-source';
import { GeneratedLevelSource } from './generator';
import { LOCALE_CONFIGS } from './locale-config';
import type { LevelSourceRegistry } from './level-source';
import { resolve } from 'node:path';

let cached: LevelSourceRegistry | null = null;

export function buildRegistry(): LevelSourceRegistry {
  if (cached) return cached;
  const basePath = resolve(process.cwd(), 'content/blast/packs');
  cached = {
    curated: new CuratedPackSource(basePath),
    generated: new GeneratedLevelSource(LOCALE_CONFIGS),
  };
  return cached;
}
```

- [ ] Step 4: Run, expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): level source registry factory (Plan 2 Task 7)`.

---

### Task 8: useBlastV2 hook

**Files:**
- Create: `fe-next/lib/blast/v2/useBlastV2.ts`
- Test: `fe-next/lib/blast/v2/__tests__/useBlastV2.test.tsx`

- [ ] Step 1: Failing test — mount hook with seed `BlastLevel`, simulate drag selecting 'CAT', expect `state.foundWords` contains 'CAT' and `state.coins === 30`. Second test: reject selection → `invalidShakeKey` increments. Third: complete all words → `state.status === 'levelComplete'`.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import { useReducer, useMemo } from 'react';
import type { BlastLevel, CellId } from './types';
import { LOCALE_CONFIGS } from './locale-config';
import { reduceSelection, validateSelection, collapseCells, detectCascade, scoreForWord } from './engine';
import type { SelectionState, SelectionEvent, ValidationResult } from './engine';
import { mechanicsForLevel } from './mechanic-flags';

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
};

type Action =
  | { type: 'sel'; event: SelectionEvent }
  | { type: 'shuffle' };

function applyValidatedSubmit(state: State, cells: CellId[]): State {
  const config = LOCALE_CONFIGS[state.level.locale];
  const mechanics = mechanicsForLevel(state.level.levelNumber);
  const ctx = {
    level: state.level, config, foundWords: state.foundWords,
    bonusDict: new Set<string>(), // Plan 6 wires real loader
    bonusDictEnabled: mechanics.bonusDictionary,
  };
  const res = validateSelection(cells, ctx);
  if (res.kind === 'reject') {
    return { ...state, lastValidation: res, invalidShakeKey: state.invalidShakeKey + 1 };
  }
  const kind = res.kind === 'theme_match' ? 'theme' : 'bonus';
  const outcome = scoreForWord(state.level, cells, kind);
  const newFound = new Set(state.foundWords);
  newFound.add(res.word);
  let newLevel = state.level;
  let newChestProgress = state.chestProgress + outcome.chestProgressDelta;
  let newCascadeCount = state.cascadeCount;
  let newCoins = state.coins + outcome.coinsBase + outcome.coinsFromOverlays;
  if (kind === 'theme') {
    newLevel = collapseCells(state.level, cells).level;
    // Cascade loop.
    while (true) {
      const cascade = detectCascade(newLevel, newFound, config);
      if (!cascade) break;
      newFound.add(cascade.word);
      newCascadeCount += 1;
      const cOut = scoreForWord(newLevel, cascade.cells, 'cascade');
      newCoins += cOut.coinsBase + cOut.coinsFromOverlays;
      newChestProgress += cOut.chestProgressDelta;
      newLevel = collapseCells(newLevel, cascade.cells).level;
    }
  }
  const allFound = state.level.words.every((w) => newFound.has(w));
  return {
    ...state,
    level: newLevel,
    foundWords: newFound,
    coins: newCoins,
    chestProgress: Math.min(1, newChestProgress),
    cascadeCount: newCascadeCount,
    lastValidation: res,
    status: allFound ? 'levelComplete' : 'playing',
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === 'sel') {
    const t = reduceSelection(state.selection, action.event);
    if (t.submit) return applyValidatedSubmit({ ...state, selection: t.state }, t.cells);
    return { ...state, selection: t.state };
  }
  if (action.type === 'shuffle') {
    return { ...state, hintsUsed: state.hintsUsed + 1, coins: Math.max(0, state.coins - 50) };
  }
  return state;
}

export function useBlastV2(initialLevel: BlastLevel) {
  const initial: State = {
    level: initialLevel, selection: { kind: 'idle' }, foundWords: new Set(),
    coins: 0, chestProgress: 0, status: 'playing', hintsUsed: 0,
    cascadeCount: 0, invalidShakeKey: 0, lastValidation: null,
  };
  const [state, dispatch] = useReducer(reducer, initial);
  const handlers = useMemo(() => ({
    onPointerDown: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'pointerdown', cell, mode: 'drag' } }),
    onPointerMove: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'pointermove', cell } }),
    onPointerUp: () => dispatch({ type: 'sel', event: { type: 'pointerup' } }),
    onTap: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'tap', cell } }),
    onDoubleTap: (cell: CellId) => dispatch({ type: 'sel', event: { type: 'doubletap', cell } }),
    onCancel: () => dispatch({ type: 'sel', event: { type: 'cancel' } }),
    onShuffle: () => dispatch({ type: 'shuffle' }),
  }), []);
  return { state, handlers };
}
```

- [ ] Step 4: Run, expect PASS (3 tests).
- [ ] Step 5: Commit `feat(blast-v2): useBlastV2 hook (Plan 2 Task 8)`.

---

### Task 9: BlastTile component

**Files:**
- Create: `fe-next/components/blast/v2/BlastTile.tsx`
- Create: `fe-next/components/blast/v2/BlastTile.module.css`
- Test: `fe-next/components/blast/v2/__tests__/BlastTile.test.tsx`

- [ ] Step 1: Failing test — 5 cases: render `'A'` text; `state='selected'` adds `data-state="selected"`; `flags=['coin']` renders `[data-flag="coin"]`; `flags=['frozen']` adds `data-state-frozen`; `flags=['double_bonus']` adds `data-double-bonus`.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { motion } from 'framer-motion';
import type { CellId, TileFlag } from '@/lib/blast/v2/types';
import styles from './BlastTile.module.css';

export type BlastTileState = 'normal' | 'selected' | 'just-cleared';

type Props = {
  letter: string;
  cellId: CellId;
  flags: TileFlag[];
  state: BlastTileState;
  modeColor?: string;
  fontStack: string;
  paddingExtra?: number;
  displayChar?: string;
  onPointerDown?: () => void;
  onPointerEnter?: () => void;
  onPointerUp?: () => void;
};

export function BlastTile({
  letter, cellId, flags, state, modeColor = '#ec4899',
  fontStack, paddingExtra, displayChar, onPointerDown, onPointerEnter, onPointerUp,
}: Props) {
  const frozen = flags.includes('frozen');
  const hasCoin = flags.includes('coin');
  const hasGem = flags.includes('gem');
  const doubleBonus = flags.includes('double_bonus');
  return (
    <motion.div
      layout
      data-cell-id={cellId}
      data-state={state}
      data-state-frozen={frozen ? '' : undefined}
      data-double-bonus={doubleBonus ? '' : undefined}
      className={styles.tile}
      style={{
        fontFamily: fontStack,
        padding: 8 + (paddingExtra ?? 0),
        background: frozen ? '#bae6fd' : modeColor,
        opacity: frozen ? 0.6 : 1,
      }}
      whileTap={{ scale: 0.95 }}
      animate={state === 'selected' ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
      exit={state === 'just-cleared' ? { scale: 0, opacity: 0, rotate: 8 } : undefined}
      onPointerDown={(e) => { e.preventDefault(); onPointerDown?.(); }}
      onPointerEnter={() => onPointerEnter?.()}
      onPointerUp={() => onPointerUp?.()}
    >
      <span className={styles.letter}>{displayChar ?? letter}</span>
      {hasCoin && <span data-flag="coin" className={styles.coin} />}
      {hasGem && <span data-flag="gem" className={styles.gem} />}
    </motion.div>
  );
}
```

`BlastTile.module.css`:

```css
.tile {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 60px;
  min-height: 60px;
  border: 3px solid #0b1530;
  border-radius: 12px;
  box-shadow: 4px 4px 0 0 #0b1530;
  font-weight: 800;
  font-size: 24px;
  color: #0b1530;
  user-select: none;
  touch-action: none;
}
.tile[data-state="selected"] {
  box-shadow: 6px 6px 0 0 #0b1530;
  filter: brightness(1.15);
}
.tile[data-double-bonus] {
  animation: rainbow-pulse 1.6s linear infinite;
}
@keyframes rainbow-pulse {
  0%,100% { border-color: #ec4899; }
  33% { border-color: #06b6d4; }
  66% { border-color: #84cc16; }
}
.letter { line-height: 1; }
.coin, .gem {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #0b1530;
}
.coin { background: #fbbf24; }
.gem { background: #a855f7; animation: gem-pulse 2s ease-in-out infinite; }
@keyframes gem-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
```

- [ ] Step 4: Run, expect PASS (5 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastTile + state visuals (Plan 2 Task 9)`.

---

### Task 10: BlastSelectionPath SVG overlay

**Files:**
- Create: `fe-next/components/blast/v2/BlastSelectionPath.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastSelectionPath.test.tsx`

- [ ] Step 1: Failing test — 2 cases: 3 cells produce SVG `path` with M and L commands; empty cells returns null.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import type { CellId } from '@/lib/blast/v2/types';

type Props = {
  cells: CellId[];
  getCellCenter: (id: CellId) => { x: number; y: number } | null;
  color: string;
};

export function BlastSelectionPath({ cells, getCellCenter, color }: Props) {
  if (cells.length === 0) return null;
  const pts = cells.map((id) => getCellCenter(id)).filter((p): p is { x: number; y: number } => p != null);
  if (pts.length === 0) return null;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <svg className="pointer-events-none absolute inset-0" data-testid="blast-selection-path">
      <path d={d} stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
    </svg>
  );
}
```

- [ ] Step 4: Run, expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastSelectionPath SVG (Plan 2 Task 10)`.

---

### Task 11: BlastBoard with Framer Motion gravity

**Files:**
- Create: `fe-next/components/blast/v2/BlastBoard.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastBoard.test.tsx`

- [ ] Step 1: Failing test — 2 cases: render mounts all tiles with correct `data-cell-id`; HE locale sets `dir="rtl"` on root.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { useRef, useCallback } from 'react';
import { LayoutGroup, AnimatePresence } from 'framer-motion';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import type { SelectionState } from '@/lib/blast/v2/engine';
import { cellId as makeCellId } from '@/lib/blast/v2/engine';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { BlastTile, type BlastTileState } from './BlastTile';
import { BlastSelectionPath } from './BlastSelectionPath';

type Props = {
  level: BlastLevel;
  selection: SelectionState;
  invalidShakeKey: number;
  onPointerDown: (cell: CellId) => void;
  onPointerEnter: (cell: CellId) => void;
  onPointerUp: () => void;
  modeColor?: string;
};

export function BlastBoard({ level, selection, invalidShakeKey, onPointerDown, onPointerEnter, onPointerUp, modeColor = '#ec4899' }: Props) {
  const config = LOCALE_CONFIGS[level.locale];
  const boardRef = useRef<HTMLDivElement>(null);
  const selectedSet = selection.kind === 'active' ? new Set(selection.cells) : new Set<CellId>();

  const getCellCenter = useCallback((id: CellId) => {
    const board = boardRef.current;
    if (!board) return null;
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
  }, []);

  const tileState = (id: CellId): BlastTileState => selectedSet.has(id) ? 'selected' : 'normal';
  const dir = config.rtl ? 'rtl' : 'ltr';

  return (
    <div
      ref={boardRef}
      dir={dir}
      data-shake-key={invalidShakeKey}
      data-testid="blast-board"
      className="relative flex items-end justify-center gap-2 p-4"
      onPointerUp={onPointerUp}
    >
      <LayoutGroup>
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
                    onPointerEnter={() => selection.kind === 'active' && selection.mode === 'drag' && onPointerEnter(id)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </LayoutGroup>
      <BlastSelectionPath
        cells={selection.kind === 'active' ? selection.cells : []}
        getCellCenter={getCellCenter}
        color={modeColor}
      />
    </div>
  );
}
```

- [ ] Step 4: Run, expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastBoard with Framer gravity (Plan 2 Task 11)`.

---

### Task 12: BlastHud (counters + buttons)

**Files:**
- Create: `fe-next/components/blast/v2/BlastHud.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastHud.test.tsx`

- [ ] Step 1: Failing test — 4 cases: renders coin count; lvl 5 shows shuffle button; lvl 1 hides shuffle; lvl 18 shows hint button.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  levelNumber: number;
  coins: number;
  chestProgress: number;
  onShuffle: () => void;
  onHint: () => void;
};

export function BlastHud({ levelNumber, coins, chestProgress, onShuffle, onHint }: Props) {
  const { t } = useLanguage();
  const mech = mechanicsForLevel(levelNumber);
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-[#0b1530] text-white">
        <span data-testid="level-label">
          {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
        </span>
        <span data-testid="coin-counter">🪙 {coins}</span>
        <div data-testid="chest-pill" className="rounded-md border-2 border-white px-2 py-1 text-xs">
          {t('blast.chest.pill', 'Chest #1')} {Math.round(chestProgress * 100)}%
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 px-4 py-2">
        {mech.shuffleButton && (
          <button onClick={onShuffle} data-testid="shuffle-btn" className="px-3 py-2 border-2 border-[#0b1530] rounded-md bg-white">
            {t('blast.shuffle', 'Shuffle')}
          </button>
        )}
        {(mech.revealLetterHint || mech.revealWordHint) && (
          <button onClick={onHint} data-testid="hint-btn" className="px-3 py-2 border-2 border-[#0b1530] rounded-md bg-white">
            {t('blast.hint', 'Hint')}
          </button>
        )}
      </div>
    </>
  );
}
```

- [ ] Step 4: Run, expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastHud with mechanic-gated buttons (Plan 2 Task 12)`.

---

### Task 13: BlastGame orchestrator + intro/complete cards

**Files:**
- Create: `fe-next/components/blast/v2/BlastLevelIntroCard.tsx`
- Create: `fe-next/components/blast/v2/BlastLevelCompleteCard.tsx`
- Create: `fe-next/components/blast/v2/BlastGame.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastGame.test.tsx`

- [ ] Step 1: Failing test — render `<BlastGame level={onboarding-lvl-1} />` shows intro card; auto-advances after 1500ms (use fake timers); complete card appears once all words found via simulated drag events.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement (3 files):

`BlastLevelIntroCard.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastLevel } from '@/lib/blast/v2/types';

export function BlastLevelIntroCard({ level, onDismiss }: { level: BlastLevel; onDismiss: () => void }) {
  const { t } = useLanguage();
  useEffect(() => { const id = setTimeout(onDismiss, 1500); return () => clearTimeout(id); }, [onDismiss]);
  return (
    <div data-testid="intro-card" className="grid place-items-center min-h-screen bg-[#0b1530]/90 text-white">
      <div className="space-y-2 text-center">
        <div className="text-3xl font-bold">
          {t('blast.intro.level', `Level ${level.levelNumber}`, { n: String(level.levelNumber) })}
        </div>
        <div className="text-xl">{t(`blast.themes.${level.theme}`, level.theme)}</div>
        <div className="text-sm opacity-70">
          {t('blast.intro.wordCount', `${level.words.length} words`, { count: String(level.words.length) })}
        </div>
      </div>
    </div>
  );
}
```

`BlastLevelCompleteCard.tsx`:

```tsx
'use client';
import { useLanguage } from '@/contexts/LanguageContext';

export function BlastLevelCompleteCard({ coins, cascadeCount, onNext }: { coins: number; cascadeCount: number; onNext: () => void }) {
  const { t } = useLanguage();
  return (
    <div data-testid="complete-card" className="grid place-items-center min-h-screen bg-[#0b1530]/95 text-white">
      <div className="space-y-4 text-center">
        <div className="text-4xl font-bold">{t('blast.complete.title', 'Level Complete!')}</div>
        <div className="text-2xl">🪙 +{coins}</div>
        {cascadeCount > 0 && (
          <div className="text-lg">
            ⚡ {t('blast.complete.cascades', `${cascadeCount} cascades`, { n: String(cascadeCount) })}
          </div>
        )}
        <button onClick={onNext} className="px-6 py-3 bg-[#ec4899] border-4 border-white rounded-lg font-bold text-lg" data-testid="next-btn">
          {t('blast.complete.next', 'Next Level')}
        </button>
      </div>
    </div>
  );
}
```

`BlastGame.tsx`:

```tsx
'use client';
import { useState } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';

type Props = { level: BlastLevel; onAdvance: () => void };

export function BlastGame({ level, onAdvance }: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const { state, handlers } = useBlastV2(level);

  if (!introDismissed) {
    return <BlastLevelIntroCard level={level} onDismiss={() => setIntroDismissed(true)} />;
  }
  if (state.status === 'levelComplete') {
    return <BlastLevelCompleteCard coins={state.coins} cascadeCount={state.cascadeCount} onNext={onAdvance} />;
  }
  return (
    <div className="min-h-screen bg-[#0b1530] text-white">
      <BlastHud
        levelNumber={state.level.levelNumber}
        coins={state.coins}
        chestProgress={state.chestProgress}
        onShuffle={handlers.onShuffle}
        onHint={() => {/* Plan 5 wires hints */}}
      />
      <BlastBoard
        level={state.level}
        selection={state.selection}
        invalidShakeKey={state.invalidShakeKey}
        onPointerDown={handlers.onPointerDown}
        onPointerEnter={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
      />
    </div>
  );
}
```

- [ ] Step 4: Run, expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): BlastGame orchestrator + intro/complete (Plan 2 Task 13)`.

---

### Task 14: Move legacy code + flag-gated route

**Files moved/modified:**
- Move (git mv): `fe-next/components/blast/*.tsx` to `fe-next/components/blast/legacy/`
- Move: `fe-next/app/[locale]/blast/PageClient.tsx` to `fe-next/app/[locale]/blast/legacy/PageClient.tsx`
- Create: `fe-next/app/[locale]/blast/v2/BlastV2PageClient.tsx`
- Modify: `fe-next/app/[locale]/blast/page.tsx` (flag gate)
- Modify: `fe-next/lib/experiments.ts` (add `blast.v2`)
- Test: `fe-next/app/[locale]/blast/__tests__/page.test.tsx`

- [ ] Step 1: Run `git mv` for all blast component files into `legacy/`. Run `cd fe-next && npx tsc --noEmit` — expect many "Cannot find module" errors.
- [ ] Step 2: Grep + Edit to update all import paths referencing moved files. Re-run typecheck — expect zero errors. Commit `refactor(blast): move legacy components to legacy/ subdir (Plan 2 Task 14a)`.

- [ ] Step 3: Add `blast.v2` to `lib/experiments.ts`:

```ts
'blast.v2': {
  variants: ['off', 'on'] as const,
  default: 'off' as const,
  description: 'Blast v2 redesign rollout gate',
},
```

- [ ] Step 4: Create `BlastV2PageClient.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { BlastLevel, Locale } from '@/lib/blast/v2/types';
import { buildRegistry } from '@/lib/blast/v2/level-source-registry';
import { getLevelSource } from '@/lib/blast/v2/level-source';
import { BlastGame } from '@/components/blast/v2/BlastGame';

export function BlastV2PageClient({ locale }: { locale: Locale }) {
  const [level, setLevel] = useState<BlastLevel | null>(null);
  const [levelNumber, setLevelNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const registry = buildRegistry();
    const src = getLevelSource(levelNumber, registry);
    src.resolve(levelNumber, locale, 'guest')
      .then(setLevel)
      .catch((e: Error) => setError(e.message));
  }, [levelNumber, locale]);

  if (error) return <div className="p-8 text-red-400">Failed to load level: {error}</div>;
  if (!level) return <div className="p-8 text-white">Loading…</div>;
  return <BlastGame level={level} onAdvance={() => setLevelNumber((n) => n + 1)} />;
}
```

- [ ] Step 5: Modify `app/[locale]/blast/page.tsx`:

```tsx
'use client';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { LegacyPageClient } from './legacy/PageClient';
import { BlastV2PageClient } from './v2/BlastV2PageClient';
import { useParams } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';

export default function BlastPage() {
  const v2 = usePostHogFlag<boolean>('blast.v2', false);
  const params = useParams<{ locale: Locale }>();
  if (v2) return <BlastV2PageClient locale={params.locale} />;
  return <LegacyPageClient />;
}
```

- [ ] Step 6: Failing test — render with mocked flag on → BlastV2PageClient mounts (intro card appears). Flag off → legacy mounts.
- [ ] Step 7: Run, expect PASS (2 tests).
- [ ] Step 8: Commit `feat(blast-v2): flag-gated route + BlastV2PageClient (Plan 2 Task 14b)`.

---

### Task 15: Full Plan 2 verification + dev-server smoke

**Files:** None modified.

- [ ] Step 1: Run all engine + component unit tests: `cd fe-next && npx vitest run lib/blast/v2/ components/blast/v2/`. Expect ALL PASS.
- [ ] Step 2: Lint + typecheck: `cd fe-next && npm run lint && npx tsc --noEmit`. Expect zero errors.
- [ ] Step 3: Build: `cd fe-next && npm run build`. Expect success.
- [ ] Step 4: Dev-server smoke (manual, per project CLAUDE.md "test UI in browser"):
  - Start dev server (`npm run dev`, port 3001 per memory `dev-server-port`).
  - In PostHog dashboard or via localStorage override, force `blast.v2 = on` for your user.
  - Visit `http://localhost:3001/en/blast`. Expect intro card "Level 1 · ONBOARDING · 3 words" then 3-column board with letters C/S/E + A/U/G + T/N/G.
  - Drag-select C→A→T. Expect tile-burst exit anim, gravity collapse, then SUN selectable. Drag S→U→N. Then E→G→G. Level-complete card appears.
  - Repeat at `/he/blast`. Expect RTL board (column 0 visually right-most).
  - Check console for zero errors.
- [ ] Step 5: Visual fix loop — likely small CSS or RTL layout tweaks needed after first browser pass. Iterate. Commit any tweaks as `fix(blast-v2): ...`.
- [ ] Step 6: Tag commit `blast-v2-plan-2-complete`.

---

## Self-review checklist (Plan 2)

- [x] Every step has runnable code or command, no "TBD"
- [x] Engine types exported from `engine/index.ts` exactly match consumers in `useBlastV2` and components
- [x] Selection state machine + validation pipeline + cascade detection + gravity collapse are all pure (no React or DOM imports under `lib/blast/v2/engine/`)
- [x] HE RTL board behavior is via `dir="rtl"` on board root; engine cell IDs unchanged
- [x] Flag gate uses real `usePostHogFlag<boolean>` signature, not specced API
- [x] Translations via real `useLanguage().t()` from `@/contexts/LanguageContext`, with English placeholders inline that Plan 6 replaces with the actual translation keys
- [x] Legacy code preserved under `components/blast/legacy/` per project requirement — not deleted

## Deliverables to Plans 3-7

- **Plan 3** consumes: `BlastGame` exposes `onAdvance` callback; chest progress + coins state currently in-memory in `useBlastV2`. Plan 3 lifts these to DB via `/api/blast/clear-level` and a chest-state provider.
- **Plan 4** consumes: `BlastBoard` exposes `data-cell-id` + `data-state="just-cleared"` data attributes — Plan 4's Pixi overlay picks these as anchor points for shatter burst FX.
- **Plan 5** consumes: `BlastGame` checks `unlocks_seen` per-mechanic and shows tutorial cards before allowing input. Plan 2 ships without these cards — Plan 5 inserts them.
- **Plan 6** consumes: all inline English fallbacks in `t(...)` calls become actual translation keys in `translations/<locale>.js`. Plan 6 also expands theme word pools beyond Plan 1's seed sets.
- **Plan 7** consumes: `useBlastV2` reducer is a natural emit-point for `blast_word_found` / `blast_word_rejected` / `blast_level_completed` events.

## Risks tracked in this plan

| Risk | Mitigation |
|---|---|
| Framer Motion layout animation misfires across columns | LayoutGroup wraps full board; tested in dev-server smoke Task 15 |
| Pointer events conflict with native scroll on mobile | `touch-action: none` on `.tile` class; verify on real device in Task 15 |
| HE RTL flips selection-path SVG | SVG uses absolute pixel coordinates from `getBoundingClientRect` which already accounts for RTL — verify in Task 15 |
| Bonus dict not wired in Plan 2 | Mechanic gate off below lvl 25 ensures smoke test never hits this path. Plan 6 wires per-locale loaders. |
| Lateral-slide gravity edge cases | Test coverage in Task 3; further audit during Plan 6 generator quality pass |
| `dev-server` requires running on port 3001 (memory `dev-server-port`) | Documented in Task 15 step 4; do NOT poll 3000 |

---

**End Plan 2. Next milestone: `/[locale]/blast` renders the v2 board.**
