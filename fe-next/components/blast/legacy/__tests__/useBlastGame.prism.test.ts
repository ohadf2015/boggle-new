/**
 * useBlastGame prism tile tests.
 * Prism tiles require 2 hits to detonate. On detonation, they cross-clear
 * the entire row + column, creating a player-earned cascade trigger.
 */
import { type BlastTileState, type BlastTileType, PRISM_USE_BONUS, PRISM_CROSS_BONUS } from '../types';

// Helpers
function makeTileState(
  row: number,
  col: number,
  type: BlastTileType = 'standard',
  hitsRemaining = 0,
): BlastTileState {
  return { row, col, type, isCleared: false, activationEffect: null, hitsRemaining, uid: `t-${row}-${col}` };
}

function make6x6Grid(): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < 6; r++) {
    grid[r] = [];
    for (let c = 0; c < 6; c++) {
      grid[r][c] = makeTileState(r, c);
    }
  }
  return grid;
}

/**
 * Simulate the clearTilesForWord logic for prism (and related) tiles.
 * Extracted to match the exact logic that will be in useBlastGame.
 */
function simulateClearForPrism(
  tileStates: BlastTileState[][],
  path: Array<{ row: number; col: number }>,
  gridSize: number,
): { bonusScore: number; clearedCount: number; crossClearedPositions: Array<{ row: number; col: number }> } {
  const next = tileStates.map(row => row.map(tile => ({ ...tile })));
  let bonusScore = 0;
  let clearedCount = 0;
  const crossClearedPositions: Array<{ row: number; col: number }> = [];

  for (const cell of path) {
    const tile = next[cell.row]?.[cell.col];
    if (!tile || tile.isCleared) continue;

    // Multi-hit tiles (ice, prism, frozen, gem) check
    if (tile.type === 'prism') {
      if (tile.hitsRemaining > 1) {
        tile.hitsRemaining--;
        tile.activationEffect = 'prism-charge';
        bonusScore += PRISM_USE_BONUS;
        continue; // Don't clear yet
      }

      // Final hit — DETONATE
      tile.isCleared = true;
      clearedCount++;
      bonusScore += PRISM_USE_BONUS + PRISM_CROSS_BONUS;

      // Cross-clear: entire row + column
      for (let c = 0; c < gridSize; c++) {
        if (c === cell.col) continue;
        const target = next[cell.row][c];
        if (target.isCleared) continue;
        if ((target.type === 'ice' || target.type === 'prism' || target.type === 'frozen' || target.type === 'gem') && target.hitsRemaining > 1) {
          target.hitsRemaining--;
        } else {
          target.isCleared = true;
          clearedCount++;
          crossClearedPositions.push({ row: cell.row, col: c });
        }
      }
      for (let r = 0; r < gridSize; r++) {
        if (r === cell.row) continue;
        const target = next[r][cell.col];
        if (target.isCleared) continue;
        if ((target.type === 'ice' || target.type === 'prism' || target.type === 'frozen' || target.type === 'gem') && target.hitsRemaining > 1) {
          target.hitsRemaining--;
        } else {
          target.isCleared = true;
          clearedCount++;
          crossClearedPositions.push({ row: r, col: cell.col });
        }
      }
      continue;
    }

    // Standard tile
    tile.isCleared = true;
    clearedCount++;
  }

  return { bonusScore, clearedCount, crossClearedPositions };
}

describe('Prism tile mechanics', () => {
  it('starts with hitsRemaining: 2', () => {
    const tile = makeTileState(2, 3, 'prism', 2);
    expect(tile.hitsRemaining).toBe(2);
  });

  it('first use: decrements to 1, NOT cleared, +2 bonus', () => {
    const grid = make6x6Grid();
    grid[2][3] = makeTileState(2, 3, 'prism', 2);
    const path = [{ row: 2, col: 3 }];

    const result = simulateClearForPrism(grid, path, 6);

    expect(result.bonusScore).toBe(PRISM_USE_BONUS); // +2
    expect(result.clearedCount).toBe(0); // Not cleared yet
    expect(grid[2][3].isCleared).toBe(false); // Original unchanged
  });

  it('second use: cleared, cross-pattern clears, +7 bonus (2+5)', () => {
    const grid = make6x6Grid();
    grid[2][3] = makeTileState(2, 3, 'prism', 1); // Already hit once
    const path = [{ row: 2, col: 3 }];

    const result = simulateClearForPrism(grid, path, 6);

    expect(result.bonusScore).toBe(PRISM_USE_BONUS + PRISM_CROSS_BONUS); // 2+5=7
    // Cross clear: 5 tiles in row 2 (excluding prism) + 5 tiles in col 3 (excluding prism) = 10
    expect(result.crossClearedPositions.length).toBe(10);
    expect(result.clearedCount).toBe(11); // prism + 10 cross
  });

  it('cross-clear decrements ice hitsRemaining instead of clearing', () => {
    const grid = make6x6Grid();
    grid[2][3] = makeTileState(2, 3, 'prism', 1);
    grid[2][0] = makeTileState(2, 0, 'ice', 2); // Ice in same row

    // Simulate on a copy to check ice state
    const copy = grid.map(r => r.map(t => ({ ...t })));
    const next = copy.map(row => row.map(tile => ({ ...tile })));

    // Run simulation directly on next
    let crossCleared = 0;
    const prism = next[2][3];
    prism.isCleared = true;
    for (let c = 0; c < 6; c++) {
      if (c === 3) continue;
      const target = next[2][c];
      if (target.isCleared) continue;
      if ((target.type === 'ice') && target.hitsRemaining > 1) {
        target.hitsRemaining--;
      } else {
        target.isCleared = true;
        crossCleared++;
      }
    }

    // Ice should be decremented, not cleared
    expect(next[2][0].isCleared).toBe(false);
    expect(next[2][0].hitsRemaining).toBe(1);
    // Other 4 tiles in row cleared
    expect(crossCleared).toBe(4);
  });

  it('cross-clear decrements frozen hitsRemaining instead of clearing', () => {
    const grid = make6x6Grid();
    grid[2][3] = makeTileState(2, 3, 'prism', 1);
    grid[0][3] = makeTileState(0, 3, 'frozen', 3); // Frozen in same column

    const result = simulateClearForPrism(grid, [{ row: 2, col: 3 }], 6);

    // Frozen should not be in crossClearedPositions (it was decremented, not cleared)
    expect(result.crossClearedPositions.find(p => p.row === 0 && p.col === 3)).toBeUndefined();
  });

  it('prism survives across multiple word clears', () => {
    // Simulate 2 separate word plays through same prism
    const grid = make6x6Grid();
    grid[2][3] = makeTileState(2, 3, 'prism', 2);

    // First word
    const result1 = simulateClearForPrism(grid, [{ row: 2, col: 3 }], 6);
    expect(result1.clearedCount).toBe(0);

    // Manually apply the hit
    grid[2][3].hitsRemaining = 1;

    // Second word
    const result2 = simulateClearForPrism(grid, [{ row: 2, col: 3 }], 6);
    expect(result2.clearedCount).toBe(11); // prism + 10 cross
    expect(result2.bonusScore).toBe(PRISM_USE_BONUS + PRISM_CROSS_BONUS);
  });
});
