/**
 * blastColorPowerValidator — flood-fill cluster size for colored tiles.
 *
 * Critique fix (Sprint 3 P0): "Color power = wait-for-pink slot machine"
 * unless ≥minColorCount tiles are guaranteed reachable in one path.
 *
 * Validates a seeded board has at least one connected cluster of color-tagged
 * tiles ≥ threshold (8-dir adjacency, matching blast path engine).
 */
import { describe, it, expect } from 'vitest';
import {
  largestColoredCluster,
  seedColorPowerWithGuarantee,
} from '../blastColorPowerValidator';
import type { BlastTileState } from '@/shared/types/blast';

const tile = (
  row: number,
  col: number,
  type = 'standard',
  colorTag?: 'pink' | 'cyan' | 'lime',
): BlastTileState => ({
  uid: `${row}-${col}`,
  row,
  col,
  type: type as any,
  isCleared: false,
  activationEffect: null,
  hitsRemaining: 0,
  colorTag,
});

describe('largestColoredCluster', () => {
  it('returns 0 for empty grid', () => {
    expect(largestColoredCluster([], 'pink')).toBe(0);
  });

  it('returns 0 when no tiles match color', () => {
    const grid = [[tile(0, 0), tile(0, 1)]];
    expect(largestColoredCluster(grid, 'pink')).toBe(0);
  });

  it('returns 1 for a single isolated colored tile', () => {
    const grid = [
      [tile(0, 0, 'standard', 'pink'), tile(0, 1), tile(0, 2)],
      [tile(1, 0), tile(1, 1), tile(1, 2)],
      [tile(2, 0), tile(2, 1), tile(2, 2)],
    ];
    expect(largestColoredCluster(grid, 'pink')).toBe(1);
  });

  it('counts horizontally adjacent tiles as one cluster', () => {
    const grid = [
      [tile(0, 0, 'standard', 'pink'), tile(0, 1, 'standard', 'pink'), tile(0, 2, 'standard', 'pink')],
    ];
    expect(largestColoredCluster(grid, 'pink')).toBe(3);
  });

  it('counts diagonal adjacency (8-direction matches path engine)', () => {
    const grid = [
      [tile(0, 0, 'standard', 'pink'), tile(0, 1), tile(0, 2)],
      [tile(1, 0), tile(1, 1, 'standard', 'pink'), tile(1, 2)],
      [tile(2, 0), tile(2, 1), tile(2, 2, 'standard', 'pink')],
    ];
    expect(largestColoredCluster(grid, 'pink')).toBe(3);
  });

  it('returns the size of the LARGEST cluster when multiple exist', () => {
    const grid = [
      [tile(0, 0, 'standard', 'pink'), tile(0, 1), tile(0, 2), tile(0, 3, 'standard', 'pink')],
      [tile(1, 0), tile(1, 1), tile(1, 2), tile(1, 3, 'standard', 'pink')],
      [tile(2, 0), tile(2, 1), tile(2, 2), tile(2, 3, 'standard', 'pink')],
    ];
    // Cluster A: (0,0) size 1. Cluster B: (0,3)-(1,3)-(2,3) size 3.
    expect(largestColoredCluster(grid, 'pink')).toBe(3);
  });

  it('ignores tiles tagged with other colors', () => {
    const grid = [
      [tile(0, 0, 'standard', 'cyan'), tile(0, 1, 'standard', 'pink'), tile(0, 2, 'standard', 'lime')],
    ];
    expect(largestColoredCluster(grid, 'pink')).toBe(1);
  });
});

describe('seedColorPowerWithGuarantee', () => {
  const buildEmptyGrid = (rows = 6, cols = 6): BlastTileState[][] => {
    const g: BlastTileState[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: BlastTileState[] = [];
      for (let c = 0; c < cols; c++) row.push(tile(r, c));
      g.push(row);
    }
    return g;
  };

  it('returns a grid whose largest cluster is >= minColorCount', () => {
    const grid = buildEmptyGrid();
    const result = seedColorPowerWithGuarantee(grid, 'pink', 4, 1000);
    expect(largestColoredCluster(result.grid, 'pink')).toBeGreaterThanOrEqual(4);
  });

  it('is deterministic for the same baseSeed', () => {
    const grid = buildEmptyGrid();
    const a = seedColorPowerWithGuarantee(grid, 'pink', 4, 7777);
    const b = seedColorPowerWithGuarantee(grid, 'pink', 4, 7777);
    expect(a.grid).toEqual(b.grid);
    expect(a.attempts).toBe(b.attempts);
  });

  it('reports attempts metadata so telemetry can flag rare escalations', () => {
    const grid = buildEmptyGrid();
    const r = seedColorPowerWithGuarantee(grid, 'pink', 4, 1000);
    expect(r.attempts).toBeGreaterThanOrEqual(1);
    expect(r.finalDensity).toBeGreaterThan(0);
    expect(r.finalDensity).toBeLessThanOrEqual(0.6);
  });

  it('caps density at 0.6 and bails out gracefully on impossible threshold', () => {
    // 2x2 board with 4 tiles total cannot satisfy a cluster of 8.
    const grid: BlastTileState[][] = [
      [tile(0, 0), tile(0, 1)],
      [tile(1, 0), tile(1, 1)],
    ];
    const r = seedColorPowerWithGuarantee(grid, 'pink', 8, 1000);
    expect(r.finalDensity).toBeLessThanOrEqual(0.6);
    expect(r.satisfied).toBe(false);
  });
});
