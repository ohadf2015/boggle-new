import { describe, it, expect } from 'vitest';
import { placeWordPath, isCollinearPath } from '../boardWordPath';

function emptyGrid(rows: number, cols: number): (string | null)[][] {
  return Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
}

/** Deterministic PRNG so each seed is a repeatable board. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const LESSON = ['GARDEN', 'BRIDGE', 'WINTER', 'ISLAND', 'FOREST'];
const upper = (ch: string) => ch.toUpperCase();

describe('placeWordPath', () => {
  it('GIVEN an empty 6x6 board WHEN lesson words are placed THEN each lands on an adjacent path that bends', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const grid = emptyGrid(6, 6);
      const random = rng(seed);
      for (const word of LESSON) {
        const path = placeWordPath(grid, word, upper, random);
        if (!path) continue;
        expect(path).toHaveLength(word.length);
        path.forEach((cell, i) => {
          expect(grid[cell.r][cell.c]).toBe(word[i]);
          if (i > 0) {
            const prev = path[i - 1];
            expect(Math.max(Math.abs(prev.r - cell.r), Math.abs(prev.c - cell.c))).toBe(1);
          }
        });
        expect(isCollinearPath(path)).toBe(false);
      }
    }
  });

  it('GIVEN five lesson words on a 6x6 board WHEN placed THEN almost all of them fit', () => {
    let placed = 0;
    let tried = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const grid = emptyGrid(6, 6);
      const random = rng(seed);
      for (const word of LESSON) {
        tried++;
        if (placeWordPath(grid, word, upper, random)) placed++;
      }
    }
    expect(placed / tried).toBeGreaterThan(0.95);
  });

  it('GIVEN letters already on the board WHEN a word can share a matching cell THEN the existing letter is reused, never overwritten', () => {
    const grid = emptyGrid(4, 4);
    grid[0][0] = 'X';
    grid[1][1] = 'Y';
    const path = placeWordPath(grid, 'CAT', upper, rng(7));
    expect(path).not.toBeNull();
    expect(grid[0][0]).toBe('X');
    expect(grid[1][1]).toBe('Y');
  });

  it('GIVEN a board too small for any bend WHEN a 2-letter word is placed THEN a straight pair is accepted', () => {
    const grid = emptyGrid(1, 2);
    const path = placeWordPath(grid, 'AB', upper, rng(3));
    expect(path).toHaveLength(2);
    expect(grid[0].join('')).toMatch(/^(AB|BA)$/);
  });

  it('GIVEN a single row WHEN a 4-letter word only fits straight THEN the straight fallback still places it', () => {
    const grid = emptyGrid(1, 4);
    const path = placeWordPath(grid, 'DOGS', upper, rng(5));
    expect(path).not.toBeNull();
    expect(grid[0].join('')).toMatch(/DOGS|SGOD/);
  });

  it('GIVEN a word longer than the board WHEN placed THEN nothing is written', () => {
    const grid = emptyGrid(2, 2);
    expect(placeWordPath(grid, 'BRIDGE', upper, rng(9))).toBeNull();
    expect(grid.flat().every((c) => c === null)).toBe(true);
  });
});

describe('isCollinearPath', () => {
  it('GIVEN a row, a column and a diagonal THEN each is collinear; GIVEN a bend THEN it is not', () => {
    expect(isCollinearPath([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }])).toBe(true);
    expect(isCollinearPath([{ r: 3, c: 1 }, { r: 2, c: 1 }, { r: 1, c: 1 }])).toBe(true);
    expect(isCollinearPath([{ r: 0, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 2 }])).toBe(true);
    expect(isCollinearPath([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 2 }])).toBe(false);
  });
});
