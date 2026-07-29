/**
 * Tests for unique tile effects in clearTilesProcessor.processTilesForWord.
 * Covers: gold bonus moves, diamond reveal turns, countdown defuse moves,
 * shuffle board rearrange, magma diagonal clear, portal word multiplier, gem completion bonus moves,
 * prism tile conversion.
 */
import { processTilesForWord, type TileProcessingInput } from '../utils/clearTilesProcessor';
import type { BlastTileState } from '@/shared/types/blast';
import {
  GOLD_BONUS_MOVES,
  COUNTDOWN_DEFUSE_MOVES,
  TREASURE_GEM_BONUS_MOVES,
  DIAMOND_REVEAL_TURNS,
  PORTAL_WORD_MULTIPLIER,
  FUSE_INITIAL_TIMER,
  FUSE_DEFUSE_MOVES,
} from '../types';

// Mock tile generation to avoid randomness
jest.mock('../utils/blastTileGeneration', () => ({
  rollSpecialFromDistribution: () => 'bomb' as const,
}));

// Deterministic Math.random for prism conversion tests
const originalRandom = Math.random;
afterEach(() => { Math.random = originalRandom; });

/** Create a standard tile */
function tile(row: number, col: number, type: BlastTileState['type'] = 'standard', overrides?: Partial<BlastTileState>): BlastTileState {
  return {
    uid: `${row}-${col}`,
    row, col, type,
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
    ...overrides,
  };
}

/** Build a gridSize×gridSize grid of standard tiles */
function makeGrid(gridSize: number, overrides?: Array<{ row: number; col: number; tile: Partial<BlastTileState> }>): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = tile(r, c);
    }
  }
  for (const o of overrides ?? []) {
    grid[o.row][o.col] = tile(o.row, o.col, (o.tile.type ?? 'standard') as BlastTileState['type'], o.tile);
  }
  return grid;
}

function makeInput(grid: BlastTileState[][], path: Array<{ row: number; col: number }>, word: string, opts?: Partial<TileProcessingInput>): TileProcessingInput {
  return {
    prev: grid,
    path,
    word,
    baseScore: 10,
    gridSize: grid.length,
    currentWave: 1,
    preDetectedCombos: [],
    ...opts,
  };
}

describe('processTilesForWord — unique tile effects', () => {
  describe('gold tile: bonus moves', () => {
    it('awards GOLD_BONUS_MOVES per gold tile in word', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'gold' } },
        { row: 0, col: 1, tile: { type: 'gold' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'ABC'));
      // 2 gold tiles * GOLD_BONUS_MOVES + word-length bonus (3 letters = 0 from calculateBonusMoves)
      expect(result.bonusMoveCount).toBeGreaterThanOrEqual(2 * GOLD_BONUS_MOVES);
    });
  });

  describe('diamond tile: reveal turns', () => {
    it('sets diamondRevealTurns to DIAMOND_REVEAL_TURNS', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'diamond' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.diamondRevealTurns).toBe(DIAMOND_REVEAL_TURNS);
    });
  });

  describe('shuffle tile: board rearrange', () => {
    it('sets shuffleTriggered to true when shuffle tile is cleared', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'shuffle' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.shuffleTriggered).toBe(true);
    });

    it('marks uncleared non-path tiles with shuffle-rearrange activationEffect', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'shuffle' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      // All uncleared non-path tiles should have activationEffect 'shuffle-rearrange'
      let rearrangedCount = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (path.some(p => p.row === r && p.col === c)) continue;
          if (result.next[r][c].isCleared) continue;
          if (result.next[r][c].activationEffect === 'shuffle-rearrange') rearrangedCount++;
        }
      }
      expect(rearrangedCount).toBeGreaterThan(0);
    });

    it('does not set shuffleTriggered when no shuffle tile in word', () => {
      const grid = makeGrid(4);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.shuffleTriggered).toBe(false);
    });
  });

  describe('countdown tile: defuse bonus moves', () => {
    it('awards COUNTDOWN_DEFUSE_MOVES when defused', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'countdown', countdown: 2 } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.bonusMoveCount).toBeGreaterThanOrEqual(COUNTDOWN_DEFUSE_MOVES);
    });
  });

  describe('magma tile: diagonal clear', () => {
    it('clears tiles along both diagonals (X-pattern)', () => {
      const grid = makeGrid(5, [
        { row: 2, col: 2, tile: { type: 'magma' } },
      ]);
      const path = [{ row: 2, col: 1 }, { row: 2, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      // Diagonal corners should be cleared
      expect(result.next[0][0].isCleared).toBe(true); // top-left diagonal
      expect(result.next[1][1].isCleared).toBe(true);
      expect(result.next[3][3].isCleared).toBe(true);
      expect(result.next[4][4].isCleared).toBe(true); // bottom-right diagonal
      expect(result.next[0][4].isCleared).toBe(true); // top-right diagonal
      expect(result.next[1][3].isCleared).toBe(true);
      expect(result.next[3][1].isCleared).toBe(true);
      expect(result.next[4][0].isCleared).toBe(true); // bottom-left diagonal
    });

    it('applies MAGMA_MULTIPLIER to score', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'magma' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      // Score should reflect the magma multiplier (2x)
      expect(result.totalScore).toBeGreaterThan(10); // base 10 * MAGMA_MULTIPLIER
    });

    it('chains with bomb tiles on diagonals', () => {
      const grid = makeGrid(5, [
        { row: 2, col: 2, tile: { type: 'magma' } },
        { row: 1, col: 1, tile: { type: 'bomb' } }, // on diagonal — should trigger bomb explosion
      ]);
      const path = [{ row: 2, col: 1 }, { row: 2, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.next[1][1].isCleared).toBe(true); // bomb cleared
      // Bomb's 3x3 area should also be cleared
      expect(result.next[0][0].isCleared).toBe(true);
      expect(result.next[0][1].isCleared).toBe(true);
      expect(result.next[0][2].isCleared).toBe(true);
    });

    it('damages multi-hit tiles on diagonals instead of clearing', () => {
      const grid = makeGrid(5, [
        { row: 2, col: 2, tile: { type: 'magma' } },
        { row: 1, col: 1, tile: { type: 'ice', hitsRemaining: 2 } },
      ]);
      const path = [{ row: 2, col: 1 }, { row: 2, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.next[1][1].isCleared).toBe(false);
      expect(result.next[1][1].hitsRemaining).toBe(1);
    });
  });

  describe('portal tile: word multiplier', () => {
    it('applies PORTAL_WORD_MULTIPLIER to portal words', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'portal', portalPairId: 'p1' } },
        { row: 3, col: 3, tile: { type: 'portal', portalPairId: 'p1' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.portalMultiplier).toBe(PORTAL_WORD_MULTIPLIER);
    });

    it('clears paired portal when one is used', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'portal', portalPairId: 'p1' } },
        { row: 3, col: 3, tile: { type: 'portal', portalPairId: 'p1' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.next[3][3].isCleared).toBe(true);
    });

    it('returns portalMultiplier 1 when no portal in word', () => {
      const grid = makeGrid(4);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.portalMultiplier).toBe(1);
    });
  });

  describe('gem tile: completion bonus moves', () => {
    it('awards TREASURE_GEM_BONUS_MOVES when gem completes (3rd hit)', () => {
      // Gem with 1 hit remaining = final hit
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'gem', hitsRemaining: 1 } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.bonusMoveCount).toBeGreaterThanOrEqual(TREASURE_GEM_BONUS_MOVES);
    });
  });

  describe('prism tile: converts standard tiles to specials', () => {
    it('converts up to 2 standard tiles to specials after clearing', () => {
      Math.random = (() => { let i = 0; return () => [0.1, 0.2, 0.3, 0.4, 0.5][i++ % 5]; })();
      // Prism with 1 hit remaining (final hit triggers clear + convert)
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'prism', hitsRemaining: 1 } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      // Count non-standard, non-prism tiles that weren't in the path and aren't cleared
      let convertedCount = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (path.some(p => p.row === r && p.col === c)) continue;
          if (result.next[r][c].type !== 'standard' && !result.next[r][c].isCleared) {
            convertedCount++;
          }
        }
      }
      expect(convertedCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('fuse tile: partner-lighting and defuse', () => {
    it('lights unlit partner fuse when one in the pair is cleared', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'fuse', fuseGroupId: 'pair-1' } },
        { row: 2, col: 2, tile: { type: 'fuse', fuseGroupId: 'pair-1' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.next[0][0].isCleared).toBe(true);
      expect(result.next[2][2].isCleared).toBe(false);
      expect(result.next[2][2].type).toBe('fuse');
      expect(result.next[2][2].fuseTimer).toBe(FUSE_INITIAL_TIMER);
    });

    it('does not light partners of a different fuseGroupId', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'fuse', fuseGroupId: 'pair-1' } },
        { row: 2, col: 2, tile: { type: 'fuse', fuseGroupId: 'pair-2' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.next[2][2].fuseTimer).toBeUndefined();
    });

    it('awards FUSE_DEFUSE_MOVES when clearing a lit fuse in a word', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'fuse', fuseGroupId: 'pair-1', fuseTimer: 2 } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
      const result = processTilesForWord(makeInput(grid, path, 'AB'));
      expect(result.next[0][0].isCleared).toBe(true);
      expect(result.bonusMoveCount).toBeGreaterThanOrEqual(FUSE_DEFUSE_MOVES);
    });
  });

  describe('multiple effects stack', () => {
    it('gold + countdown in same word gives combined bonus moves', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'gold' } },
        { row: 0, col: 1, tile: { type: 'countdown', countdown: 2 } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'ABC'));
      expect(result.bonusMoveCount).toBeGreaterThanOrEqual(GOLD_BONUS_MOVES + COUNTDOWN_DEFUSE_MOVES);
    });
  });
});
