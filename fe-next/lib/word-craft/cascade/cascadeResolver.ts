import type { TileBag } from '../tileBag';
import { applyGravity, burnCells } from './burnAndGravity';
import { cellAt, type CascadeGrid } from './boardGrid';

export type CascadeAxis = 'row' | 'column';

export interface CascadeMatch {
  word: string;
  path: string[];
  axis: CascadeAxis;
}

const MIN_AUTO_LEN = 4;

export type IsWord = (word: string) => boolean;

/**
 * Scan rows and columns of the grid for contiguous letter runs of length
 * ≥ MIN_AUTO_LEN. For each starting cell, pick the longest valid word.
 * Returns non-overlapping matches (greedy left-to-right, top-to-bottom).
 */
export function findAutoWords(grid: CascadeGrid, isWord: IsWord): CascadeMatch[] {
  const matches: CascadeMatch[] = [];
  const claimed = new Set<string>();

  const scanRun = (
    letters: string[],
    ids: string[],
    axis: CascadeAxis
  ): void => {
    const n = letters.length;
    let start = 0;
    while (start < n) {
      // Skip null cells (already burned)
      if (letters[start] === '\0') {
        start++;
        continue;
      }
      // Find the longest contiguous non-null run starting here
      let runEnd = start;
      while (runEnd < n && letters[runEnd] !== '\0') runEnd++;
      // Within run [start..runEnd-1], find longest valid word greedy
      let i = start;
      while (i < runEnd) {
        if (claimed.has(ids[i])) {
          i++;
          continue;
        }
        let bestLen = 0;
        let bestWord = '';
        for (let len = MIN_AUTO_LEN; i + len <= runEnd; len++) {
          const slice = letters.slice(i, i + len);
          if (slice.some((s) => claimed.has(ids[i + (slice.indexOf(s))]))) {
            // Skip if any claimed mid-slice (rare edge — only at boundaries)
          }
          const w = slice.join('');
          if (isWord(w)) {
            bestLen = len;
            bestWord = w;
          }
        }
        if (bestLen >= MIN_AUTO_LEN) {
          const pathIds = ids.slice(i, i + bestLen);
          if (pathIds.every((id) => !claimed.has(id))) {
            matches.push({ word: bestWord, path: pathIds, axis });
            for (const id of pathIds) claimed.add(id);
            i += bestLen;
            continue;
          }
        }
        i++;
      }
      start = runEnd + 1;
    }
  };

  // Rows
  for (let r = 0; r < grid.rows; r++) {
    const letters: string[] = [];
    const ids: string[] = [];
    for (let c = 0; c < grid.cols; c++) {
      const cell = cellAt(grid, r, c)!;
      letters.push(cell.letter === null ? '\0' : cell.letter);
      ids.push(cell.id);
    }
    scanRun(letters, ids, 'row');
  }

  // Columns
  for (let c = 0; c < grid.cols; c++) {
    const letters: string[] = [];
    const ids: string[] = [];
    for (let r = 0; r < grid.rows; r++) {
      const cell = cellAt(grid, r, c)!;
      letters.push(cell.letter === null ? '\0' : cell.letter);
      ids.push(cell.id);
    }
    scanRun(letters, ids, 'column');
  }

  return matches;
}

export interface ResolveCascadeOpts {
  maxDepth?: number;
}

export interface ResolveCascadeResult {
  finalGrid: CascadeGrid;
  chains: CascadeMatch[][];
}

const DEFAULT_MAX_DEPTH = 10;

/**
 * Iteratively detect auto-words in `grid`, burn them, apply gravity, and
 * repeat until no auto-words remain or maxDepth is reached. Returns the
 * final grid and an array of "chains" — one entry per cascade level.
 */
export function resolveCascade(
  grid: CascadeGrid,
  bag: TileBag,
  isWord: IsWord,
  opts: ResolveCascadeOpts = {}
): ResolveCascadeResult {
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const chains: CascadeMatch[][] = [];
  let current = grid;

  for (let depth = 0; depth < maxDepth; depth++) {
    const matches = findAutoWords(current, isWord);
    if (matches.length === 0) {
      // Still apply gravity once at depth 0 if any cell is null — covers
      // initial post-burn state coming from a manual swipe.
      if (depth === 0) {
        const hasHole = current.cells.some((c) => c.letter === null);
        if (hasHole) {
          current = applyGravity(current, bag).grid;
        }
      }
      break;
    }
    chains.push(matches);
    // Burn all matched cells, then gravity
    const ids: string[] = [];
    for (const m of matches) ids.push(...m.path);
    current = burnCells(current, ids);
    current = applyGravity(current, bag).grid;
  }

  return { finalGrid: current, chains };
}
