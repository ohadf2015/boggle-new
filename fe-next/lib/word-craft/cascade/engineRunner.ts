import type { TileBag } from '../tileBag';
import { burnCells, applyGravity } from './burnAndGravity';
import { findAutoWords } from './cascadeResolver';
import { cellAt, type CascadeGrid } from './boardGrid';

const DEFAULT_MAX_CHAINS = 10;

export interface BurnAndCascadeArgs {
  grid: CascadeGrid;
  bag: TileBag;
  /** Cells burned by the manual swipe (plus optional Pyro extra). */
  initialBurnIds: string[];
  isWord: (word: string) => boolean;
  /**
   * Scoring callback. chainIdx starts at 2 for the FIRST auto-cascade
   * (the manual swipe is chain 1, scored by the caller).
   */
  scoreChain: (letters: string[], values: number[], chainIdx: number) => number;
  maxChains?: number;
}

export interface BurnAndCascadeResult {
  finalGrid: CascadeGrid;
  chainWords: string[];
  chainScores: number[];
}

/**
 * Apply the manual burn, gravity, then iteratively detect auto-words,
 * burn+gravity again, scoring each cascade level until no more matches
 * or maxChains reached.
 */
export function burnAndCascadeAround(args: BurnAndCascadeArgs): BurnAndCascadeResult {
  const maxChains = args.maxChains ?? DEFAULT_MAX_CHAINS;
  let grid = burnCells(args.grid, args.initialBurnIds);
  grid = applyGravity(grid, args.bag).grid;

  const chainWords: string[] = [];
  const chainScores: number[] = [];

  for (let chainIdx = 2; chainIdx <= maxChains + 1; chainIdx++) {
    const matches = findAutoWords(grid, args.isWord);
    if (matches.length === 0) break;

    for (const m of matches) {
      const letters: string[] = [];
      const values: number[] = [];
      for (const id of m.path) {
        const i = grid.index.get(id);
        if (i === undefined) continue;
        const cell = grid.cells[i];
        if (cell.letter === null) continue;
        letters.push(cell.letter);
        values.push(cell.value);
      }
      const score = args.scoreChain(letters, values, chainIdx);
      chainWords.push(m.word);
      chainScores.push(score);
    }

    const burnIds = matches.flatMap((m) => m.path);
    grid = burnCells(grid, burnIds);
    grid = applyGravity(grid, args.bag).grid;
  }

  return { finalGrid: grid, chainWords, chainScores };
}

/** Convenience: are all cells of `grid` non-null? */
export function isGridFull(grid: CascadeGrid): boolean {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (cellAt(grid, r, c)!.letter === null) return false;
    }
  }
  return true;
}
