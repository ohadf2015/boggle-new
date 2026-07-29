/**
 * Tests for blastMatch3Detector — finds 3+ identical adjacent letters
 * in rows/columns for Candy Crush-style cascade auto-clears.
 */
import { detectMatch3Clusters, type Match3Cluster } from '../blastMatch3Detector';
import type { BlastTileState } from '../../types';

function makeTileStates(rows: number, cols: number, cleared?: Set<string>): BlastTileState[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      type: 'standard' as const,
      row: r,
      col: c,
      isCleared: cleared?.has(`${r}-${c}`) ?? false,
      hitsRemaining: 0,
    })),
  );
}

describe('detectMatch3Clusters', () => {
  it('finds a horizontal cluster of 3 identical letters', () => {
    const grid = [
      ['A', 'A', 'A', 'B'],
      ['C', 'D', 'E', 'F'],
    ];
    const tiles = makeTileStates(2, 4);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(1);
    expect(result[0].letter).toBe('A');
    expect(result[0].cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    expect(result[0].direction).toBe('horizontal');
  });

  it('finds a vertical cluster of 3 identical letters', () => {
    const grid = [
      ['A', 'B'],
      ['A', 'C'],
      ['A', 'D'],
      ['E', 'F'],
    ];
    const tiles = makeTileStates(4, 2);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(1);
    expect(result[0].letter).toBe('A');
    expect(result[0].direction).toBe('vertical');
    expect(result[0].cells).toHaveLength(3);
  });

  it('finds clusters of 4+ identical letters', () => {
    const grid = [
      ['A', 'A', 'A', 'A'],
    ];
    const tiles = makeTileStates(1, 4);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(1);
    expect(result[0].cells).toHaveLength(4);
  });

  it('skips cleared tiles (breaks runs)', () => {
    const grid = [
      ['A', 'A', 'A', 'A'],
    ];
    const cleared = new Set(['0-1']);
    const tiles = makeTileStates(1, 4, cleared);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(0);
  });

  it('finds multiple clusters in different rows', () => {
    const grid = [
      ['A', 'A', 'A', 'B'],
      ['C', 'D', 'D', 'D'],
    ];
    const tiles = makeTileStates(2, 4);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(2);
  });

  it('finds both horizontal and vertical clusters', () => {
    const grid = [
      ['A', 'B', 'B', 'B'],
      ['A', 'C', 'D', 'E'],
      ['A', 'F', 'G', 'H'],
    ];
    const tiles = makeTileStates(3, 4);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(2);
    const dirs = result.map(c => c.direction).sort();
    expect(dirs).toEqual(['horizontal', 'vertical']);
  });

  it('returns empty array when no clusters exist', () => {
    const grid = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
    ];
    const tiles = makeTileStates(2, 3);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const grid = [
      ['a', 'A', 'a'],
    ];
    const tiles = makeTileStates(1, 3);
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(1);
  });

  it('only scans affected columns when provided', () => {
    const grid = [
      ['A', 'B'],
      ['A', 'B'],
      ['A', 'B'],
    ];
    const tiles = makeTileStates(3, 2);
    // Only scan column 0
    const result = detectMatch3Clusters(grid, tiles, new Set([0]));

    expect(result).toHaveLength(1);
    expect(result[0].letter).toBe('A');
  });

  it('handles empty grid', () => {
    const result = detectMatch3Clusters([], []);
    expect(result).toHaveLength(0);
  });

  it('skips frozen tiles', () => {
    const grid = [
      ['A', 'A', 'A'],
    ];
    const tiles = makeTileStates(1, 3);
    tiles[0][1].type = 'frozen';
    const result = detectMatch3Clusters(grid, tiles);

    expect(result).toHaveLength(0);
  });
});
