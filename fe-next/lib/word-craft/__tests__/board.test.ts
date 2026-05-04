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
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(14, 14)).toBe(true);
    expect(isInBounds(7, 7)).toBe(true);
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(0, 15)).toBe(false);
    expect(isInBounds(15, 7)).toBe(false);
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
    expect(getPremium(CENTER, CENTER)).toBe('DW');
  });

  it('all four corners are TW', () => {
    expect(getPremium(0, 0)).toBe('TW');
    expect(getPremium(0, 14)).toBe('TW');
    expect(getPremium(14, 0)).toBe('TW');
    expect(getPremium(14, 14)).toBe('TW');
  });

  it('edge midpoints (0,7), (7,0), (7,14), (14,7) are TW', () => {
    expect(getPremium(0, 7)).toBe('TW');
    expect(getPremium(7, 0)).toBe('TW');
    expect(getPremium(7, 14)).toBe('TW');
    expect(getPremium(14, 7)).toBe('TW');
  });

  it('inner DW diagonal: (1,1), (2,2), (3,3), (4,4) all DW', () => {
    expect(getPremium(1, 1)).toBe('DW');
    expect(getPremium(2, 2)).toBe('DW');
    expect(getPremium(3, 3)).toBe('DW');
    expect(getPremium(4, 4)).toBe('DW');
  });

  it('TL squares at (1,5), (1,9), (5,1), (5,5), (5,9), (5,13)', () => {
    expect(getPremium(1, 5)).toBe('TL');
    expect(getPremium(1, 9)).toBe('TL');
    expect(getPremium(5, 1)).toBe('TL');
    expect(getPremium(5, 5)).toBe('TL');
    expect(getPremium(5, 9)).toBe('TL');
    expect(getPremium(5, 13)).toBe('TL');
  });

  it('DL squares include (0,3), (0,11), (3,0), (3,7), (3,14)', () => {
    expect(getPremium(0, 3)).toBe('DL');
    expect(getPremium(0, 11)).toBe('DL');
    expect(getPremium(3, 0)).toBe('DL');
    expect(getPremium(3, 7)).toBe('DL');
    expect(getPremium(3, 14)).toBe('DL');
  });

  it('layout is rotationally symmetric: premium(r,c) === premium(14-r, 14-c)', () => {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(getPremium(r, c)).toBe(getPremium(14 - r, 14 - c));
      }
    }
  });

  it('plain squares (no premium) return null — e.g. (0,1), (1,0)', () => {
    expect(getPremium(0, 1)).toBeNull();
    expect(getPremium(1, 0)).toBeNull();
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
