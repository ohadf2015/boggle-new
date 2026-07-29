import { detectNearMiss, type NearMissResult } from '../blastNearMiss';
import type { BlastTileState, BlastTileType } from '../../types';

// ==================== Helpers ====================

function makeTileStates(
  gridSize: number,
  overrides: Array<{ row: number; col: number; type: BlastTileType; isCleared?: boolean }> = [],
): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = {
        row: r,
        col: c,
        type: 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  for (const o of overrides) {
    grid[o.row][o.col].type = o.type;
    if (o.isCleared !== undefined) {
      grid[o.row][o.col].isCleared = o.isCleared;
    }
  }
  return grid;
}

function makePath(...coords: Array<[number, number]>): Array<{ row: number; col: number }> {
  return coords.map(([row, col]) => ({ row, col }));
}

function makeGrid(gridSize: number): string[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => 'A'),
  );
}

// ==================== Tests ====================

describe('detectNearMiss', () => {
  const GRID_SIZE = 6;

  // ── Returns null when no near-miss ──────────────────────────────────────────

  it('should return null when there are no special tiles adjacent to path', () => {
    const tileStates = makeTileStates(GRID_SIZE);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3], [2, 4]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).toBeNull();
  });

  it('should return null when only one special tile is adjacent (not a pair)', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).toBeNull();
  });

  it('should return null when path already included a combo (hadCombo = true)', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE, true);

    expect(result).toBeNull();
  });

  it('should return null when adjacent specials are already cleared', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb', isCleared: true },
      { row: 1, col: 3, type: 'lightning', isCleared: true },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).toBeNull();
  });

  it('should return null when adjacent specials are in the submitted path', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 2, col: 2, type: 'bomb' },
      { row: 2, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    // path includes the special tiles themselves
    const path = makePath([2, 2], [2, 3], [2, 4]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).toBeNull();
  });

  // ── Detects adjacent special pairs ─────────────────────────────────────────

  it('should detect two adjacent special tiles above the path', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('combo');
    expect(result!.cells).toHaveLength(2);
  });

  it('should detect two adjacent special tiles beside the path', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 2, col: 1, type: 'rainbow' },
      { row: 3, col: 1, type: 'prism' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [3, 2]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('combo');
  });

  it('should not include path cells in the near-miss cells', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);
    const pathSet = new Set(path.map(c => `${c.row},${c.col}`));

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).not.toBeNull();
    for (const cell of result!.cells) {
      expect(pathSet.has(`${cell.row},${cell.col}`)).toBe(false);
    }
  });

  // ── Cell count capping ──────────────────────────────────────────────────────

  it('should cap returned cells at 3 even if more specials exist', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 1, type: 'bomb' },
      { row: 1, col: 2, type: 'lightning' },
      { row: 1, col: 3, type: 'prism' },
      { row: 1, col: 4, type: 'rainbow' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).not.toBeNull();
    expect(result!.cells.length).toBeLessThanOrEqual(3);
  });

  // ── Standard tiles not returned ─────────────────────────────────────────────

  it('should not flag standard tiles as near-miss candidates', () => {
    const tileStates = makeTileStates(GRID_SIZE);
    const grid = makeGrid(GRID_SIZE);
    // All tiles are standard
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).toBeNull();
  });

  // ── Out-of-bounds safety ────────────────────────────────────────────────────

  it('should not crash on path cells at board edges', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 0, type: 'bomb' },
      { row: 1, col: 1, type: 'magnet' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([0, 0], [0, 1]); // Top-left corner

    expect(() => detectNearMiss(path, grid, tileStates, GRID_SIZE)).not.toThrow();
  });

  // ── NearMissResult shape ────────────────────────────────────────────────────

  it('should return NearMissResult with cells and type fields', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE);

    expect(result).toMatchObject({
      cells: expect.arrayContaining([
        expect.objectContaining({ row: expect.any(Number), col: expect.any(Number) }),
      ]),
      type: expect.stringMatching(/^(combo|cascade)$/),
    });
  });

  // ── hadCombo defaults to false ──────────────────────────────────────────────

  it('should detect near-miss when hadCombo is false (default)', () => {
    const tileStates = makeTileStates(GRID_SIZE, [
      { row: 1, col: 2, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const grid = makeGrid(GRID_SIZE);
    const path = makePath([2, 2], [2, 3]);

    const result = detectNearMiss(path, grid, tileStates, GRID_SIZE, false);

    expect(result).not.toBeNull();
  });
});
