/**
 * blastWordSeeder - Tests for seeded letter grid generation.
 * Validates: grid dimensions, deterministic output, word placement,
 * language support, edge cases.
 */

import { generateSeededLetterGrid } from '../utils/blastWordSeeder';

describe('generateSeededLetterGrid', () => {
  // ─── Grid dimensions ──────────────────────────────────────────────

  it('should return a grid of the requested size', () => {
    const grid = generateSeededLetterGrid(6, 'en', 42);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(6);
    }
  });

  it('should work with small grids (3x3)', () => {
    const grid = generateSeededLetterGrid(3, 'en', 99);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toHaveLength(3);
  });

  it('should work with large grids (10x10)', () => {
    const grid = generateSeededLetterGrid(10, 'en', 7);
    expect(grid).toHaveLength(10);
    expect(grid[0]).toHaveLength(10);
  });

  // ─── Cell content ─────────────────────────────────────────────────

  it('should fill every cell with a non-empty string', () => {
    const grid = generateSeededLetterGrid(6, 'en', 42);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        expect(grid[r][c]).toBeTruthy();
        expect(typeof grid[r][c]).toBe('string');
      }
    }
  });

  it('should produce uppercase English letters for en', () => {
    const grid = generateSeededLetterGrid(6, 'en', 42);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toMatch(/^[A-Z]$/);
      }
    }
  });

  // ─── Determinism ──────────────────────────────────────────────────

  it('should produce identical grids for the same seed', () => {
    const grid1 = generateSeededLetterGrid(6, 'en', 12345);
    const grid2 = generateSeededLetterGrid(6, 'en', 12345);
    expect(grid1).toEqual(grid2);
  });

  it('should produce different grids for different seeds', () => {
    const grid1 = generateSeededLetterGrid(6, 'en', 1);
    const grid2 = generateSeededLetterGrid(6, 'en', 2);
    // Extremely unlikely to be identical
    const flat1 = grid1.flat().join('');
    const flat2 = grid2.flat().join('');
    expect(flat1).not.toEqual(flat2);
  });

  // ─── Word placement ───────────────────────────────────────────────

  it('should place at least one known English seed word in the grid', () => {
    // Run with several seeds; at least one should contain a word
    const knownWords = [
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
      'SOME', 'THEN', 'GOOD', 'MAKE', 'LIKE', 'GAME', 'STAR', 'WORD',
    ];

    let foundAny = false;
    for (let seed = 0; seed < 5; seed++) {
      const grid = generateSeededLetterGrid(6, 'en', seed);
      if (gridContainsAnyWord(grid, knownWords)) {
        foundAny = true;
        break;
      }
    }
    expect(foundAny).toBe(true);
  });

  it('should skip words longer than the grid size', () => {
    // 3x3 grid can't fit 4+ letter words
    const grid = generateSeededLetterGrid(3, 'en', 42);
    expect(grid).toHaveLength(3);
    // Just verify it completes without error — no crash
  });

  // ─── Language support ─────────────────────────────────────────────

  it('should generate a grid for Hebrew', () => {
    const grid = generateSeededLetterGrid(6, 'he', 42);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBeTruthy();
      }
    }
  });

  it('should generate a grid for Swedish', () => {
    const grid = generateSeededLetterGrid(6, 'sv', 42);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBeTruthy();
      }
    }
  });

  it('should generate a grid for Japanese', () => {
    const grid = generateSeededLetterGrid(6, 'ja', 42);
    expect(grid).toHaveLength(6);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBeTruthy();
      }
    }
  });

  it('should fall back to English seed words for unknown languages', () => {
    const grid = generateSeededLetterGrid(6, 'xx' as 'en', 42);
    expect(grid).toHaveLength(6);
    // Should still produce a valid grid (falls back to en seed words)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBeTruthy();
      }
    }
  });
});

// ─── Helper ──────────────────────────────────────────────────────────

/** Check if any known word appears horizontally, vertically, or diagonally */
function gridContainsAnyWord(grid: string[][], words: string[]): boolean {
  const size = grid.length;
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1],
    [0, -1], [-1, 0],
  ];

  for (const word of words) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const [dr, dc] of directions) {
          let match = true;
          for (let i = 0; i < word.length; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (nr < 0 || nr >= size || nc < 0 || nc >= size || grid[nr][nc] !== word[i]) {
              match = false;
              break;
            }
          }
          if (match) return true;
        }
      }
    }
  }
  return false;
}
