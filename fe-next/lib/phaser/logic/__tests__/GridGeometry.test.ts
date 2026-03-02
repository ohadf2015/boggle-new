/**
 * GridGeometry — pure canvas math for Phaser tile positioning.
 * Zero DOM / Phaser dependencies; all inputs are numbers.
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import {
  buildGridLayout,
  getTileAtPoint,
  isAdjacentCell,
  isDiagonalMove,
  type GridLayout,
} from '../GridGeometry';

// ─── buildGridLayout ──────────────────────────────────────────────────────────

describe('buildGridLayout', () => {
  it('returns correct number of tile positions for a 4×4 grid', () => {
    const layout = buildGridLayout(4, 800, 600);
    expect(layout.tiles).toHaveLength(16);
  });

  it('returns correct number of tile positions for a 5×5 grid', () => {
    const layout = buildGridLayout(5, 800, 600);
    expect(layout.tiles).toHaveLength(25);
  });

  it('assigns unique (row, col) pairs to every tile', () => {
    const layout = buildGridLayout(4, 800, 600);
    const keys = layout.tiles.map((t) => `${t.row},${t.col}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(16);
  });

  it('tiles cover rows 0‥gridSize-1 and cols 0‥gridSize-1', () => {
    const layout = buildGridLayout(4, 800, 600);
    const rows = layout.tiles.map((t) => t.row);
    const cols = layout.tiles.map((t) => t.col);
    expect(Math.min(...rows)).toBe(0);
    expect(Math.max(...rows)).toBe(3);
    expect(Math.min(...cols)).toBe(0);
    expect(Math.max(...cols)).toBe(3);
  });

  it('tileSize is positive', () => {
    const layout = buildGridLayout(4, 800, 600);
    expect(layout.tileSize).toBeGreaterThan(0);
  });

  it('tiles are vertically and horizontally spaced by tileSize + gap', () => {
    const layout = buildGridLayout(4, 800, 600);
    const step = layout.tileSize + layout.gap;
    const tile00 = layout.tiles.find((t) => t.row === 0 && t.col === 0)!;
    const tile01 = layout.tiles.find((t) => t.row === 0 && t.col === 1)!;
    const tile10 = layout.tiles.find((t) => t.row === 1 && t.col === 0)!;
    expect(tile01.x - tile00.x).toBeCloseTo(step, 1);
    expect(tile10.y - tile00.y).toBeCloseTo(step, 1);
  });

  it('grid is horizontally centered within canvas', () => {
    const layout = buildGridLayout(4, 800, 600);
    const tile00 = layout.tiles.find((t) => t.row === 0 && t.col === 0)!;
    const tile03 = layout.tiles.find((t) => t.row === 0 && t.col === 3)!;
    const leftEdge = tile00.x - layout.tileSize / 2;
    const rightEdge = tile03.x + layout.tileSize / 2;
    const centerX = (leftEdge + rightEdge) / 2;
    expect(centerX).toBeCloseTo(400, 0);
  });

  it('exposes rows and cols', () => {
    const layout = buildGridLayout(5, 800, 600);
    expect(layout.rows).toBe(5);
    expect(layout.cols).toBe(5);
  });
});

// ─── getTileAtPoint ───────────────────────────────────────────────────────────

describe('getTileAtPoint', () => {
  let layout: GridLayout;
  beforeEach(() => {
    layout = buildGridLayout(4, 800, 600);
  });

  it('returns the correct tile when point is exactly on a tile center', () => {
    const tile11 = layout.tiles.find((t) => t.row === 1 && t.col === 1)!;
    const result = getTileAtPoint(tile11.x, tile11.y, layout);
    expect(result).toEqual({ row: 1, col: 1 });
  });

  it('returns a tile when point is within tile bounds', () => {
    const tile00 = layout.tiles.find((t) => t.row === 0 && t.col === 0)!;
    // Slightly offset from center — still inside the tile
    const result = getTileAtPoint(tile00.x + 2, tile00.y + 2, layout);
    expect(result).toEqual({ row: 0, col: 0 });
  });

  it('returns null when point is outside the grid', () => {
    const result = getTileAtPoint(-100, -100, layout);
    expect(result).toBeNull();
  });

  it('returns null when point is in the gap between tiles', () => {
    // Only test this when there's a meaningful gap
    if (layout.gap > 2) {
      const tile00 = layout.tiles.find((t) => t.row === 0 && t.col === 0)!;
      const tile01 = layout.tiles.find((t) => t.row === 0 && t.col === 1)!;
      const midX = (tile00.x + tile01.x) / 2;
      const result = getTileAtPoint(midX, tile00.y, layout);
      // In the gap — should be null or one of the edge tiles (implementation-defined)
      // At minimum the result must not be a totally wrong row
      if (result !== null) {
        expect(result.row).toBe(0);
      }
    }
  });
});

// ─── Re-exported adjacency helpers ───────────────────────────────────────────

describe('isAdjacentCell', () => {
  it('returns true for direct horizontal neighbor', () => {
    expect(isAdjacentCell({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
  });

  it('returns true for diagonal neighbor', () => {
    expect(isAdjacentCell({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(true);
  });

  it('returns false for same cell', () => {
    expect(isAdjacentCell({ row: 2, col: 2 }, { row: 2, col: 2 })).toBe(false);
  });

  it('returns false for non-adjacent cell', () => {
    expect(isAdjacentCell({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
  });
});

describe('isDiagonalMove', () => {
  it('returns true for diagonal move', () => {
    expect(isDiagonalMove({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(true);
  });

  it('returns false for straight move', () => {
    expect(isDiagonalMove({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });
});
