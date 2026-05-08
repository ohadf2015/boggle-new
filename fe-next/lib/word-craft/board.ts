import type { PlacedTile, PremiumKind } from './types';

export const BOARD_SIZE = 15;
export const CENTER = 7;

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

export interface BoardCell {
  premium: PremiumKind | null;
  tile: PlacedTile | null;
}

export interface Board {
  cells: BoardCell[][];
}

function getPremiumForSize(row: number, col: number, size: 13 | 15): PremiumKind | null {
  if (size === 13) {
    if (row < 0 || row >= 13 || col < 0 || col >= 13) return null;
    return CHAR_TO_PREMIUM[PREMIUM_LAYOUT_13[row][col]] ?? null;
  }
  if (row < 0 || row >= 15 || col < 0 || col >= 15) return null;
  return CHAR_TO_PREMIUM[PREMIUM_LAYOUT_15[row][col]] ?? null;
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getPremium(row: number, col: number): PremiumKind | null {
  if (!isInBounds(row, col)) return null;
  return CHAR_TO_PREMIUM[PREMIUM_LAYOUT_15[row][col]] ?? null;
}

export function createBoard(size: 13 | 15 = 15): Board {
  if (size !== 13 && size !== 15) {
    throw new Error(`Board size must be 13 or 15, got ${size}`);
  }

  const cells: BoardCell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({ premium: getPremiumForSize(r, c, size), tile: null });
    }
    cells.push(row);
  }
  return { cells };
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
  const size = board.cells.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < board.cells[r].length; c++) {
      if (board.cells[r][c].tile) return false;
    }
  }
  return true;
}
