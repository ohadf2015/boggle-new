import type { PlacedTile, PremiumKind } from './types';

export const BOARD_SIZE = 15;
export const CENTER = 7;

const PREMIUM_LAYOUT: readonly string[] = [
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

const CHAR_TO_PREMIUM: Record<string, PremiumKind | null> = {
  T: 'TW',
  D: 'DW',
  t: 'TL',
  d: 'DL',
  '.': null,
};

export interface BoardCell {
  premium: PremiumKind | null;
  tile: PlacedTile | null;
}

export interface Board {
  cells: BoardCell[][];
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getPremium(row: number, col: number): PremiumKind | null {
  if (!isInBounds(row, col)) return null;
  return CHAR_TO_PREMIUM[PREMIUM_LAYOUT[row][col]] ?? null;
}

export function createBoard(): Board {
  const cells: BoardCell[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({ premium: getPremium(r, c), tile: null });
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
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.cells[r][c].tile) return false;
    }
  }
  return true;
}
