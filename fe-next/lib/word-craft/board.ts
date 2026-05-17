import type { PlacedTile, PremiumKind } from './types';

// 7x7 board for run mode (phones) with 4-way mirror symmetry
export const PREMIUM_LAYOUT_7: readonly string[] = [
  'T..d..T',
  '.D...D.',
  '..t.t..',
  'd..*..d',
  '..t.t..',
  '.D...D.',
  'T..d..T',
] as const;

// 9x9 board for run mode (tablets) with 4-way mirror symmetry
export const PREMIUM_LAYOUT_9: readonly string[] = [
  'T...D...T',
  '.d.....d.',
  '..t...t..',
  '...D.D...',
  'D...*...D',
  '...D.D...',
  '..t...t..',
  '.d.....d.',
  'T...D...T',
] as const;

// 11x11 board with 4-way mirror symmetry across both axes.
// 4 corner TW, 4 DW (one per quadrant), 4 TL. Total ~12 premiums.
const PREMIUM_LAYOUT_11: readonly string[] = [
  'T.........T',  // row 0
  '...........',  // row 1
  '..D.....D..',  // row 2
  '...........',  // row 3
  '.t.d...d.t.',  // row 4
  '.....*.....', // row 5: center at (5,5) = '*'
  '.t.d...d.t.',  // row 6
  '...........',  // row 7
  '..D.....D..',  // row 8
  '...........',  // row 9
  'T.........T',  // row 10
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

// 13x13 board with rotational symmetry (180 degree)
// Position (r,c) mirrors to (12-r, 12-c)
// Each row has exactly 13 characters
const PREMIUM_LAYOUT_13: readonly string[] = [
  'T..d....d..T.',  // row 0:  13 chars
  '.D...t.t...D.',  // row 1:  13 chars
  '..D...d...D..',  // row 2:  13 chars
  'd..D....D..d.',  // row 3:  13 chars
  '....D.D......',  // row 4:  13 chars
  '.t...t.t...t.',  // row 5:  13 chars
  '......*......',  // row 6:  13 chars
  '.t...t.t...t.',  // row 7:  13 chars
  '......D.D....',  // row 8:  13 chars
  '.d..D....D..d',  // row 9:  13 chars
  '..D...d...D..',  // row 10: 13 chars
  '.D...t.t...D.',  // row 11: 13 chars
  '.T..d....d..T',  // row 12: 13 chars
] as const;

const CHAR_TO_PREMIUM: Record<string, PremiumKind | null> = {
  T: 'TW',
  D: 'DW',
  t: 'TL',
  d: 'DL',
  '.': null,
  '*': null, // CENTER - no premium
};

export type BoardSize = 7 | 9 | 11 | 13 | 15;

const LAYOUTS: Record<BoardSize, readonly string[]> = {
  7: PREMIUM_LAYOUT_7,
  9: PREMIUM_LAYOUT_9,
  11: PREMIUM_LAYOUT_11,
  13: PREMIUM_LAYOUT_13,
  15: PREMIUM_LAYOUT_15,
};

export type CellOwner = 'player' | 'bot' | null;

export interface BoardCell {
  premium: PremiumKind | null;
  tile: PlacedTile | null;
  claim?: CellOwner;
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
  if (size !== 7 && size !== 9 && size !== 11 && size !== 13 && size !== 15) {
    throw new Error(`Board size must be 7, 9, 11, 13, or 15, got ${size}`);
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

// Backward compat: kept for legacy callers. New code should read `board.size`.
export const BOARD_SIZE = 15;
export const CENTER = 7;

// Board-size-relative center. The star square — and the first-move
// requirement to cover it — sits at the true middle of the grid, which is
// (5,5) on 11x11, (6,6) on 13x13, (7,7) on 15x15. The legacy `CENTER = 7`
// constant only matches 15x15; new code MUST use this.
export function getCenter(size: BoardSize): number {
  return Math.floor(size / 2);
}
