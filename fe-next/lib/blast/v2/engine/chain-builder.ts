import type { BlastColumn, BlastLevel, CellId, ChainLevelSpec, Letter, Locale } from '../types';
import { cellId } from './cell-id';
import { scanFormableThemeWords } from './word-scan';
import { validateChainLevel } from './chain-validator';
import { findExtraWords } from './extra-word-check';
import { LOCALE_CONFIGS } from '../locale-config';

export type InsertResult = { level: BlastLevel; cells: CellId[] };

/**
 * Optional extra-word screen. When provided, a placement is rejected if it
 * introduces a board-formable common word that isn't part of the chain.
 * Lets vertical insertion live alongside the existing common-word audit
 * without forcing the author to babysit dictionary collisions.
 */
export type ExtraWordCheck = {
  isCommon: (word: string) => boolean;
  minLength: number;
};

function passesExtraWordCheck(level: BlastLevel, check: ExtraWordCheck | undefined): boolean {
  if (!check) return true;
  return findExtraWords(level, check.isCommon, check.minLength).length === 0;
}

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
    [a[i], a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

function cloneColumns(columns: BlastColumn[]): BlastColumn[] {
  return columns.map((c) => ({ index: c.index, tiles: [...c.tiles] }));
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
  extraWordCheck?: ExtraWordCheck,
): InsertResult | null {
  const letters = [...word];
  const L = letters.length;
  const cols = Sk.columns.length;
  if (L > cols) return null;

  const rand = rng(seed);
  type Cand = { c: number; r: number };
  const candidates: Cand[] = [];

  // Generate all valid placements: starting column c, row r such that
  // the word fits horizontally and row r is a valid insertion point.
  for (let c = 0; c + L <= cols; c++) {
    const affected = Array.from({ length: L }, (_, i) => Sk.columns[c + i]!.tiles.length);
    const maxR = Math.min(...affected);
    for (let r = 0; r <= maxR; r++) {
      candidates.push({ c, r });
    }
  }

  // Randomize candidate order for reproducibility via seed.
  const shuffled = shuffle(candidates, rand);

  for (const { c, r } of shuffled) {
    const columns = cloneColumns(Sk.columns);
    const cells: CellId[] = [];

    // Insert each letter at row r in its respective column.
    for (let i = 0; i < L; i++) {
      columns[c + i]!.tiles.splice(r, 0, letters[i]!);
      cells.push(cellId(c + i, r));
    }

    const level: BlastLevel = { ...Sk, columns };
    const matches = scanFormableThemeWords(level, [word, ...otherWordsOnBoard], locale);
    const formableWords = new Set(matches.map((m) => m.word));

    // Success: only `word` is formable AND no unintended common words appear.
    if (
      formableWords.size === 1 &&
      formableWords.has(word) &&
      passesExtraWordCheck(level, extraWordCheck)
    ) {
      return { level, cells };
    }
  }

  return null;
}

/**
 * Backward construction step — vertical variant. Inserts `word` as a single
 * vertical run inside one column, such that scanning the column top-down
 * yields `word`. Returns the new board and the cells (bottom-to-top) the
 * word occupies, or null if no placement isolates the word.
 *
 * Why "reversed when written into tiles": word-scan reads vertical runs
 * top-down (highest row first). To form "CAT" reading top→down we must have
 * tiles[r+2]='C', tiles[r+1]='A', tiles[r]='T' — i.e., the letters are
 * inserted at row r in REVERSE order so the bottom tile is the last letter.
 */
export function insertWordVertical(
  Sk: BlastLevel,
  word: string,
  otherWordsOnBoard: string[],
  locale: Locale,
  seed: number,
  extraWordCheck?: ExtraWordCheck,
): InsertResult | null {
  const letters = [...word];
  const L = letters.length;
  const cols = Sk.columns.length;
  if (cols === 0 || L < 2) return null;

  const rand = rng(seed);
  type Cand = { c: number; r: number };
  const candidates: Cand[] = [];

  // Vertical placements: pick a column c, then a row r where the L-letter
  // word will sit. Any r from 0 (bottom) up to current column height is valid
  // (splice shifts existing tiles up). r=0 stacks the word ON TOP of the
  // existing column tiles only if we splice at index `col.tiles.length`; so
  // we enumerate r in [0, col.tiles.length] inclusive.
  for (let c = 0; c < cols; c++) {
    const h = Sk.columns[c]!.tiles.length;
    for (let r = 0; r <= h; r++) {
      candidates.push({ c, r });
    }
  }

  const shuffled = shuffle(candidates, rand);

  for (const { c, r } of shuffled) {
    const columns = cloneColumns(Sk.columns);
    const cells: CellId[] = [];

    // Insert letters in FORWARD order. Each splice(r, 0, ch) pushes the
    // previous letter up, so after L splices tiles[r]=last letter, …,
    // tiles[r+L-1]=first letter. word-scan reads vertical runs top-down
    // (highest row first), which then yields the forward word.
    for (let i = 0; i < L; i++) {
      columns[c]!.tiles.splice(r, 0, letters[i]!);
    }
    // Emit cells in bottom-to-top order (row r, r+1, … r+L-1) — engine
    // convention is row 0 = bottom; consumers expect ascending rows.
    for (let i = 0; i < L; i++) {
      cells.push(cellId(c, r + i));
    }

    const level: BlastLevel = { ...Sk, columns };
    const matches = scanFormableThemeWords(level, [word, ...otherWordsOnBoard], locale);
    const formableWords = new Set(matches.map((m) => m.word));

    if (
      formableWords.size === 1 &&
      formableWords.has(word) &&
      passesExtraWordCheck(level, extraWordCheck)
    ) {
      return { level, cells };
    }
  }

  return null;
}

const MAX_BUILD_ATTEMPTS = 500;

function emptyColumns(count: number): BlastColumn[] {
  return Array.from({ length: count }, (_, index) => ({ index, tiles: [] as Letter[] }));
}

/**
 * S_N: the last word laid flat on the floor of an otherwise empty board.
 */
function floorBoard(spec: ChainLevelSpec): BlastLevel | null {
  const last = [...(spec.chain[spec.chain.length - 1] ?? '')];
  if (last.length > spec.columns) return null;
  const columns = emptyColumns(spec.columns);
  const offset = Math.floor((spec.columns - last.length) / 2);
  last.forEach((ch, i) => columns[offset + i]!.tiles.push(ch));
  return {
    id: spec.id,
    levelNumber: spec.levelNumber,
    theme: spec.theme,
    locale: spec.locale,
    words: [...spec.chain],
    resolvableOrder: [...spec.chain],
    tileFlags: {},
    difficulty: spec.levelNumber,
    columns,
  };
}

/**
 * Builds a forced-chain BlastLevel from a spec. Returns null if no seed within
 * MAX_BUILD_ATTEMPTS yields a valid level (author should then tweak the chain).
 */
export function buildChainLevel(
  spec: ChainLevelSpec,
  seed: number,
  extraWordCheck?: ExtraWordCheck,
): BlastLevel | null {
  const longest = Math.max(...spec.chain.map((w) => [...w].length));
  if (longest > spec.columns) return null;

  const rand = rng(seed);
  for (let attempt = 0; attempt < MAX_BUILD_ATTEMPTS; attempt++) {
    const attemptSeed = Math.floor(rand() * 0xffffffff) || 1;
    const base = floorBoard(spec);
    if (!base) return null;

    let board = base;
    let ok = true;
    // Coin-flip per step to pick orientation; fall back to the other axis if
    // the chosen one can't isolate the word. This produces visually mixed
    // levels — some words land as rows, others stack as columns — instead of
    // every board being a flat horizontal scroll.
    const orientRand = rng(attemptSeed ^ 0xa5a5a5a5);
    for (let k = spec.chain.length - 2; k >= 0; k--) {
      const word = spec.chain[k]!;
      const others = spec.chain.slice(k + 1);
      const stepSeed = (attemptSeed + k * 7919) >>> 0;
      const preferVertical = orientRand() < 0.5;
      const first = preferVertical
        ? insertWordVertical(board, word, others, spec.locale, stepSeed, extraWordCheck)
        : insertWord(board, word, others, spec.locale, stepSeed, extraWordCheck);
      const res = first ?? (preferVertical
        ? insertWord(board, word, others, spec.locale, stepSeed, extraWordCheck)
        : insertWordVertical(board, word, others, spec.locale, stepSeed, extraWordCheck));
      if (!res) {
        ok = false;
        break;
      }
      board = res.level;
    }
    if (!ok) continue;

    const withDecoys = insertDecoys(board, spec, attemptSeed);
    if (!withDecoys) continue;
    return withDecoys;
  }
  return null;
}

/**
 * Inserts decoy tiles into a level that preserve the chain's validity.
 *
 * CURRENT LIMITATION: Decoys cannot be reliably placed because the validator
 * requires the board to fully empty after all chain words are removed. Any decoy
 * tile that doesn't fall into a position captured by a word removal becomes
 * leftover and fails validation.
 *
 * For small, sparse chains, random placement occasionally succeeds by luck.
 * For dense chains (4-5 words on 9 columns), the probability of a random tile
 * landing in a captured position is near-zero, making placement computationally
 * infeasible.
 *
 * WORKAROUND: Keep decoyTiles at 0 for all authored packs. Future improvements
 * could:
 * - Modify the validator to allow decoys if they're guaranteed to be cleared
 * - Use graph analysis to identify which positions will be cleared and only
 *   place decoys there
 * - Relax the validator to allow non-empty boards (game-design choice)
 */
function insertDecoys(level: BlastLevel, spec: ChainLevelSpec, seed: number): BlastLevel | null {
  if (spec.decoyTiles <= 0) return level;
  // For now, decoys cannot be placed reliably. Return null.
  return null;
}
