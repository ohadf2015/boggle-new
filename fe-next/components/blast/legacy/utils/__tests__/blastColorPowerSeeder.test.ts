import { describe, it, expect } from 'vitest';
import { seedColorTags } from '../blastColorPowerSeeder';
import type { BlastTileState } from '@/shared/types/blast';

describe('blastColorPowerSeeder', () => {
  const createTile = (row: number, col: number, type: string = 'standard', uid?: string): BlastTileState => ({
    uid: uid || `tile-${row}-${col}`,
    row,
    col,
    type: type as any,
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
  });

  it('applies color tag to standard tiles at specified density', () => {
    const grid: BlastTileState[][] = [
      [createTile(0, 0), createTile(0, 1), createTile(0, 2), createTile(0, 3)],
      [createTile(1, 0), createTile(1, 1), createTile(1, 2), createTile(1, 3)],
      [createTile(2, 0), createTile(2, 1), createTile(2, 2), createTile(2, 3)],
    ];

    const result = seedColorTags(grid, 'pink', 0.5, 123);

    // Count tiles with colorTag
    let coloredCount = 0;
    for (const row of result) {
      for (const tile of row) {
        if (tile.colorTag === 'pink') coloredCount++;
      }
    }

    const totalTiles = grid.length * grid[0].length;
    const expectedCount = Math.round(totalTiles * 0.5);
    expect(Math.abs(coloredCount - expectedCount)).toBeLessThanOrEqual(2); // Allow small variance
  });

  it('skips special tiles (bombs, gold, etc)', () => {
    const grid: BlastTileState[][] = [
      [
        createTile(0, 0, 'standard'),
        createTile(0, 1, 'bomb'),
        createTile(0, 2, 'gold'),
        createTile(0, 3, 'standard'),
      ],
    ];

    const result = seedColorTags(grid, 'cyan', 1.0, 123); // Try to color everything

    expect(result[0][0].colorTag).toBe('cyan'); // standard → colored
    expect(result[0][1].colorTag).toBeUndefined(); // bomb → not colored
    expect(result[0][2].colorTag).toBeUndefined(); // gold → not colored
    expect(result[0][3].colorTag).toBe('cyan'); // standard → colored
  });

  it('skips obstacle tiles (ice, frozen)', () => {
    const grid: BlastTileState[][] = [
      [
        createTile(0, 0, 'standard'),
        createTile(0, 1, 'ice'),
        createTile(0, 2, 'frozen'),
        createTile(0, 3, 'standard'),
      ],
    ];

    const result = seedColorTags(grid, 'lime', 1.0, 123);

    expect(result[0][0].colorTag).toBe('lime'); // standard → colored
    expect(result[0][1].colorTag).toBeUndefined(); // ice → not colored
    expect(result[0][2].colorTag).toBeUndefined(); // frozen → not colored
    expect(result[0][3].colorTag).toBe('lime'); // standard → colored
  });

  it('produces deterministic results with same seed', () => {
    const grid: BlastTileState[][] = [
      [createTile(0, 0), createTile(0, 1), createTile(0, 2)],
      [createTile(1, 0), createTile(1, 1), createTile(1, 2)],
    ];

    const result1 = seedColorTags([...grid.map(r => [...r])], 'pink', 0.4, 456);
    const result2 = seedColorTags([...grid.map(r => [...r])], 'pink', 0.4, 456);

    for (let i = 0; i < result1.length; i++) {
      for (let j = 0; j < result1[i].length; j++) {
        expect(result1[i][j].colorTag).toBe(result2[i][j].colorTag);
      }
    }
  });

  it('produces different results with different seeds', () => {
    const grid: BlastTileState[][] = [
      [createTile(0, 0), createTile(0, 1), createTile(0, 2), createTile(0, 3)],
      [createTile(1, 0), createTile(1, 1), createTile(1, 2), createTile(1, 3)],
    ];

    const result1 = seedColorTags([...grid.map(r => [...r])], 'pink', 0.5, 111);
    const result2 = seedColorTags([...grid.map(r => [...r])], 'pink', 0.5, 222);

    let differences = 0;
    for (let i = 0; i < result1.length; i++) {
      for (let j = 0; j < result1[i].length; j++) {
        if (result1[i][j].colorTag !== result2[i][j].colorTag) differences++;
      }
    }

    expect(differences).toBeGreaterThan(0); // Should differ with different seeds
  });

  it('applies correct color tag based on color parameter', () => {
    const grid: BlastTileState[][] = [
      [createTile(0, 0), createTile(0, 1)],
    ];

    const resultPink = seedColorTags(grid, 'pink', 1.0, 123);
    const resultCyan = seedColorTags(grid, 'cyan', 1.0, 123);
    const resultLime = seedColorTags(grid, 'lime', 1.0, 123);

    expect(resultPink[0][0].colorTag).toBe('pink');
    expect(resultCyan[0][0].colorTag).toBe('cyan');
    expect(resultLime[0][0].colorTag).toBe('lime');
  });

  it('handles empty grid gracefully', () => {
    const grid: BlastTileState[][] = [];
    const result = seedColorTags(grid, 'pink', 0.5, 123);
    expect(result).toEqual([]);
  });

  it('handles 0 density without coloring any tiles', () => {
    const grid: BlastTileState[][] = [
      [createTile(0, 0), createTile(0, 1)],
    ];

    const result = seedColorTags(grid, 'pink', 0, 123);
    expect(result[0][0].colorTag).toBeUndefined();
    expect(result[0][1].colorTag).toBeUndefined();
  });

  it('preserves all other tile properties', () => {
    const tile = createTile(0, 0, 'standard', 'my-uid');
    tile.hitsRemaining = 5;
    const grid: BlastTileState[][] = [[tile]];

    const result = seedColorTags(grid, 'pink', 1.0, 123);

    expect(result[0][0].uid).toBe('my-uid');
    expect(result[0][0].row).toBe(0);
    expect(result[0][0].col).toBe(0);
    expect(result[0][0].hitsRemaining).toBe(5);
    expect(result[0][0].colorTag).toBe('pink');
  });

  it('does not mutate input grid', () => {
    const grid: BlastTileState[][] = [
      [createTile(0, 0), createTile(0, 1)],
    ];
    const original = JSON.stringify(grid);

    seedColorTags(grid, 'pink', 0.5, 123);

    expect(JSON.stringify(grid)).toBe(original);
  });
});
