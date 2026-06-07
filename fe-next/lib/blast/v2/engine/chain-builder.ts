import type { BlastColumn, BlastLevel, CellId, ChainLevelSpec, Letter, Locale } from '../types';
import { cellId } from './cell-id';
import { scanFormableThemeWords } from './word-scan';
import { validateChainLevel } from './chain-validator';
import { findExtraWords } from './extra-word-check';
import { LOCALE_CONFIGS } from '../locale-config';
import { columnHeightRangeForLevel } from '../generator/silhouette';

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

/**
 * Column-height ceiling for placement balance. Without this, three or four
 * vertical inserts can land in the same column and produce a tower-shaped
 * board (8+ tiles in one column, the rest near-empty). The ceiling forces
 * vertical placements to spread across columns so the silhouette stays
 * playable on phones.
 */
function columnHeightCeiling(chain: string[]): number {
  const longest = Math.max(...chain.map((w) => [...w].length));
  // longest + 1 allows ONE word's worth of vertical insertion to land on top
  // of a horizontal placement of the same word's length without breaking
  // chains where two long words MUST share a column. Tighter than +0 would
  // make many he/lvl chains unsolvable; looser than +1 brings back the tower.
  return longest + 1;
}

function maxColumnHeight(level: BlastLevel): number {
  let max = 0;
  for (const col of level.columns) {
    if (col.tiles.length > max) max = col.tiles.length;
  }
  return max;
}

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
  heightCeiling?: number,
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
    // Height balance check — reject placements that produce a column taller
    // than the chain's ceiling so boards stay spread instead of stacked.
    if (heightCeiling !== undefined && maxColumnHeight(level) > heightCeiling) {
      continue;
    }
    const matches = scanFormableThemeWords(level, [word, ...otherWordsOnBoard], locale);
    const formableWords = new Set(matches.map((m) => m.word));
    const wordPlacements = matches.filter((m) => m.word === word).length;

    // Success: only `word` is formable, no unintended common words appear,
    // and (for words ≥3 letters) exactly one placement so the validator's
    // strict chain check passes. Two-letter words are exempt — duplicate
    // 2-letter sequences are unavoidable on narrow grids and still resolve
    // unambiguously in play.
    const placementOK = [...word].length >= 3 ? wordPlacements === 1 : wordPlacements >= 1;
    if (
      formableWords.size === 1 &&
      formableWords.has(word) &&
      placementOK &&
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
  heightCeiling?: number,
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
  // Group candidates by resulting column height. Shorter-resulting columns
  // are tried first so vertical inserts spread across the board instead of
  // collapsing into a single tower (level 6 used to produce a 13-tall column
  // because random shuffling treated every column equally).
  const byHeight = new Map<number, Cand[]>();
  for (let c = 0; c < cols; c++) {
    const h = Sk.columns[c]!.tiles.length;
    if (heightCeiling !== undefined && h + L > heightCeiling) continue;
    const resulting = h + L;
    const bucket = byHeight.get(resulting) ?? [];
    for (let r = 0; r <= h; r++) bucket.push({ c, r });
    byHeight.set(resulting, bucket);
  }
  const sortedHeights = [...byHeight.keys()].sort((a, b) => a - b);
  for (const h of sortedHeights) {
    candidates.push(...shuffle(byHeight.get(h)!, rand));
  }
  const shuffled = candidates;

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
    if (heightCeiling !== undefined && maxColumnHeight(level) > heightCeiling) {
      continue;
    }
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

// Bumped 500 → 2000 because (a) the column-height ceiling rejects a larger
// share of candidate placements, and (b) sophisticated 8–9-word chains
// (L26–L30) need deeper search to find a fully-isolated forced ordering.
// The build is offline (resolve runs server-side then is cached), so a
// pessimistic attempt budget costs nothing at runtime.
// Bumped again 2000 → 3000 for the 5-col phone-friendly silhouette where
// horizontal placements are scarce (a 5-letter word only fits at cols 0-4)
// and vertical isolation chains take longer to converge. Cap kept moderate so
// the solvability verifier completes in reasonable time during CI.
const MAX_BUILD_ATTEMPTS = 3000;

function emptyColumns(count: number): BlastColumn[] {
  return Array.from({ length: count }, (_, index) => ({ index, tiles: [] as Letter[] }));
}

/**
 * S_N: the last word as the starting board. Lays flat horizontally if it fits;
 * stacks vertically in one column when the word is longer than the grid width
 * (the 5-col phone-friendly silhouette ships levels with 6–7-letter floor words
 * that must drop in as a single tower). Vertical letters are pushed in reverse
 * because word-scan reads columns top-down.
 */
function floorBoard(spec: ChainLevelSpec): BlastLevel | null {
  const last = [...(spec.chain[spec.chain.length - 1] ?? '')];
  if (last.length === 0 || spec.columns < 1) return null;
  const columns = emptyColumns(spec.columns);
  if (last.length <= spec.columns) {
    const offset = Math.floor((spec.columns - last.length) / 2);
    last.forEach((ch, i) => columns[offset + i]!.tiles.push(ch));
  } else {
    // Vertical floor: stack the word in the center column. Letters land so the
    // FIRST letter sits on top (tiles[L-1]) and the LAST letter sits on the
    // floor (tiles[0]) — word-scan reads top-down, so the natural order spells
    // the word.
    const colIdx = Math.floor(spec.columns / 2);
    for (let i = last.length - 1; i >= 0; i--) {
      columns[colIdx]!.tiles.push(last[i]!);
    }
  }
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
  maxAttempts: number = MAX_BUILD_ATTEMPTS,
): BlastLevel | null {
  if (spec.columns < 1) return null;
  const longest = Math.max(...spec.chain.map((w) => [...w].length));
  // Phone-friendly silhouettes use cols=5 — long words still pass because
  // insertWordVertical can stack them as a single tower; floorBoard does the
  // same for the floor word. Reject only if the word is wider than what BOTH
  // axes could hold (a 1×1 grid can't hold a 2-letter word).

  const rand = rng(seed);
  // Narrow-grid relief: 5-col boards leave less horizontal room, so allow
  // headroom above columnHeightCeiling — but never as loose as totalTiles
  // (which let level 6's 19-letter chain collapse into a 13-tall single
  // column). Cap at average-tiles-per-column + 3 so the placer has room
  // without permitting tower silhouettes.
  const totalTiles = spec.chain.reduce((sum, w) => sum + [...w].length, 0);
  const avgPerCol = Math.ceil(totalTiles / spec.columns);
  // Loose hard cap is still totalTiles (placer needs every row for dense HE
  // chains), but the height-bucketed candidate order in insertWordVertical
  // pushes the realized silhouette toward spread, not tower.
  const narrowCeiling = totalTiles;
  const ceiling = spec.columns <= 5
    ? narrowCeiling
    : Math.max(longest + 1, columnHeightCeiling(spec.chain));
  // Tower control on phone (≤5 col) boards. The OLD cap `max(longest+2, avg+4)`
  // let dense chains realize 9–10 tall towers (founder report: a [9,7,3,2]
  // silhouette on level 17). We TIGHTEN to `max(longest+1, avg+2)` and return
  // the FIRST build under it — keeping the orientation coin-flip's row/column
  // variety (don't pancake the board flat, which kills visual interest) and the
  // original ~few-attempt speed. The legacy loose cap survives only as a
  // fallback so a hard-to-place dense chain still builds rather than returning
  // null. A forced tall word (longest≥cols) is height==longest ≤ longest+1, so
  // the tight cap is always reachable — no full-budget scan.
  const tightCap = Math.max(longest + 1, avgPerCol + 2);
  const looseCap = Math.max(longest + 2, avgPerCol + 4);
  // How long to chase the tight cap before settling for the first loose build.
  const TIGHT_SEARCH_BUDGET = 60;
  let looseFallback: BlastLevel | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = Math.floor(rand() * 0xffffffff) || 1;
    const base = floorBoard(spec);
    if (!base) return null;

    let board = base;
    let ok = true;
    // Coin-flip per step to pick orientation; fall back to the other axis if
    // the chosen one can't isolate the word. This produces visually mixed
    // levels — some words land as rows, others stack as columns — instead of
    // every board being a flat horizontal scroll.
    // Bias toward horizontal placements (0.65) so vertical stacks don't pile
    // up into a single tower; the column-height ceiling enforces the same
    // intent but the bias prevents wasted rejection cycles.
    const orientRand = rng(attemptSeed ^ 0xa5a5a5a5);
    for (let k = spec.chain.length - 2; k >= 0; k--) {
      const word = spec.chain[k]!;
      const others = spec.chain.slice(k + 1);
      const stepSeed = (attemptSeed + k * 7919) >>> 0;
      // Words longer than the grid width can only be placed vertically — no
      // need to try horizontal. The fallback is also skipped (would always
      // fail with `L > cols`).
      const tooWideForHorizontal = [...word].length > spec.columns;
      // Narrow grids (≤5 cols) bias toward vertical placement — horizontal
      // slots are scarce and most words need to stack to leave room for
      // others. Wider grids keep the original 35% vertical bias.
      const verticalBias = spec.columns <= 5 ? 0.7 : 0.35;
      const preferVertical = tooWideForHorizontal || orientRand() < verticalBias;
      const first = preferVertical
        ? insertWordVertical(board, word, others, spec.locale, stepSeed, extraWordCheck, ceiling)
        : insertWord(board, word, others, spec.locale, stepSeed, extraWordCheck, ceiling);
      const res = first ?? (tooWideForHorizontal
        ? null
        : preferVertical
          ? insertWord(board, word, others, spec.locale, stepSeed, extraWordCheck, ceiling)
          : insertWordVertical(board, word, others, spec.locale, stepSeed, extraWordCheck, ceiling));
      if (!res) {
        ok = false;
        break;
      }
      board = res.level;
    }
    if (!ok) continue;

    const withDecoys = insertDecoys(board, spec, attemptSeed);
    if (!withDecoys) continue;

    // Wider grids (>5 cols) and chains with a word wider than the grid
    // (longest > cols) keep the original first-valid behavior. Applying the cap
    // to longest>cols makes those dense chains UNBUILDABLE on 5 cols (he L14/L24
    // contain גלקסיה/6 letters → no arrangement fits under the cap → null). The
    // real fix for those is content (shorten the long word so longest ≤ cols,
    // which then re-engages the cap) — see he pack-chain.json L14/L24.
    if (spec.columns > 5 || longest > spec.columns) return withDecoys;

    const height = maxColumnHeight(withDecoys);
    if (height <= tightCap) return withDecoys; // phone-friendly — ship immediately
    if (height <= looseCap) {
      // Acceptable under the legacy cap. Hold the FIRST such build (same choice
      // the original made) and keep looking a little longer for a tighter one;
      // after the budget, ship it. Bounds work so dense chains never trigger the
      // full MAX_BUILD_ATTEMPTS scan (the 3-minute regression).
      if (looseFallback === null) looseFallback = withDecoys;
      if (attempt >= TIGHT_SEARCH_BUDGET) return looseFallback;
    }
    // height > looseCap → reject, exactly like the original tower filter (may end
    // up returning null and letting the caller fall back to another source).
  }
  return looseFallback;
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
