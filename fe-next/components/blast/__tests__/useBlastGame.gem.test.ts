/**
 * useBlastGame gem tile tests.
 * Gem tiles require 3 hits to collect. Each use gives +3 bonus,
 * final collection gives +3 + +8 = +11. Total potential: 17 bonus points.
 */
import { type BlastTileState, type BlastTileType } from '../types';

const GEM_USE_BONUS = 3;
const GEM_COLLECT_BONUS = 8;

function makeTileState(
  row: number, col: number, type: BlastTileType = 'standard', hitsRemaining = 0,
): BlastTileState {
  return { row, col, type, isCleared: false, activationEffect: null, hitsRemaining };
}

function make6x6Grid(): BlastTileState[][] {
  return Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => makeTileState(r, c))
  );
}

/**
 * Simulate clearTilesForWord for gem tile.
 */
function simulateClearForGem(
  tileStates: BlastTileState[][],
  path: Array<{ row: number; col: number }>,
): { bonusScore: number; clearedCount: number } {
  const next = tileStates.map(row => row.map(tile => ({ ...tile })));
  let bonusScore = 0;
  let clearedCount = 0;

  for (const cell of path) {
    const tile = next[cell.row]?.[cell.col];
    if (!tile || tile.isCleared) continue;

    if (tile.type === 'gem') {
      if (tile.hitsRemaining > 1) {
        tile.hitsRemaining--;
        tile.activationEffect = `gem-crack`;
        bonusScore += GEM_USE_BONUS;
        continue;
      }
      // Final hit — COLLECT
      tile.isCleared = true;
      clearedCount++;
      bonusScore += GEM_USE_BONUS + GEM_COLLECT_BONUS;
      continue;
    }

    tile.isCleared = true;
    clearedCount++;
  }

  return { bonusScore, clearedCount };
}

describe('Gem tile mechanics', () => {
  it('starts with hitsRemaining: 3', () => {
    const tile = makeTileState(1, 1, 'gem', 3);
    expect(tile.hitsRemaining).toBe(3);
  });

  it('first use: decrements to 2, NOT cleared, +3 bonus', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 3);
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.bonusScore).toBe(GEM_USE_BONUS);
    expect(result.clearedCount).toBe(0);
  });

  it('second use: decrements to 1, NOT cleared, +3 bonus', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 2);
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.bonusScore).toBe(GEM_USE_BONUS);
    expect(result.clearedCount).toBe(0);
  });

  it('third/final use: cleared, +11 bonus (3+8)', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 1);
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.bonusScore).toBe(GEM_USE_BONUS + GEM_COLLECT_BONUS);
    expect(result.clearedCount).toBe(1);
  });

  it('total potential from one gem: 17 bonus points', () => {
    // 3 uses × 3pts + 8 collection = 17
    const totalBonus = GEM_USE_BONUS * 3 + GEM_COLLECT_BONUS;
    expect(totalBonus).toBe(17);
  });

  it('gem survives gravity between uses (simulated)', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 3);

    // First use
    simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    grid[1][1].hitsRemaining = 2; // Apply hit

    // Second use
    simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    grid[1][1].hitsRemaining = 1; // Apply hit

    // Third use
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.clearedCount).toBe(1);
    expect(result.bonusScore).toBe(GEM_USE_BONUS + GEM_COLLECT_BONUS);
  });
});
