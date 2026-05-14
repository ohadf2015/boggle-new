import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE,
  CENTER,
  createBoard,
  getPremium,
  getCell,
  placeTiles,
  isFirstMove,
  isInBounds,
  PREMIUM_LAYOUT_7,
  PREMIUM_LAYOUT_9,
} from '../board';
import type { PlacedTile } from '../types';

const tile = (row: number, col: number, letter: string, value: number): PlacedTile => ({
  row,
  col,
  letter,
  value,
  isBlank: letter === '_',
  rackTileId: `t-${row}-${col}`,
});

describe('board geometry', () => {
  it('BOARD_SIZE is 15', () => {
    expect(BOARD_SIZE).toBe(15);
  });

  it('CENTER is index 7', () => {
    expect(CENTER).toBe(7);
  });

  it('isInBounds true within grid, false outside', () => {
    const board = createBoard();
    expect(isInBounds(0, 0, board)).toBe(true);
    expect(isInBounds(14, 14, board)).toBe(true);
    expect(isInBounds(7, 7, board)).toBe(true);
    expect(isInBounds(-1, 0, board)).toBe(false);
    expect(isInBounds(0, 15, board)).toBe(false);
    expect(isInBounds(15, 7, board)).toBe(false);
  });
});

describe('createBoard', () => {
  it('produces a 15x15 grid with no placed tiles', () => {
    const board = createBoard();
    expect(board.cells.length).toBe(15);
    expect(board.cells[0].length).toBe(15);
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(board.cells[r][c].tile).toBeNull();
      }
    }
  });

  it('isFirstMove is true on a fresh board', () => {
    expect(isFirstMove(createBoard())).toBe(true);
  });
});

describe('premium square layout (canonical Scrabble)', () => {
  it('center (7,7) is DW', () => {
    const board = createBoard();
    expect(getPremium(CENTER, CENTER, board)).toBe('DW');
  });

  it('all four corners are TW', () => {
    const board = createBoard();
    expect(getPremium(0, 0, board)).toBe('TW');
    expect(getPremium(0, 14, board)).toBe('TW');
    expect(getPremium(14, 0, board)).toBe('TW');
    expect(getPremium(14, 14, board)).toBe('TW');
  });

  it('edge midpoints (0,7), (7,0), (7,14), (14,7) are TW', () => {
    const board = createBoard();
    expect(getPremium(0, 7, board)).toBe('TW');
    expect(getPremium(7, 0, board)).toBe('TW');
    expect(getPremium(7, 14, board)).toBe('TW');
    expect(getPremium(14, 7, board)).toBe('TW');
  });

  it('inner DW diagonal: (1,1), (2,2), (3,3), (4,4) all DW', () => {
    const board = createBoard();
    expect(getPremium(1, 1, board)).toBe('DW');
    expect(getPremium(2, 2, board)).toBe('DW');
    expect(getPremium(3, 3, board)).toBe('DW');
    expect(getPremium(4, 4, board)).toBe('DW');
  });

  it('TL squares at (1,5), (1,9), (5,1), (5,5), (5,9), (5,13)', () => {
    const board = createBoard();
    expect(getPremium(1, 5, board)).toBe('TL');
    expect(getPremium(1, 9, board)).toBe('TL');
    expect(getPremium(5, 1, board)).toBe('TL');
    expect(getPremium(5, 5, board)).toBe('TL');
    expect(getPremium(5, 9, board)).toBe('TL');
    expect(getPremium(5, 13, board)).toBe('TL');
  });

  it('DL squares include (0,3), (0,11), (3,0), (3,7), (3,14)', () => {
    const board = createBoard();
    expect(getPremium(0, 3, board)).toBe('DL');
    expect(getPremium(0, 11, board)).toBe('DL');
    expect(getPremium(3, 0, board)).toBe('DL');
    expect(getPremium(3, 7, board)).toBe('DL');
    expect(getPremium(3, 14, board)).toBe('DL');
  });

  it('layout is rotationally symmetric: premium(r,c) === premium(14-r, 14-c)', () => {
    const board = createBoard();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(getPremium(r, c, board)).toBe(getPremium(14 - r, 14 - c, board));
      }
    }
  });

  it('plain squares (no premium) return null — e.g. (0,1), (1,0)', () => {
    const board = createBoard();
    expect(getPremium(0, 1, board)).toBeNull();
    expect(getPremium(1, 0, board)).toBeNull();
  });
});

describe('placeTiles', () => {
  it('fills cells and flips isFirstMove to false', () => {
    const board = createBoard();
    placeTiles(board, [tile(7, 7, 'C', 3), tile(7, 8, 'A', 1), tile(7, 9, 'T', 1)]);
    expect(getCell(board, 7, 7).tile?.letter).toBe('C');
    expect(getCell(board, 7, 8).tile?.letter).toBe('A');
    expect(getCell(board, 7, 9).tile?.letter).toBe('T');
    expect(isFirstMove(board)).toBe(false);
  });

  it('preserves the cell premium even after tile is placed', () => {
    const board = createBoard();
    placeTiles(board, [tile(7, 7, 'C', 3)]);
    expect(getCell(board, 7, 7).premium).toBe('DW');
  });
});

describe('small run-mode boards', () => {
  it('creates a 7x7 board with center at (3,3)', () => {
    const board = createBoard(7);
    expect(board.size).toBe(7);
    expect(board.cells.length).toBe(7);
    expect(board.cells[3].length).toBe(7);
  });

  it('creates a 9x9 board with center at (4,4)', () => {
    const board = createBoard(9);
    expect(board.size).toBe(9);
    expect(board.cells.length).toBe(9);
  });

  it('7x7 premium layout is 4-way mirror symmetric', () => {
    const L = PREMIUM_LAYOUT_7;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        expect(L[r][c]).toBe(L[r][6 - c]);
        expect(L[r][c]).toBe(L[6 - r][c]);
      }
    }
  });

  it('9x9 premium layout is 4-way mirror symmetric', () => {
    const L = PREMIUM_LAYOUT_9;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(L[r][c]).toBe(L[r][8 - c]);
        expect(L[r][c]).toBe(L[8 - r][c]);
      }
    }
  });
});
