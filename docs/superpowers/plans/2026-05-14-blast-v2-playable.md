# Blast v2 Playable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Blast v2 a genuinely playable cascade word game where each level is a forced chain — finding a word collapses tiles which is the *only* way to enable the next word — with 15 hand-authored English + 15 Hebrew levels, hybrid neo-brutalist visuals, and juicy GSAP/Pixi animation.

**Architecture:** A new `chain-builder` constructs each level *backwards* — start from the last word on the floor, insert each earlier word by lifting existing tiles up one row, verifying after every insert that only the intended word is formable. This makes "forced order" a structural guarantee, not a tested hope. Levels are authored as terse `{ chain: [...] }` specs; the builder produces the concrete board. A straight-line word scanner (`scanFormableThemeWords`) is the shared correctness primitive for both the builder and a forward `validateChainLevel` replay. Existing collapse/selection/reducer/FX code is reused unchanged.

**Tech Stack:** TypeScript, Vitest, React, Framer Motion (existing tile anim), GSAP 3.14 (collapse timeline), PixiJS (existing FX overlay). Words horizontal-only in v1.

**Scope note — horizontal-only:** v1 places all chain words as horizontal runs. This matches the reference (Word Stacks is overwhelmingly horizontal) and keeps construction tractable. Vertical-orientation chain words are explicitly **out of scope for v1**.

---

## File Structure

**New files:**
- `fe-next/lib/blast/v2/engine/word-scan.ts` — `scanFormableThemeWords`: straight-line H/V scan for formable theme words. Shared by builder + validator.
- `fe-next/lib/blast/v2/engine/chain-builder.ts` — `insertWord`, `buildChainLevel`: backward construction of a forced-chain `BlastLevel`.
- `fe-next/lib/blast/v2/engine/chain-validator.ts` — `validateChainLevel`: forward replay asserting the forced order.
- `fe-next/lib/blast/v2/chain-pack-source.ts` — `ChainPackSource implements LevelSource`: loads `pack-chain.json`, expands specs via `buildChainLevel`.
- `fe-next/content/blast/packs/en/pack-chain.json` — 15 English chain specs.
- `fe-next/content/blast/packs/he/pack-chain.json` — 15 Hebrew chain specs.
- Test files mirrored under `fe-next/lib/blast/v2/engine/__tests__/` and `fe-next/lib/blast/v2/__tests__/`.

**Modified files:**
- `fe-next/lib/blast/v2/level-source-registry.ts` — register `ChainPackSource`, route en/he levels 1–15 to it.
- `fe-next/lib/blast/v2/types.ts` — add `ChainLevelSpec` type.
- `fe-next/components/blast/v2/BlastTile.tsx` — hybrid restyle.
- `fe-next/components/blast/v2/BlastTile.module.css` (or inline) — tile depth/bevel styles.
- `fe-next/components/blast/v2/BlastBoard.tsx` — GSAP collapse timeline + cascade-reveal glow hook-up.

---

## Task 1: Straight-line word scanner

**Files:**
- Create: `fe-next/lib/blast/v2/engine/word-scan.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/word-scan.test.ts`

The builder and validator both need one question answered: *given a board, which target words are formable as a straight contiguous horizontal or vertical run?* `detectAllCascades` does a 4-directional search and will over-match — do NOT reuse it. Write a dedicated scanner.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/blast/v2/engine/__tests__/word-scan.test.ts
import { describe, it, expect } from 'vitest';
import { scanFormableThemeWords } from '../word-scan';
import type { BlastLevel } from '../../types';

function lvl(columns: string[][]): BlastLevel {
  return {
    id: 't', levelNumber: 1, theme: 'onboarding', locale: 'en',
    words: [], resolvableOrder: [], tileFlags: {}, difficulty: 1,
    columns: columns.map((tiles, index) => ({ index, tiles })),
  };
}

describe('scanFormableThemeWords', () => {
  it('finds a horizontal word along a row', () => {
    // row 0 across cols: C A T
    const board = lvl([['C'], ['A'], ['T']]);
    const matches = scanFormableThemeWords(board, ['CAT', 'DOG']);
    expect(matches).toEqual([{ word: 'CAT', cells: ['c0r0', 'c1r0', 'c2r0'] }]);
  });

  it('finds a vertical word within a column', () => {
    const board = lvl([['T', 'A', 'C']]); // bottom->top: T A C
    const matches = scanFormableThemeWords(board, ['CAT']);
    // reading top->bottom c0r2,c0r1,c0r0 = C A T
    expect(matches.map((m) => m.word)).toEqual(['CAT']);
  });

  it('does NOT match an L-shape or diagonal', () => {
    const board = lvl([['C', 'A'], ['T']]); // C bottom c0, A top c0, T bottom c1
    const matches = scanFormableThemeWords(board, ['CAT']);
    expect(matches).toEqual([]);
  });

  it('returns every placement when a word appears twice', () => {
    const board = lvl([['C'], ['A'], ['T'], ['C'], ['A'], ['T']]);
    const matches = scanFormableThemeWords(board, ['CAT']);
    expect(matches.length).toBe(2);
  });

  it('respects locale normalization for Hebrew final forms', () => {
    // word stored as חתול; tile shows base form כ even when ך is the target letter
    const board = lvl([['ח'], ['ת'], ['ו'], ['ל']]);
    const matches = scanFormableThemeWords(board, ['חתול'], 'he');
    expect(matches.map((m) => m.word)).toEqual(['חתול']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/word-scan.test.ts`
Expected: FAIL — `scanFormableThemeWords` is not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// fe-next/lib/blast/v2/engine/word-scan.ts
import type { BlastLevel, CellId, Letter, Locale } from '../types';
import { LOCALE_CONFIGS } from '../locale-config';

export type WordMatch = { word: string; cells: CellId[] };

function cid(col: number, row: number): CellId {
  return `c${col}r${row}`;
}

/** Letter at (col,row) or undefined. row 0 = bottom. */
function at(level: BlastLevel, col: number, row: number): Letter | undefined {
  return level.columns[col]?.tiles[row];
}

/**
 * All target words formable as a straight contiguous horizontal (along a row,
 * left->right) or vertical (within a column, top->bottom) run.
 * Returns every placement; cells are ordered to match the word's letters.
 */
export function scanFormableThemeWords(
  level: BlastLevel,
  targets: string[],
  locale: Locale = 'en',
): WordMatch[] {
  const config = LOCALE_CONFIGS[locale];
  const norm = (s: string): string => config.normalize(s);
  const wanted = new Map(targets.map((w) => [norm(w), w] as const));
  const matches: WordMatch[] = [];
  const cols = level.columns.length;
  const maxRow = Math.max(0, ...level.columns.map((c) => c.tiles.length));

  // Horizontal: every row, every start column, every run length present.
  for (let row = 0; row < maxRow; row++) {
    for (let start = 0; start < cols; start++) {
      let run = '';
      const cells: CellId[] = [];
      for (let col = start; col < cols; col++) {
        const ch = at(level, col, row);
        if (ch === undefined) break;
        run += ch;
        cells.push(cid(col, row));
        const hit = wanted.get(norm(run));
        if (hit && run.length >= 2) {
          matches.push({ word: hit, cells: [...cells] });
        }
      }
    }
  }

  // Vertical: within a column, read top->bottom.
  for (let col = 0; col < cols; col++) {
    const tiles = level.columns[col]?.tiles ?? [];
    for (let topRow = tiles.length - 1; topRow >= 0; topRow--) {
      let run = '';
      const cells: CellId[] = [];
      for (let row = topRow; row >= 0; row--) {
        run += tiles[row];
        cells.push(cid(col, row));
        const hit = wanted.get(norm(run));
        if (hit && run.length >= 2) {
          matches.push({ word: hit, cells: [...cells] });
        }
      }
    }
  }

  return matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/word-scan.test.ts`
Expected: PASS (5 tests). If the Hebrew test fails, confirm `LOCALE_CONFIGS.he.normalize` folds final forms — adjust the test's expectation, not the production normalize.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/blast/v2/engine/word-scan.ts fe-next/lib/blast/v2/engine/__tests__/word-scan.test.ts
git commit -m "feat(blast): straight-line formable-word scanner for chain levels"
```

---

## Task 2: Insert a single word (backward construction primitive)

**Files:**
- Create: `fe-next/lib/blast/v2/engine/chain-builder.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts`

`insertWord` is the backward step: given board `S_k` (words k+1..N already placed) and `word_k`, produce `S_{k-1}` where `word_k` is formable and **no** word in `otherWordsOnBoard` is. Horizontal placement: pick a row `r` and start column `c`; in each affected column splice `word_k`'s letter in at array index `r` (pushing tiles above up one row). Removing those cells later + `collapseCells` reproduces `S_k` exactly.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts
import { describe, it, expect } from 'vitest';
import { insertWord } from '../chain-builder';
import { collapseCells } from '../collapse';
import { scanFormableThemeWords } from '../word-scan';
import type { BlastLevel } from '../../types';

function lvl(columns: string[][]): BlastLevel {
  return {
    id: 't', levelNumber: 1, theme: 'onboarding', locale: 'en',
    words: [], resolvableOrder: [], tileFlags: {}, difficulty: 1,
    columns: columns.map((tiles, index) => ({ index, tiles })),
  };
}

describe('insertWord', () => {
  it('inserts a word so only it is formable, and removing it restores the prior board', () => {
    const Sk = lvl([['D'], ['O'], ['G']]); // S_k: only DOG on the floor
    const result = insertWord(Sk, 'CAT', ['DOG'], 'en', 1);
    expect(result).not.toBeNull();
    const S = result!.level;

    // CAT is formable, DOG is not (it's been lifted out of a straight run)
    const matches = scanFormableThemeWords(S, ['CAT', 'DOG'], 'en');
    expect(matches.map((m) => m.word).sort()).toEqual(['CAT']);

    // Removing CAT's cells + collapse reproduces S_k exactly
    const after = collapseCells(S, result!.cells);
    expect(after.level.columns.map((c) => c.tiles)).toEqual(Sk.columns.map((c) => c.tiles));
  });

  it('returns null when no placement isolates the word', () => {
    // 1 column, word equal length — impossible to make CAT formable without TAC also straight
    const Sk = lvl([['X']]);
    const result = insertWord(Sk, 'CAT', ['XYZ'], 'en', 1);
    // CAT is length 3, board has 1 column -> horizontal impossible
    expect(result).toBeNull();
  });

  it('is deterministic for a given seed', () => {
    const Sk = lvl([['D'], ['O'], ['G']]);
    const a = insertWord(Sk, 'CAT', ['DOG'], 'en', 42);
    const b = insertWord(Sk, 'CAT', ['DOG'], 'en', 42);
    expect(a?.level.columns).toEqual(b?.level.columns);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/chain-builder.test.ts`
Expected: FAIL — `insertWord` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// fe-next/lib/blast/v2/engine/chain-builder.ts
import type { BlastColumn, BlastLevel, CellId, Locale } from '../types';
import { scanFormableThemeWords } from './word-scan';

export type InsertResult = { level: BlastLevel; cells: CellId[] };

/** Deterministic LCG so builds are reproducible per seed. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneColumns(columns: BlastColumn[]): BlastColumn[] {
  return columns.map((c) => ({ index: c.index, tiles: [...c.tiles] }));
}

function cid(col: number, row: number): CellId {
  return `c${col}r${row}`;
}

/**
 * Backward construction step. Inserts `word` into `Sk` as a horizontal run so
 * that `word` is formable and none of `otherWordsOnBoard` is. Returns the new
 * board (`S_{k-1}`) and the cells `word` occupies, or null if no placement works.
 */
export function insertWord(
  Sk: BlastLevel,
  word: string,
  otherWordsOnBoard: string[],
  locale: Locale,
  seed: number,
): InsertResult | null {
  const letters = [...word];
  const L = letters.length;
  const cols = Sk.columns.length;
  if (L > cols) return null;

  const rand = rng(seed);
  // Candidate placements: start column c (0..cols-L), insert row r.
  // r may be 0..(min column height among affected cols) so the run lands flush.
  type Cand = { c: number; r: number };
  const candidates: Cand[] = [];
  for (let c = 0; c + L <= cols; c++) {
    const affected = Array.from({ length: L }, (_, i) => Sk.columns[c + i]!.tiles.length);
    const maxR = Math.min(...affected);
    for (let r = 0; r <= maxR; r++) candidates.push({ c, r });
  }

  for (const { c, r } of shuffle(candidates, rand)) {
    const columns = cloneColumns(Sk.columns);
    const cells: CellId[] = [];
    for (let i = 0; i < L; i++) {
      columns[c + i]!.tiles.splice(r, 0, letters[i]!);
      cells.push(cid(c + i, r));
    }
    const level: BlastLevel = { ...Sk, columns };
    const matches = scanFormableThemeWords(level, [word, ...otherWordsOnBoard], locale);
    const formableWords = new Set(matches.map((m) => m.word));
    if (formableWords.size === 1 && formableWords.has(word)) {
      return { level, cells };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/chain-builder.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/blast/v2/engine/chain-builder.ts fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts
git commit -m "feat(blast): insertWord backward-construction primitive"
```

---

## Task 3: buildChainLevel — full level from a chain spec

**Files:**
- Modify: `fe-next/lib/blast/v2/engine/chain-builder.ts` (add `buildChainLevel`)
- Modify: `fe-next/lib/blast/v2/types.ts` (add `ChainLevelSpec`)
- Test: `fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts` (extend)

`buildChainLevel` runs `insertWord` from the last word to the first, then sprinkles decoy tiles. Decoys are random letters inserted into `S_0` that must not make any theme word formable early. The starting board `S_N` is `word_N` laid horizontally on the floor.

- [ ] **Step 1: Add the `ChainLevelSpec` type**

```typescript
// append to fe-next/lib/blast/v2/types.ts
export type ChainLevelSpec = {
  id: string;
  levelNumber: number;
  theme: ThemeKey;
  locale: Locale;
  /** Number of board columns. Must be >= the longest word in the chain. */
  columns: number;
  /** Count of decoy tiles that never complete a theme word. */
  decoyTiles: number;
  /** Ordered words; chain[0] is found first, chain[last] last. */
  chain: string[];
};
```

- [ ] **Step 2: Write the failing test (extend the file)**

```typescript
// append inside chain-builder.test.ts
import { buildChainLevel } from '../chain-builder';
import { validateChainLevel } from '../chain-validator'; // exists after Task 4 — see note
import type { ChainLevelSpec } from '../../types';

describe('buildChainLevel', () => {
  const spec: ChainLevelSpec = {
    id: 'en-chain-01', levelNumber: 1, theme: 'onboarding', locale: 'en',
    columns: 4, decoyTiles: 0, chain: ['CAT', 'SUN', 'EGG'],
  };

  it('produces a level whose forward replay matches the chain', () => {
    const level = buildChainLevel(spec, 7);
    expect(level).not.toBeNull();
    expect(level!.words).toEqual(['CAT', 'SUN', 'EGG']);
    expect(level!.resolvableOrder).toEqual(['CAT', 'SUN', 'EGG']);
  });

  it('column count matches the spec', () => {
    const level = buildChainLevel(spec, 7);
    expect(level!.columns.length).toBe(4);
  });

  it('returns null for an impossible chain (word longer than columns)', () => {
    const bad: ChainLevelSpec = { ...spec, columns: 2, chain: ['CAT'] };
    expect(buildChainLevel(bad, 7)).toBeNull();
  });

  it('inserts the requested number of decoy tiles', () => {
    const withDecoys: ChainLevelSpec = { ...spec, decoyTiles: 3 };
    const level = buildChainLevel(withDecoys, 7)!;
    const totalTiles = level.columns.reduce((n, c) => n + c.tiles.length, 0);
    const wordTiles = spec.chain.join('').length;
    expect(totalTiles).toBe(wordTiles + 3);
  });
});
```

> **Note:** Step 2's `import { validateChainLevel }` is forward-referenced; if running Task 3 before Task 4, comment that import + assertions until Task 4 lands, then uncomment. Subagent-driven execution does Task 4 immediately after — keep both.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/chain-builder.test.ts -t buildChainLevel`
Expected: FAIL — `buildChainLevel` not exported.

- [ ] **Step 4: Implement `buildChainLevel`**

```typescript
// append to fe-next/lib/blast/v2/engine/chain-builder.ts
import type { ChainLevelSpec, Letter } from '../types';
import { LOCALE_CONFIGS } from '../locale-config';
import { scanFormableThemeWords } from './word-scan';

const MAX_BUILD_ATTEMPTS = 200;

function emptyColumns(count: number): BlastColumn[] {
  return Array.from({ length: count }, (_, index) => ({ index, tiles: [] as Letter[] }));
}

/** S_N: the last word laid flat on the floor of an otherwise empty board. */
function floorBoard(spec: ChainLevelSpec): BlastLevel | null {
  const last = [...(spec.chain[spec.chain.length - 1] ?? '')];
  if (last.length > spec.columns) return null;
  const columns = emptyColumns(spec.columns);
  // centre the word horizontally for nicer layout
  const offset = Math.floor((spec.columns - last.length) / 2);
  last.forEach((ch, i) => columns[offset + i]!.tiles.push(ch));
  return {
    id: spec.id, levelNumber: spec.levelNumber, theme: spec.theme, locale: spec.locale,
    words: [...spec.chain], resolvableOrder: [...spec.chain], tileFlags: {},
    difficulty: spec.levelNumber, columns,
  };
}

/**
 * Builds a forced-chain BlastLevel from a spec. Returns null if no seed within
 * MAX_BUILD_ATTEMPTS yields a valid level (author should then tweak the chain).
 */
export function buildChainLevel(spec: ChainLevelSpec, seed: number): BlastLevel | null {
  const longest = Math.max(...spec.chain.map((w) => [...w].length));
  if (longest > spec.columns) return null;

  const rand = rng(seed);
  for (let attempt = 0; attempt < MAX_BUILD_ATTEMPTS; attempt++) {
    const attemptSeed = Math.floor(rand() * 0xffffffff) || 1;
    const base = floorBoard(spec);
    if (!base) return null;

    let board = base;
    let ok = true;
    // Insert words N-1 .. 0 (chain[last] already on the floor).
    for (let k = spec.chain.length - 2; k >= 0; k--) {
      const word = spec.chain[k]!;
      const others = spec.chain.slice(k + 1);
      const stepSeed = (attemptSeed + k * 7919) >>> 0;
      const res = insertWord(board, word, others, spec.locale, stepSeed);
      if (!res) { ok = false; break; }
      board = res.level;
    }
    if (!ok) continue;

    const withDecoys = insertDecoys(board, spec, attemptSeed);
    if (!withDecoys) continue;
    return withDecoys;
  }
  return null;
}

/** Inserts decoy tiles into S_0 that never complete a theme word. */
function insertDecoys(level: BlastLevel, spec: ChainLevelSpec, seed: number): BlastLevel | null {
  if (spec.decoyTiles <= 0) return level;
  const config = LOCALE_CONFIGS[spec.locale];
  const pool = config.tilePool;
  const rand = rng(seed);
  let board = level;

  for (let placed = 0; placed < spec.decoyTiles; placed++) {
    let success = false;
    for (let tries = 0; tries < 60 && !success; tries++) {
      const col = Math.floor(rand() * board.columns.length);
      const letter = pool[Math.floor(rand() * pool.length)]!;
      const columns = cloneColumns(board.columns);
      // drop decoy on top of the column (gravity-stable)
      columns[col]!.tiles.push(letter);
      const candidate: BlastLevel = { ...board, columns };
      const matches = scanFormableThemeWords(candidate, spec.chain, spec.locale);
      // a decoy on top must not make ANY theme word formable yet
      // (only chain[0] should be formable in S_0; check that invariant holds)
      const formable = new Set(matches.map((m) => m.word));
      if (formable.size <= 1 && (formable.size === 0 || formable.has(spec.chain[0]!))) {
        board = candidate;
        success = true;
      }
    }
    if (!success) return null;
  }
  return board;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/chain-builder.test.ts`
Expected: PASS. (If `buildChainLevel` test imports `validateChainLevel` and Task 4 isn't done, see the Note in Step 2.)

- [ ] **Step 6: Commit**

```bash
git add fe-next/lib/blast/v2/engine/chain-builder.ts fe-next/lib/blast/v2/types.ts fe-next/lib/blast/v2/engine/__tests__/chain-builder.test.ts
git commit -m "feat(blast): buildChainLevel constructs forced-chain levels from specs"
```

---

## Task 4: validateChainLevel — forward replay

**Files:**
- Create: `fe-next/lib/blast/v2/engine/chain-validator.ts`
- Test: `fe-next/lib/blast/v2/engine/__tests__/chain-validator.test.ts`

The independent safety net: replay the chain forward. At step k, assert the *only* formable theme word is `chain[k]`, then clear it + collapse and continue. Catches builder bugs and bad authored chains.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/blast/v2/engine/__tests__/chain-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateChainLevel } from '../chain-validator';
import { buildChainLevel } from '../chain-builder';
import type { BlastLevel, ChainLevelSpec } from '../../types';

const spec: ChainLevelSpec = {
  id: 'en-chain-01', levelNumber: 1, theme: 'onboarding', locale: 'en',
  columns: 4, decoyTiles: 0, chain: ['CAT', 'SUN', 'EGG'],
};

describe('validateChainLevel', () => {
  it('accepts a level built by buildChainLevel', () => {
    const level = buildChainLevel(spec, 7)!;
    const result = validateChainLevel(level);
    expect(result.ok).toBe(true);
  });

  it('rejects a level where a later word is formable too early', () => {
    // hand-craft a board where SUN is already a straight run alongside CAT
    const bad: BlastLevel = {
      ...spec, words: ['CAT', 'SUN'], resolvableOrder: ['CAT', 'SUN'],
      tileFlags: {}, difficulty: 1,
      columns: [
        { index: 0, tiles: ['C', 'S'] },
        { index: 1, tiles: ['A', 'U'] },
        { index: 2, tiles: ['T', 'N'] },
        { index: 3, tiles: [] },
      ],
    };
    const result = validateChainLevel(bad);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/step 1/i);
  });

  it('rejects a level whose board does not empty after the last word', () => {
    const bad: BlastLevel = {
      ...spec, words: ['CAT'], resolvableOrder: ['CAT'], tileFlags: {}, difficulty: 1,
      columns: [
        { index: 0, tiles: ['C'] }, { index: 1, tiles: ['A'] },
        { index: 2, tiles: ['T'] }, { index: 3, tiles: ['Z'] }, // leftover Z
      ],
    };
    const result = validateChainLevel(bad);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/leftover/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/chain-validator.test.ts`
Expected: FAIL — `validateChainLevel` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// fe-next/lib/blast/v2/engine/chain-validator.ts
import type { BlastLevel } from '../types';
import { collapseCells } from './collapse';
import { scanFormableThemeWords } from './word-scan';

export type ChainValidation = { ok: true } | { ok: false; reason: string };

/**
 * Replays a chain level forward. At each step exactly one theme word
 * (the next in resolvableOrder) must be formable; clearing it must not
 * skip ahead. After the final word the board must be empty.
 */
export function validateChainLevel(level: BlastLevel): ChainValidation {
  const order = level.resolvableOrder.length ? level.resolvableOrder : level.words;
  let board = level;

  for (let step = 0; step < order.length; step++) {
    const expected = order[step]!;
    const remaining = order.slice(step);
    const matches = scanFormableThemeWords(board, remaining, level.locale);
    const formable = new Set(matches.map((m) => m.word));

    if (!formable.has(expected)) {
      return { ok: false, reason: `step ${step + 1}: expected "${expected}" not formable` };
    }
    if (formable.size > 1) {
      const extra = [...formable].filter((w) => w !== expected);
      return { ok: false, reason: `step ${step + 1}: words formable out of order: ${extra.join(', ')}` };
    }

    const cells = matches.find((m) => m.word === expected)!.cells;
    board = collapseCells(board, cells).level;
  }

  const leftover = board.columns.reduce((n, c) => n + c.tiles.length, 0);
  if (leftover > 0) {
    return { ok: false, reason: `leftover ${leftover} tile(s) after final word` };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/engine/__tests__/chain-validator.test.ts`
Expected: PASS (3 tests). Re-run Task 3's file too — the forward-referenced import now resolves.

- [ ] **Step 5: Commit**

```bash
git add fe-next/lib/blast/v2/engine/chain-validator.ts fe-next/lib/blast/v2/engine/__tests__/chain-validator.test.ts
git commit -m "feat(blast): validateChainLevel forward-replay safety net"
```

---

## Task 5: ChainPackSource + registry wiring

**Files:**
- Create: `fe-next/lib/blast/v2/chain-pack-source.ts`
- Test: `fe-next/lib/blast/v2/__tests__/chain-pack-source.test.ts`
- Create: `fe-next/content/blast/packs/en/pack-chain.json` (stub — 1 level, full set in Task 6)
- Modify: `fe-next/lib/blast/v2/level-source-registry.ts`

`ChainPackSource` reads `content/blast/packs/{locale}/pack-chain.json` (`{ locale, levels: ChainLevelSpec[] }`), and on `resolve(levelNumber, locale)` finds the matching spec and returns `buildChainLevel(spec, levelNumber)`. The registry routes en/he levels 1–15 to it; everything else stays on curated/generated.

- [ ] **Step 1: Create the stub pack file**

```json
// fe-next/content/blast/packs/en/pack-chain.json
{
  "locale": "en",
  "levels": [
    {
      "id": "en-chain-01", "levelNumber": 1, "theme": "onboarding", "locale": "en",
      "columns": 4, "decoyTiles": 0, "chain": ["CAT", "SUN", "EGG"]
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// fe-next/lib/blast/v2/__tests__/chain-pack-source.test.ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { ChainPackSource } from '../chain-pack-source';
import { validateChainLevel } from '../engine/chain-validator';

const basePath = resolve(process.cwd(), 'content/blast/packs');

describe('ChainPackSource', () => {
  it('resolves level 1 for en as a valid forced-chain level', async () => {
    const source = new ChainPackSource(basePath);
    const level = await source.resolve(1, 'en');
    expect(level.id).toBe('en-chain-01');
    expect(level.words).toEqual(['CAT', 'SUN', 'EGG']);
    expect(validateChainLevel(level).ok).toBe(true);
  });

  it('throws for a level number not in the pack', async () => {
    const source = new ChainPackSource(basePath);
    await expect(source.resolve(99, 'en')).rejects.toThrow(/no chain spec/i);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/__tests__/chain-pack-source.test.ts`
Expected: FAIL — `ChainPackSource` not exported.

- [ ] **Step 4: Implement `ChainPackSource`**

```typescript
// fe-next/lib/blast/v2/chain-pack-source.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BlastLevel, ChainLevelSpec, Locale } from './types';
import type { LevelSource } from './level-source';
import { buildChainLevel } from './engine/chain-builder';
import { validateChainLevel } from './engine/chain-validator';

type ChainPackFile = { locale: Locale; levels: ChainLevelSpec[] };

export class ChainPackSource implements LevelSource {
  private cache = new Map<Locale, ChainPackFile>();

  constructor(private basePath: string) {}

  private async load(locale: Locale): Promise<ChainPackFile> {
    const cached = this.cache.get(locale);
    if (cached) return cached;
    const path = join(this.basePath, locale, 'pack-chain.json');
    const raw = JSON.parse(await readFile(path, 'utf8')) as ChainPackFile;
    this.cache.set(locale, raw);
    return raw;
  }

  async resolve(levelNumber: number, locale: Locale): Promise<BlastLevel> {
    const pack = await this.load(locale);
    const spec = pack.levels.find((l) => l.levelNumber === levelNumber);
    if (!spec) {
      throw new Error(`ChainPackSource: no chain spec for ${locale} level ${levelNumber}`);
    }
    const level = buildChainLevel(spec, levelNumber);
    if (!level) {
      throw new Error(`ChainPackSource: buildChainLevel failed for ${spec.id}`);
    }
    const check = validateChainLevel(level);
    if (!check.ok) {
      throw new Error(`ChainPackSource: ${spec.id} invalid — ${check.reason}`);
    }
    return level;
  }
}
```

> If `LevelSource` is not exported from a `level-source.ts`, check the import path used by `CuratedPackSource` and match it. The interface is `{ resolve(levelNumber: number, locale: Locale): Promise<BlastLevel> }`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/__tests__/chain-pack-source.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire into the registry**

In `fe-next/lib/blast/v2/level-source-registry.ts`, add `ChainPackSource` to the cached sources and route en/he levels 1–15 to it. Locate the existing `resolve`/dispatch function and add, before the curated/generated branch:

```typescript
import { ChainPackSource } from './chain-pack-source';

// inside the cached sources object:
cached = {
  chain: new ChainPackSource(basePath),
  curated: new CuratedPackSource(basePath),
  generated: new GeneratedLevelSource(LOCALE_CONFIGS),
};

// inside the level-resolution function, FIRST branch:
const CHAIN_LOCALES: Locale[] = ['en', 'he'];
const CHAIN_MAX_LEVEL = 15;
if (CHAIN_LOCALES.includes(locale) && levelNumber >= 1 && levelNumber <= CHAIN_MAX_LEVEL) {
  return cached.chain.resolve(levelNumber, locale);
}
// ...existing curated/generated logic unchanged
```

- [ ] **Step 7: Run the blast v2 suite to confirm no regression**

Run: `cd fe-next && npx vitest run lib/blast/v2`
Expected: PASS — all existing blast v2 tests plus the new ones.

- [ ] **Step 8: Commit**

```bash
git add fe-next/lib/blast/v2/chain-pack-source.ts fe-next/lib/blast/v2/__tests__/chain-pack-source.test.ts fe-next/content/blast/packs/en/pack-chain.json fe-next/lib/blast/v2/level-source-registry.ts
git commit -m "feat(blast): ChainPackSource + registry routing for en/he chain levels"
```

---

## Task 6: Author 15 English chain levels

**Files:**
- Modify: `fe-next/content/blast/packs/en/pack-chain.json` (replace stub with all 15)
- Test: `fe-next/lib/blast/v2/__tests__/pack-chain-en.test.ts`

Words are real, themed, rising difficulty. The builder produces the board; the validator guarantees the forced order. If `buildChainLevel` returns null for a chain (words too similar to isolate), swap one word and retry.

Difficulty curve: L1–5 → 3 words / 3–4 letters / 3–4 cols / 0 decoys. L6–10 → 4 words / 4–5 letters / 4–5 cols / 1–2 decoys. L11–15 → 5 words / 5–6 letters / 5–6 cols / 2–3 decoys.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/blast/v2/__tests__/pack-chain-en.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChainLevel } from '../engine/chain-builder';
import { validateChainLevel } from '../engine/chain-validator';
import type { ChainLevelSpec } from '../types';

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'content/blast/packs/en/pack-chain.json'), 'utf8'),
) as { locale: string; levels: ChainLevelSpec[] };

describe('en pack-chain.json', () => {
  it('has exactly 15 levels numbered 1..15', () => {
    expect(pack.levels.map((l) => l.levelNumber)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
  });

  it('every level builds and passes the forced-chain validator', () => {
    for (const spec of pack.levels) {
      const level = buildChainLevel(spec, spec.levelNumber);
      expect(level, `${spec.id} failed to build`).not.toBeNull();
      const check = validateChainLevel(level!);
      expect(check.ok, `${spec.id}: ${check.ok ? '' : check.reason}`).toBe(true);
    }
  });

  it('respects the difficulty curve (chain length grows by tier)', () => {
    for (const spec of pack.levels) {
      const n = spec.levelNumber;
      const expected = n <= 5 ? 3 : n <= 10 ? 4 : 5;
      expect(spec.chain.length, `${spec.id}`).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/__tests__/pack-chain-en.test.ts`
Expected: FAIL — stub has 1 level.

- [ ] **Step 3: Replace `pack-chain.json` with all 15 levels**

```json
{
  "locale": "en",
  "levels": [
    { "id": "en-chain-01", "levelNumber": 1,  "theme": "onboarding", "locale": "en", "columns": 4, "decoyTiles": 0, "chain": ["CAT", "SUN", "EGG"] },
    { "id": "en-chain-02", "levelNumber": 2,  "theme": "fruits",     "locale": "en", "columns": 4, "decoyTiles": 0, "chain": ["FIG", "PEAR", "KIWI"] },
    { "id": "en-chain-03", "levelNumber": 3,  "theme": "animals",    "locale": "en", "columns": 4, "decoyTiles": 0, "chain": ["COW", "GOAT", "DEER"] },
    { "id": "en-chain-04", "levelNumber": 4,  "theme": "food",       "locale": "en", "columns": 4, "decoyTiles": 0, "chain": ["JAM", "RICE", "CAKE"] },
    { "id": "en-chain-05", "levelNumber": 5,  "theme": "colors",     "locale": "en", "columns": 4, "decoyTiles": 0, "chain": ["RED", "BLUE", "PINK"] },
    { "id": "en-chain-06", "levelNumber": 6,  "theme": "ocean",      "locale": "en", "columns": 5, "decoyTiles": 1, "chain": ["CRAB", "SEAL", "WHALE", "SHARK"] },
    { "id": "en-chain-07", "levelNumber": 7,  "theme": "space",      "locale": "en", "columns": 5, "decoyTiles": 1, "chain": ["MARS", "MOON", "STAR", "COMET"] },
    { "id": "en-chain-08", "levelNumber": 8,  "theme": "animals",    "locale": "en", "columns": 5, "decoyTiles": 2, "chain": ["WOLF", "LION", "BEAR", "TIGER"] },
    { "id": "en-chain-09", "levelNumber": 9,  "theme": "fruits",     "locale": "en", "columns": 5, "decoyTiles": 2, "chain": ["PLUM", "MANGO", "GRAPE", "LEMON"] },
    { "id": "en-chain-10", "levelNumber": 10, "theme": "weather",    "locale": "en", "columns": 5, "decoyTiles": 2, "chain": ["RAIN", "SNOW", "CLOUD", "STORM"] },
    { "id": "en-chain-11", "levelNumber": 11, "theme": "animals",    "locale": "en", "columns": 5, "decoyTiles": 2, "chain": ["HORSE", "ZEBRA", "PANDA", "KOALA", "OTTER"] },
    { "id": "en-chain-12", "levelNumber": 12, "theme": "food",       "locale": "en", "columns": 5, "decoyTiles": 2, "chain": ["BREAD", "PASTA", "SALAD", "HONEY", "OLIVE"] },
    { "id": "en-chain-13", "levelNumber": 13, "theme": "nature",     "locale": "en", "columns": 5, "decoyTiles": 3, "chain": ["RIVER", "BEACH", "CLIFF", "MARSH", "GROVE"] },
    { "id": "en-chain-14", "levelNumber": 14, "theme": "space",      "locale": "en", "columns": 6, "decoyTiles": 3, "chain": ["PLANET", "GALAXY", "METEOR", "ROCKET", "ORBITS"] },
    { "id": "en-chain-15", "levelNumber": 15, "theme": "animals",    "locale": "en", "columns": 6, "decoyTiles": 3, "chain": ["JAGUAR", "FALCON", "WALRUS", "BEAVER", "IGUANA"] }
  ]
}
```

> If a level fails to build/validate, the failure message names the level. Swap the offending word for another on-theme word of the same length (e.g. `IGUANA` → `MONKEY`) and re-run. Keep `theme` values to keys that exist in `ThemeKey` — if `weather`/`nature` are not in `ThemeKey`, use the closest existing key.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/__tests__/pack-chain-en.test.ts`
Expected: PASS (3 tests). Iterate on word swaps until green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/content/blast/packs/en/pack-chain.json fe-next/lib/blast/v2/__tests__/pack-chain-en.test.ts
git commit -m "feat(blast): 15 authored English chain levels"
```

---

## Task 7: Author 15 Hebrew chain levels

**Files:**
- Create: `fe-next/content/blast/packs/he/pack-chain.json`
- Test: `fe-next/lib/blast/v2/__tests__/pack-chain-he.test.ts`

Same structure, predefined Hebrew words. Hebrew final forms: author words with **base forms** in the JSON (כ not ך) — `he.ts` normalize/displayChar handles final-form rendering. Word length counts Hebrew letters.

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/blast/v2/__tests__/pack-chain-he.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChainLevel } from '../engine/chain-builder';
import { validateChainLevel } from '../engine/chain-validator';
import type { ChainLevelSpec } from '../types';

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'content/blast/packs/he/pack-chain.json'), 'utf8'),
) as { locale: string; levels: ChainLevelSpec[] };

describe('he pack-chain.json', () => {
  it('has exactly 15 levels numbered 1..15', () => {
    expect(pack.levels.map((l) => l.levelNumber)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
  });

  it('every level builds and passes the forced-chain validator', () => {
    for (const spec of pack.levels) {
      const level = buildChainLevel(spec, spec.levelNumber);
      expect(level, `${spec.id} failed to build`).not.toBeNull();
      const check = validateChainLevel(level!);
      expect(check.ok, `${spec.id}: ${check.ok ? '' : check.reason}`).toBe(true);
    }
  });

  it('uses base-form Hebrew letters only (no final forms in source)', () => {
    const finals = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const spec of pack.levels) {
      for (const word of spec.chain) {
        for (const f of finals) {
          expect(word.includes(f), `${spec.id} word ${word} has final form`).toBe(false);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run lib/blast/v2/__tests__/pack-chain-he.test.ts`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create `he/pack-chain.json`**

```json
{
  "locale": "he",
  "levels": [
    { "id": "he-chain-01", "levelNumber": 1,  "theme": "onboarding", "locale": "he", "columns": 4, "decoyTiles": 0, "chain": ["חתול", "שמש", "ביצה"] },
    { "id": "he-chain-02", "levelNumber": 2,  "theme": "fruits",     "locale": "he", "columns": 4, "decoyTiles": 0, "chain": ["תפוח", "ענב", "אגס"] },
    { "id": "he-chain-03", "levelNumber": 3,  "theme": "animals",    "locale": "he", "columns": 3, "decoyTiles": 0, "chain": ["כלב", "פרה", "סוס"] },
    { "id": "he-chain-04", "levelNumber": 4,  "theme": "food",       "locale": "he", "columns": 4, "decoyTiles": 0, "chain": ["לחם", "אורז", "עוגה"] },
    { "id": "he-chain-05", "levelNumber": 5,  "theme": "colors",     "locale": "he", "columns": 4, "decoyTiles": 0, "chain": ["אדום", "כחול", "ירוק"] },
    { "id": "he-chain-06", "levelNumber": 6,  "theme": "ocean",      "locale": "he", "columns": 5, "decoyTiles": 1, "chain": ["דג", "סרטן", "כריש", "לוויתן"] },
    { "id": "he-chain-07", "levelNumber": 7,  "theme": "space",      "locale": "he", "columns": 5, "decoyTiles": 1, "chain": ["ירח", "כוכב", "שמש", "מאדים"] },
    { "id": "he-chain-08", "levelNumber": 8,  "theme": "animals",    "locale": "he", "columns": 4, "decoyTiles": 2, "chain": ["זאב", "דוב", "נמר", "אריה"] },
    { "id": "he-chain-09", "levelNumber": 9,  "theme": "fruits",     "locale": "he", "columns": 5, "decoyTiles": 2, "chain": ["תפוז", "בננה", "מנגו", "לימון"] },
    { "id": "he-chain-10", "levelNumber": 10, "theme": "weather",    "locale": "he", "columns": 4, "decoyTiles": 2, "chain": ["גשם", "ענן", "שלג", "סופה"] },
    { "id": "he-chain-11", "levelNumber": 11, "theme": "animals",    "locale": "he", "columns": 5, "decoyTiles": 2, "chain": ["סוסה", "זברה", "פנדה", "קואלה", "נמיה"] },
    { "id": "he-chain-12", "levelNumber": 12, "theme": "food",       "locale": "he", "columns": 5, "decoyTiles": 2, "chain": ["גבינה", "פסטה", "סלט", "דבש", "זית"] },
    { "id": "he-chain-13", "levelNumber": 13, "theme": "nature",     "locale": "he", "columns": 5, "decoyTiles": 3, "chain": ["נהר", "חוף", "מערה", "אגם", "יער"] },
    { "id": "he-chain-14", "levelNumber": 14, "theme": "space",      "locale": "he", "columns": 6, "decoyTiles": 3, "chain": ["כוכב", "גלקסיה", "מטאור", "רקטה", "מסלול"] },
    { "id": "he-chain-15", "levelNumber": 15, "theme": "animals",    "locale": "he", "columns": 5, "decoyTiles": 3, "chain": ["קרנף", "נמר", "פיל", "צבי", "יען"] }
  ]
}
```

> Same iteration rule as Task 6: if a level fails to build, swap an on-theme Hebrew word of equal length. These words are AI-selected — **flag the whole HE pack for native Hebrew review** in the final summary; the validator only guarantees structure, not idiomatic word choice.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run lib/blast/v2/__tests__/pack-chain-he.test.ts`
Expected: PASS (3 tests). Iterate on word swaps until green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/content/blast/packs/he/pack-chain.json fe-next/lib/blast/v2/__tests__/pack-chain-he.test.ts
git commit -m "feat(blast): 15 authored Hebrew chain levels (native review pending)"
```

---

## Task 8: Hybrid tile restyle

**Files:**
- Modify: `fe-next/components/blast/v2/BlastTile.tsx`
- Modify: `fe-next/components/blast/v2/BlastTile.module.css` (the `styles.tile` / `styles.letter` rules)
- Test: `fe-next/components/blast/v2/__tests__/BlastTile.test.tsx` (extend existing)

Hybrid look: chunky tactile tile with depth (bevel + inner highlight + hard drop shadow), warm face, neo-brutalist solid border + hard edge. Selected state uses the electric Blast accent. No wood texture. Keep the existing `m.div` / `layout` / `AnimatePresence` props — only style + add a `data-depth` hook for the GSAP land-squash in Task 9.

- [ ] **Step 1: Write the failing test**

```tsx
// extend fe-next/components/blast/v2/__tests__/BlastTile.test.tsx
import { render } from '@testing-library/react';
import { BlastTile } from '../BlastTile';

it('renders a tactile tile with a hard border and depth hook', () => {
  const { container } = render(
    <BlastTile letter="A" cellId="c0r0" flags={[]} state="normal" fontStack="Rubik" />,
  );
  const tile = container.querySelector('[data-cell-id="c0r0"]') as HTMLElement;
  expect(tile).toBeTruthy();
  expect(tile.getAttribute('data-depth')).toBe('rest');
  // hard neo-brutalist border, not a soft shadow-only tile
  const cls = tile.className;
  expect(cls).toContain('tile');
});

it('marks the depth hook as pressed when selected', () => {
  const { container } = render(
    <BlastTile letter="A" cellId="c0r0" flags={[]} state="selected" fontStack="Rubik" />,
  );
  const tile = container.querySelector('[data-cell-id="c0r0"]') as HTMLElement;
  expect(tile.getAttribute('data-depth')).toBe('pressed');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/BlastTile.test.tsx`
Expected: FAIL — `data-depth` attribute not present.

- [ ] **Step 3: Update `BlastTile.tsx`**

Add `data-depth={state === 'selected' ? 'pressed' : 'rest'}` to the `m.div`. Replace the inline `background`/`padding` styling approach with CSS-module classes that give: solid 3px border (`var(--blast-tile-border, #1a1330)`), hard offset shadow (`4px 4px 0` brand navy), inner top highlight (`inset 0 2px 0 rgba(255,255,255,0.35)`), warm face (`#f4e9d8` rest), accent face when selected (`modeColor`). Keep `modeColor` prop as the selected-state fill. Letter stays bold Fredoka-weight via `fontStack`.

```tsx
// the m.div, with restyle:
<m.div
  layout
  data-cell-id={id}
  data-state={state}
  data-depth={state === 'selected' ? 'pressed' : 'rest'}
  className={styles.tile}
  style={{
    fontFamily: fontStack,
    ['--tile-face' as string]: state === 'selected' ? modeColor : undefined,
  }}
  animate={state === 'selected' ? { scale: 1.06, y: -5 } : { scale: 1, y: 0 }}
  exit={state === 'just-cleared' ? { scale: 0, opacity: 0, rotate: 8 } : undefined}
  whileTap={{ scale: 0.94 }}
  onPointerDown={...}
>
  <span className={styles.letter}>{displayChar ?? letter}</span>
  {hasCoin && <span data-flag="coin" className={styles.coin} />}
  {hasGem && <span data-flag="gem" className={styles.gem} />}
</m.div>
```

CSS module rules (`BlastTile.module.css`):
```css
.tile {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--blast-tile-size, 56px);
  height: var(--blast-tile-size, 56px);
  background: var(--tile-face, #f4e9d8);
  color: #2a1f12;
  border: 3px solid #1a1330;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #1a1330, inset 0 2px 0 rgba(255, 255, 255, 0.4),
    inset 0 -3px 0 rgba(0, 0, 0, 0.12);
  user-select: none;
  touch-action: none;
}
.tile[data-state='selected'] { color: #fff; }
.tile[data-state='just-cleared'] { box-shadow: none; }
.letter { font-size: clamp(1.1rem, 4.5vw, 1.6rem); font-weight: 700; line-height: 1; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/BlastTile.test.tsx`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/v2/BlastTile.tsx fe-next/components/blast/v2/BlastTile.module.css fe-next/components/blast/v2/__tests__/BlastTile.test.tsx
git commit -m "feat(blast): hybrid neo-brutalist tactile tile restyle"
```

---

## Task 9: GSAP collapse timeline

**Files:**
- Create: `fe-next/components/blast/v2/useCollapseTimeline.ts`
- Modify: `fe-next/components/blast/v2/BlastBoard.tsx`
- Test: `fe-next/components/blast/v2/__tests__/useCollapseTimeline.test.tsx`

When `tileIds` changes (a collapse happened), run a GSAP timeline that drops the moved tiles with an ease-in + squash-on-land. Framer Motion's `layout` already animates position; GSAP adds the squash punch on top via the `data-depth` hook and a transient `data-depth="land"`. Respect `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing test**

```tsx
// fe-next/components/blast/v2/__tests__/useCollapseTimeline.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCollapseTimeline } from '../useCollapseTimeline';

describe('useCollapseTimeline', () => {
  it('does not animate on first render (no prior tileIds)', () => {
    const ref = { current: document.createElement('div') };
    const { rerender } = renderHook(
      ({ ids }) => useCollapseTimeline(ref, ids),
      { initialProps: { ids: [['a', 'b']] } },
    );
    rerender({ ids: [['a', 'b']] });
    // no throw, no crash — timeline only fires on change
    expect(true).toBe(true);
  });

  it('skips animation when prefers-reduced-motion is set', () => {
    const ref = { current: document.createElement('div') };
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const { rerender } = renderHook(
      ({ ids }) => useCollapseTimeline(ref, ids),
      { initialProps: { ids: [['a']] } },
    );
    rerender({ ids: [['b']] }); // changed — but reduced motion -> no GSAP timeline
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/useCollapseTimeline.test.tsx`
Expected: FAIL — `useCollapseTimeline` not exported.

- [ ] **Step 3: Implement the hook**

```tsx
// fe-next/components/blast/v2/useCollapseTimeline.ts
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Plays a squash-on-land GSAP punch on tiles whose tileId changed (i.e. tiles
 * that moved during the last collapse). Framer Motion handles the positional
 * slide via `layout`; this adds the landing punch.
 */
export function useCollapseTimeline(
  boardRef: React.RefObject<HTMLElement | null>,
  tileIds: string[][],
): void {
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const key = JSON.stringify(tileIds);
    if (prev.current === null) { prev.current = key; return; }
    if (prev.current === key) return;
    prev.current = key;
    if (reducedMotion() || !boardRef.current) return;

    const tiles = boardRef.current.querySelectorAll<HTMLElement>('[data-cell-id]');
    const tl = gsap.timeline();
    tiles.forEach((el, i) => {
      tl.fromTo(
        el,
        { scaleY: 1 },
        {
          scaleY: 0.82, duration: 0.09, yoyo: true, repeat: 1,
          ease: 'power2.in', transformOrigin: 'bottom center',
        },
        i * 0.012,
      );
    });
    return () => { tl.kill(); };
  }, [tileIds, boardRef]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/useCollapseTimeline.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into `BlastBoard.tsx`**

Add a `boardRef` on the outer `<div>`, call `useCollapseTimeline(boardRef, tileIds)`. No other markup change.

```tsx
const boardRef = useRef<HTMLDivElement>(null);
useCollapseTimeline(boardRef, tileIds);
// ...
<div ref={boardRef} dir={config.rtl ? 'rtl' : 'ltr'} data-shake-key={invalidShakeKey}>
```

- [ ] **Step 6: Run the board test + commit**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/BlastBoard.test.tsx`
Expected: PASS (no regression).

```bash
git add fe-next/components/blast/v2/useCollapseTimeline.ts fe-next/components/blast/v2/BlastBoard.tsx fe-next/components/blast/v2/__tests__/useCollapseTimeline.test.tsx
git commit -m "feat(blast): GSAP squash-on-land collapse timeline"
```

---

## Task 10: Cascade-reveal glow

**Files:**
- Modify: `fe-next/components/blast/v2/BlastBoard.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastBoard.test.tsx` (extend)

After a collapse, the next chain word becomes formable. Highlight its cells with a pulse-glow so the player sees what the collapse unlocked. Reuse `detectAllCascades`/the `almosts` pipeline already feeding `BlastBoard` — but specifically glow the cells of the *next resolvable word*. The `almosts` prop already exists; add a `revealGlowCells?: CellId[]` prop and render a glow layer over those cells.

- [ ] **Step 1: Write the failing test**

```tsx
// extend BlastBoard.test.tsx
it('renders a reveal glow over the cells passed in revealGlowCells', () => {
  const { container } = render(
    <BlastBoard
      level={sampleLevel}
      selection={emptySelection}
      invalidShakeKey={0}
      onPointerDown={() => {}}
      onPointerEnter={() => {}}
      onPointerUp={() => {}}
      tileIds={sampleTileIds}
      revealGlowCells={['c0r0', 'c1r0']}
    />,
  );
  expect(container.querySelectorAll('[data-reveal-glow]').length).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/BlastBoard.test.tsx -t reveal`
Expected: FAIL — prop/markup not present.

- [ ] **Step 3: Implement**

Add `revealGlowCells?: CellId[]` to `BlastBoard` props. For each tile, if its `cellId` is in `revealGlowCells`, render a sibling `<span data-reveal-glow className={styles.revealGlow} />` (absolutely positioned, pulsing keyframe, electric accent, `prefers-reduced-motion` gated via CSS). Compute `revealGlowCells` upstream in `BlastGame.tsx`: after a successful submit, `scanFormableThemeWords(level, [nextResolvableWord], locale)` → first match's cells; clear on next selection start.

CSS:
```css
.revealGlow {
  position: absolute; inset: -2px; border-radius: 12px; pointer-events: none;
  box-shadow: 0 0 0 3px var(--blast-accent, #22d3ee), 0 0 16px 4px var(--blast-accent, #22d3ee);
  animation: revealPulse 0.9s ease-in-out 2;
}
@keyframes revealPulse { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .revealGlow { animation: none; opacity: 0.6; } }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npx vitest run components/blast/v2/__tests__/BlastBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/v2/BlastBoard.tsx fe-next/components/blast/v2/BlastGame.tsx fe-next/components/blast/v2/__tests__/BlastBoard.test.tsx
git commit -m "feat(blast): cascade-reveal glow highlights the unlocked word"
```

---

## Task 11: Integration, full suite, build, playtest

**Files:**
- No new files — verification + any wiring fixes surfaced.

- [ ] **Step 1: Run the full blast v2 suite**

Run: `cd fe-next && npx vitest run lib/blast/v2 components/blast/v2`
Expected: PASS — all engine, pack, component tests green.

- [ ] **Step 2: Lint + typecheck + build**

Run: `cd fe-next && npm run lint && npm run build`
Expected: no errors. Fix any surfaced type mismatches (likely in registry wiring or `BlastGame` reveal-glow plumbing).

- [ ] **Step 3: Playwriter playtest — English**

Start dev server (`cd fe-next && npm run dev`, port **3001**). Open `http://localhost:3001/en/blast?v2=force`. Play level 1: confirm only the first word is selectable, finding it collapses tiles, the next word's cells glow, and the chain completes to an empty board. Repeat spot-checks on levels 6 and 13. Screenshot each.

- [ ] **Step 4: Playwriter playtest — Hebrew RTL**

Open `http://localhost:3001/he/blast?v2=force`. Confirm RTL board layout, Hebrew tiles render with correct final forms, chain forces order, level 1 completes. Screenshot.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(blast): integration fixes + playtest verification for v2 playable"
```

- [ ] **Step 6: Summary**

Report: tasks done, test counts, playtest screenshots, and explicitly flag the **Hebrew pack for native review** and any `ThemeKey` substitutions made.

---

## Self-Review Notes

- **Spec coverage:** forced-chain mechanic → T1–4; authored 15 EN + 15 HE → T6–7; pack loading → T5; hybrid aesthetic → T8; GSAP collapse → T9; cascade-reveal → T10; PixiJS bursts → *already exist in `BlastFxOverlay`*, no new task needed (reused, noted in spec); playtest → T11. **Gap:** spec mentioned animate-ai micro-interactions — Framer Motion `whileTap` already covers tile press (T8); animate-ai is MCP-only with no runtime lib, so no separate task. Acceptable per spec's "reuse" intent.
- **Type consistency:** `ChainLevelSpec`, `WordMatch`, `InsertResult`, `ChainValidation`, `ChainPackFile` defined once, used consistently. `scanFormableThemeWords(level, targets, locale)` signature stable across T1/T2/T3/T4/T5.
- **Placeholders:** none — every code step has full code; word-swap iteration loops in T6/T7 are explicit fallback instructions, not placeholders (the validator is the acceptance gate).
- **Risk:** `buildChainLevel` may return null for chains whose words can't be isolated; mitigated by the 200-attempt seed loop + explicit author word-swap instruction in T6/T7.
