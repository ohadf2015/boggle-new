// Crossword mode — shared types (pure data model).
// Solutions are stored NORMALIZED (Hebrew: non-sofit form). Final-letter forms are applied
// only at the render boundary. See docs/2026-06-06-crossword-mode-spec.md.

export type PuzzleLocale = 'en' | 'he' | 'es' | 'sv' | 'ja';

export type Direction = 'across' | 'down';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** A single grid cell. Block cells are the dark squares; they hold no letter. */
export interface Cell {
  row: number;
  col: number;
  /** true = block (dark square, not fillable). */
  block: boolean;
  /** Normalized solution letter for non-block cells; '' for blocks. */
  solution: string;
  /** Grid number shown in the cell, if it starts an across and/or down word; null otherwise. */
  number: number | null;
}

/** A numbered word run (across or down). */
export interface Slot {
  id: string; // e.g. "A1" | "D3"
  dir: Direction;
  number: number; // the grid number at the start cell
  row: number; // start cell (LTR across: leftmost; RTL across: rightmost; down: topmost)
  col: number;
  length: number;
  /** Ordered cell coordinates from the slot's start to its end. */
  cells: ReadonlyArray<{ row: number; col: number }>;
  /** Normalized solution word for the slot. */
  answer: string;
  /** Localized clue (build-time generated, admin-QA'd). Empty until clued. */
  clue: string;
}

/** A fully-built, playable crossword puzzle. */
export interface CrosswordPuzzle {
  id: string; // e.g. "en-mini-001"
  locale: PuzzleLocale;
  size: number; // grid is size x size
  rtl: boolean; // he -> true (across runs right-to-left)
  cells: Cell[]; // size*size, row-major
  slots: Slot[];
  difficulty: Difficulty;
  source: 'authored' | 'generated';
}

/**
 * Authoring input for buildGrid(): the raw solution layout.
 * solution[row][col] = a single letter for a fillable cell, or null for a block.
 * Across direction is determined by `rtl`.
 */
export interface GridLayout {
  rtl: boolean;
  /** Square matrix. null = block. Letters should already be normalized for the locale. */
  solution: ReadonlyArray<ReadonlyArray<string | null>>;
}

export interface BuiltGrid {
  size: number;
  cells: Cell[];
  slots: Slot[];
}

/** Player progress, persisted to localStorage for resume + offline play. */
export interface CrosswordProgress {
  puzzleId: string;
  /** entries keyed by "row,col" -> player's letter ('' / absent = empty). */
  entries: Record<string, string>;
  status: 'playing' | 'solved';
  startedAt: number;
  elapsedMs: number;
  /** cells revealed via a hint (kept honest for any future scoring). */
  revealedCells: string[];
}
