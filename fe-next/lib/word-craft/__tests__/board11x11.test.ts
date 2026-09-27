import { describe, expect, it } from 'vitest';
import { createBoard, getCell } from '../board';

describe('createBoard(11)', () => {
  it('creates an 11x11 board', () => {
    const board = createBoard(11);
    expect(board.cells.length).toBe(11);
    expect(board.cells[0].length).toBe(11);
  });

  it('has a center cell at (5,5)', () => {
    const board = createBoard(11);
    expect(getCell(board, 5, 5).premium).toBeNull();
  });

  it('has 4-way mirror symmetry on premiums', () => {
    const board = createBoard(11);
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        const p = getCell(board, r, c).premium;
        const mirror = getCell(board, 10 - r, 10 - c).premium;
        expect(mirror).toBe(p);
      }
    }
  });

  it('has at least 4 TW squares (corner-distance)', () => {
    const board = createBoard(11);
    let twCount = 0;
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        if (getCell(board, r, c).premium === 'TW') twCount++;
      }
    }
    expect(twCount).toBeGreaterThanOrEqual(4);
  });

  it('total premium count between 10 and 16', () => {
    const board = createBoard(11);
    let count = 0;
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        if (getCell(board, r, c).premium) count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(16);
  });
});
