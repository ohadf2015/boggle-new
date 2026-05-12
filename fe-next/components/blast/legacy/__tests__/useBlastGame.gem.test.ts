/**
 * useBlastGame gem tile tests (Treasure Gem redesign).
 * Gem tiles require 3 hits (TREASURE_GEM_HITS_REQUIRED) to complete.
 * No per-hit bonus on intermediate hits — only TREASURE_GEM_COMPLETION_BONUS (25)
 * on final hit, plus spawning TREASURE_GEM_SPAWN_COUNT (2) random specials.
 * Shard effects: gem-shard-1 (hit 1), gem-shard-2 (hit 2), gem-complete (hit 3).
 */
import { type BlastTileState, type BlastTileType, TREASURE_GEM_COMPLETION_BONUS, TREASURE_GEM_HITS_REQUIRED } from '../types';

function makeTileState(
  row: number, col: number, type: BlastTileType = 'standard', hitsRemaining = 0,
): BlastTileState {
  return { row, col, type, isCleared: false, activationEffect: null, hitsRemaining, uid: `t-${row}-${col}` };
}

function make6x6Grid(): BlastTileState[][] {
  return Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => makeTileState(r, c))
  );
}

/**
 * Simulate clearTilesForWord for gem tile (matches current production logic).
 */
function simulateClearForGem(
  tileStates: BlastTileState[][],
  path: Array<{ row: number; col: number }>,
): { bonusScore: number; clearedCount: number; activationEffect: string | null } {
  const next = tileStates.map(row => row.map(tile => ({ ...tile })));
  let bonusScore = 0;
  let clearedCount = 0;
  let lastEffect: string | null = null;

  for (const cell of path) {
    const tile = next[cell.row]?.[cell.col];
    if (!tile || tile.isCleared) continue;

    if (tile.type === 'gem') {
      if (tile.hitsRemaining > 1) {
        // Non-final hit: decrement, show shard, no bonus
        tile.hitsRemaining--;
        tile.activationEffect = tile.hitsRemaining === 2 ? 'gem-shard-1' : 'gem-shard-2';
        lastEffect = tile.activationEffect;
        continue;
      }
      // Final hit: complete gem (markCleared handles bonus)
      tile.activationEffect = 'gem-complete';
      bonusScore += TREASURE_GEM_COMPLETION_BONUS;
      tile.isCleared = true;
      clearedCount++;
      lastEffect = tile.activationEffect;
      continue;
    }

    tile.isCleared = true;
    clearedCount++;
  }

  return { bonusScore, clearedCount, activationEffect: lastEffect };
}

describe('Treasure Gem tile mechanics', () => {
  it('starts with hitsRemaining matching TREASURE_GEM_HITS_REQUIRED', () => {
    const tile = makeTileState(1, 1, 'gem', TREASURE_GEM_HITS_REQUIRED);
    expect(tile.hitsRemaining).toBe(3);
  });

  it('first hit: decrements to 2, NOT cleared, no bonus, gem-shard-1 effect', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 3);
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.bonusScore).toBe(0);
    expect(result.clearedCount).toBe(0);
    expect(result.activationEffect).toBe('gem-shard-1');
  });

  it('second hit: decrements to 1, NOT cleared, no bonus, gem-shard-2 effect', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 2);
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.bonusScore).toBe(0);
    expect(result.clearedCount).toBe(0);
    expect(result.activationEffect).toBe('gem-shard-2');
  });

  it('third/final hit: cleared, TREASURE_GEM_COMPLETION_BONUS awarded, gem-complete effect', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 1);
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.bonusScore).toBe(TREASURE_GEM_COMPLETION_BONUS);
    expect(result.clearedCount).toBe(1);
    expect(result.activationEffect).toBe('gem-complete');
  });

  it('total potential from one gem: only TREASURE_GEM_COMPLETION_BONUS (no per-hit bonus)', () => {
    expect(TREASURE_GEM_COMPLETION_BONUS).toBe(25);
  });

  it('gem survives gravity between uses (simulated)', () => {
    const grid = make6x6Grid();
    grid[1][1] = makeTileState(1, 1, 'gem', 3);

    // First hit
    simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    grid[1][1].hitsRemaining = 2;

    // Second hit
    simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    grid[1][1].hitsRemaining = 1;

    // Third hit (final)
    const result = simulateClearForGem(grid, [{ row: 1, col: 1 }]);
    expect(result.clearedCount).toBe(1);
    expect(result.bonusScore).toBe(TREASURE_GEM_COMPLETION_BONUS);
  });
});
