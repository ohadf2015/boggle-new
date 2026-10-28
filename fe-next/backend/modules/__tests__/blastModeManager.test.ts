/**
 * Blast Mode Manager Tests
 * Tests for overlay generation, tile bonus calc, move tracking, bonus move logic
 */

import {
  generateBlastOverlay,
  calculateBlastTileBonus,
  initBlastModeState,
  recordBlastMove,
  getTilesOnBoardPath,
  hashStringToSeed,
  isBlastBoardCleared,
  regenerateBlastBoard,
  recordBlastBoardClear,
  tryBeginWaveAdvance,
  endWaveAdvance,
} from '../blastModeManager';
import type { BlastTileState } from '@/shared/types/blast';

import {
  BLAST_BONUS_MOVE_COMBO_THRESHOLD,
  BLAST_TILE_BONUSES,
} from '@/shared/constants/blastMultiplayerConstants';

import type { BlastModeState } from '@/shared/types/game';

describe('blastModeManager', () => {
  // ==========================================
  // generateBlastOverlay
  // ==========================================
  describe('generateBlastOverlay', () => {
    const grid: string[][] = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 'A'));

    it('places only bombs and coins, inside the grid', () => {
      for (let seed = 1; seed <= 50; seed++) {
        for (const tile of generateBlastOverlay(grid, 1, seed)) {
          expect(['bomb', 'gold']).toContain(tile.type);
          expect(tile.row).toBeGreaterThanOrEqual(0);
          expect(tile.row).toBeLessThan(10);
          expect(tile.col).toBeGreaterThanOrEqual(0);
          expect(tile.col).toBeLessThan(10);
        }
      }
    });

    it('never rolls a diamond at any wave', () => {
      for (let wave = 1; wave <= 15; wave++) {
        for (let seed = 1; seed <= 20; seed++) {
          expect(generateBlastOverlay(grid, wave, seed).some(t => t.type === 'diamond')).toBe(false);
        }
      }
    });

    it('is deterministic for a seed', () => {
      const seed = hashStringToSeed('TESTGAME');
      expect(generateBlastOverlay(grid, 1, seed)).toEqual(generateBlastOverlay(grid, 1, seed));
    });
  });

  // ==========================================
  // calculateBlastTileBonus
  // ==========================================
  describe('calculateBlastTileBonus', () => {
    it('should return 0 for empty path', () => {
      expect(calculateBlastTileBonus([])).toBe(0);
    });

    it('should return standard bonus (1) for a single standard tile', () => {
      expect(calculateBlastTileBonus(['standard'])).toBe(1);
    });

    it('should sum bonuses for multiple tiles', () => {
      // gold=1.5, bomb=1.25 => total 2.75
      expect(calculateBlastTileBonus(['gold', 'bomb'])).toBe(BLAST_TILE_BONUSES.gold + BLAST_TILE_BONUSES.bomb);
    });

    it('sums per-tile bonuses for bombs, coins and diamonds', () => {
      expect(calculateBlastTileBonus(['diamond', 'bomb'])).toBe(BLAST_TILE_BONUSES.diamond + BLAST_TILE_BONUSES.bomb);
    });
  });

  // ==========================================
  // initBlastModeState
  // ==========================================
  describe('initBlastModeState', () => {
    const grid: string[][] = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const players = ['alice', 'bob'];

    it('should return a BlastModeState object', () => {
      const state = initBlastModeState(grid, players);
      expect(state).toHaveProperty('overlay');
      expect(state).toHaveProperty('playerMoves');
      expect(state).toHaveProperty('playerBonusMoves');
    });

    it('should generate overlay for the grid', () => {
      const state = initBlastModeState(grid, players);
      expect(Array.isArray(state.overlay)).toBe(true);
    });

    it('should initialize playerMoves to 0 for each player', () => {
      const state = initBlastModeState(grid, players);
      expect(state.playerMoves).toEqual({ alice: 0, bob: 0 });
    });

    it('should initialize playerBonusMoves to 0 for each player', () => {
      const state = initBlastModeState(grid, players);
      expect(state.playerBonusMoves).toEqual({ alice: 0, bob: 0 });
    });

    it('should return a BlastModeState with a seed number field', () => {
      const state = initBlastModeState(grid, players);
      expect(state).toHaveProperty('seed');
      expect(typeof state.seed).toBe('number');
    });

    it('should return a seed that is a positive integer', () => {
      const state = initBlastModeState(grid, players);
      expect(state.seed).toBeGreaterThan(0);
      expect(Number.isInteger(state.seed)).toBe(true);
    });

    it('should return different seeds on successive calls', () => {
      // With Date.now() xor random, seeds should almost never collide
      const seeds = Array.from({ length: 10 }, () => initBlastModeState(grid, players).seed);
      const uniqueSeeds = new Set(seeds);
      // At least some should differ (extremely unlikely all 10 match)
      expect(uniqueSeeds.size).toBeGreaterThan(1);
    });

    it('should persist the wave number on the returned state', () => {
      const state = initBlastModeState(grid, players, 3);
      expect(state.wave).toBe(3);
    });

    it('should default wave to 1 when not specified', () => {
      const state = initBlastModeState(grid, players);
      expect(state.wave).toBe(1);
    });
  });

  // ==========================================
  // recordBlastMove
  // ==========================================
  describe('recordBlastMove', () => {
    let state: BlastModeState;

    beforeEach(() => {
      state = {
        overlay: [],
        overlayMap: new Map(),
        playerMoves: { alice: 0, bob: 0 },
        playerBonusMoves: { alice: 0, bob: 0 },
        playerStats: {
          alice: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 },
          bob: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 },
        },
      };
    });

    it('should increment moves for the player', () => {
      const result = recordBlastMove(state, 'alice', 0);
      expect(result.movesUsed).toBe(1);
      expect(state.playerMoves.alice).toBe(1);
    });

    it('should not grant bonus move when combo is below threshold', () => {
      const result = recordBlastMove(state, 'alice', BLAST_BONUS_MOVE_COMBO_THRESHOLD - 1);
      expect(result.bonusMove).toBe(false);
    });

    it('should grant bonus move when combo meets threshold', () => {
      const result = recordBlastMove(state, 'alice', BLAST_BONUS_MOVE_COMBO_THRESHOLD);
      expect(result.bonusMove).toBe(true);
      expect(state.playerBonusMoves.alice).toBe(1);
    });

    it('should grant bonus move when combo exceeds threshold', () => {
      const result = recordBlastMove(state, 'alice', BLAST_BONUS_MOVE_COMBO_THRESHOLD + 5);
      expect(result.bonusMove).toBe(true);
    });

    it('should track moves independently per player', () => {
      recordBlastMove(state, 'alice', 0);
      recordBlastMove(state, 'alice', 0);
      recordBlastMove(state, 'bob', 0);
      expect(state.playerMoves.alice).toBe(2);
      expect(state.playerMoves.bob).toBe(1);
    });

    it('should handle unknown player gracefully by initializing to 0', () => {
      const result = recordBlastMove(state, 'charlie', 0);
      expect(result.movesUsed).toBe(1);
      expect(state.playerMoves.charlie).toBe(1);
    });

    it('should track word in playerStats when provided', () => {
      recordBlastMove(state, 'alice', 3, 'HELLO', 5);
      expect(state.playerStats.alice.wordsFound).toEqual(['HELLO']);
      expect(state.playerStats.alice.tilesCleared).toBe(5);
      expect(state.playerStats.alice.maxCombo).toBe(3);
    });

    it('should update bestWord to longest word', () => {
      recordBlastMove(state, 'alice', 0, 'HI', 2);
      recordBlastMove(state, 'alice', 0, 'WORLD', 5);
      recordBlastMove(state, 'alice', 0, 'CAT', 3);
      expect(state.playerStats.alice.bestWord).toBe('WORLD');
    });


    it('should update maxCombo only when higher', () => {
      recordBlastMove(state, 'alice', 5, 'A', 1);
      recordBlastMove(state, 'alice', 3, 'B', 1);
      recordBlastMove(state, 'alice', 7, 'C', 1);
      expect(state.playerStats.alice.maxCombo).toBe(7);
    });
  });

  describe('getTilesOnBoardPath', () => {
    const tile = (row: number, col: number, type: BlastTileState['type']): BlastTileState => ({
      uid: `${row}-${col}`, row, col, type, isCleared: false, activationEffect: null, hitsRemaining: 0,
    });
    const tiles = [[tile(0, 0, 'gold'), tile(0, 1, 'standard')], [tile(1, 0, 'bomb'), tile(1, 1, 'diamond')]];

    it('reads each path cell from the live board', () => {
      expect(getTilesOnBoardPath(tiles, [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 0 }])).toEqual(['gold', 'diamond', 'bomb']);
    });

    it('treats cells off the board as standard', () => {
      expect(getTilesOnBoardPath(tiles, [{ row: 5, col: 5 }])).toEqual(['standard']);
    });
  });

  // ==========================================
  // hashStringToSeed
  // ==========================================
  describe('hashStringToSeed', () => {
    it('should return a positive integer', () => {
      const seed = hashStringToSeed('ABC123');
      expect(seed).toBeGreaterThan(0);
      expect(Number.isInteger(seed)).toBe(true);
    });

    it('should be deterministic — same input yields same output', () => {
      expect(hashStringToSeed('GAME42')).toBe(hashStringToSeed('GAME42'));
    });

    it('should return different values for different inputs', () => {
      expect(hashStringToSeed('GAME42')).not.toBe(hashStringToSeed('GAME43'));
    });

    it('should never return 0', () => {
      // hash of any string (including empty) should be > 0
      expect(hashStringToSeed('')).toBeGreaterThan(0);
      expect(hashStringToSeed('x')).toBeGreaterThan(0);
    });
  });

  describe('initBlastModeState with overlaySeed', () => {
    const grid: string[][] = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const players = ['alice', 'bob'];

    it('should produce identical overlays when called with the same overlaySeed', () => {
      const seed = hashStringToSeed('ROOM99');
      const s1 = initBlastModeState(grid, players, 1, seed);
      const s2 = initBlastModeState(grid, players, 1, seed);
      expect(s1.overlay).toEqual(s2.overlay);
    });

    it('should still include a refill seed (distinct from overlay seed)', () => {
      const s = initBlastModeState(grid, players, 1, hashStringToSeed('ROOM99'));
      expect(typeof s.seed).toBe('number');
      expect(s.seed).toBeGreaterThan(0);
    });

    it('should produce identical refill seed when called with the same overlaySeed (MP determinism)', () => {
      const seed = hashStringToSeed('ROOM42');
      const s1 = initBlastModeState(grid, players, 1, seed);
      const s2 = initBlastModeState(grid, players, 1, seed);
      expect(s1.seed).toBe(s2.seed);
    });

    it('refill seed should differ from overlay seed to decorrelate overlay vs gravity RNG', () => {
      const overlaySeed = hashStringToSeed('ROOM42');
      const s = initBlastModeState(grid, players, 1, overlaySeed);
      expect(s.seed).not.toBe(overlaySeed);
    });
  });

  // ==========================================
  // isBlastBoardCleared — MP win condition
  // ==========================================
  describe('isBlastBoardCleared', () => {
    function makeTile(isCleared: boolean): BlastTileState {
      return {
        letter: 'A',
        type: 'standard',
        isCleared,
      } as BlastTileState;
    }

    it('returns true when every tile is cleared', () => {
      const tileStates: BlastTileState[][] = [
        [makeTile(true), makeTile(true)],
        [makeTile(true), makeTile(true)],
      ];
      expect(isBlastBoardCleared(tileStates)).toBe(true);
    });

    it('returns false when any tile is not cleared', () => {
      const tileStates: BlastTileState[][] = [
        [makeTile(true), makeTile(true)],
        [makeTile(true), makeTile(false)],
      ];
      expect(isBlastBoardCleared(tileStates)).toBe(false);
    });

    it('returns false when most tiles are uncleared', () => {
      const tileStates: BlastTileState[][] = [
        [makeTile(false), makeTile(false)],
        [makeTile(false), makeTile(false)],
      ];
      expect(isBlastBoardCleared(tileStates)).toBe(false);
    });

    it('returns true for empty grid (vacuously cleared)', () => {
      expect(isBlastBoardCleared([])).toBe(true);
    });

    it('handles non-square grids (ragged rows)', () => {
      const tileStates: BlastTileState[][] = [
        [makeTile(true)],
        [makeTile(true), makeTile(true), makeTile(true)],
      ];
      expect(isBlastBoardCleared(tileStates)).toBe(true);
    });
  });

  // ==========================================
  // regenerateBlastBoard
  // ==========================================
  describe('regenerateBlastBoard', () => {
    it('produces a fresh overlay without incrementing a wave counter', () => {
      const grid = [['a', 'b'], ['c', 'd']];
      const state = initBlastModeState(grid, ['alice'], 1, 12345);
      state.refillCount = 0;
      const next = regenerateBlastBoard(state, 'ROOM1', grid);
      expect(next.refillCount).toBe(1);
      expect(next.overlay).toBeDefined();
      expect(next.tileStates.some((row) => row.some((t) => !t.isCleared))).toBe(true);
    });

    it('preserves cumulative playerStats across regeneration', () => {
      const grid = [['a', 'b'], ['c', 'd']];
      const state = initBlastModeState(grid, ['alice'], 1, 1);
      state.playerStats.alice = { maxCombo: 4, gemsCollected: 2, wordsFound: ['cab'], bestWord: 'cab', tilesCleared: 3, totalTileBonus: 5, boardClears: 0 };
      const next = regenerateBlastBoard(state, 'ROOM1', grid);
      expect(next.playerStats.alice.maxCombo).toBe(4);
      expect(next.playerStats.alice.tilesCleared).toBe(3);
    });
  });

  // ==========================================
  // recordBlastBoardClear
  // ==========================================
  describe('recordBlastBoardClear', () => {
    it('increments boardClears for the clearing player', () => {
      const grid = [['a', 'b'], ['c', 'd']];
      const state = initBlastModeState(grid, ['alice'], 1, 1);
      recordBlastBoardClear(state, 'alice');
      recordBlastBoardClear(state, 'alice');
      expect(state.playerStats.alice.boardClears).toBe(2);
    });
  });

  // ==========================================
  // tryBeginWaveAdvance / endWaveAdvance (H2)
  // Concurrency guard: only one wave-advance sequence per game may be
  // in flight at a time. Second entrant early-returns until first ends.
  // ==========================================
  describe('tryBeginWaveAdvance / endWaveAdvance', () => {
    it('first caller claims the lock and returns true', () => {
      const code = 'H2GAME1';
      expect(tryBeginWaveAdvance(code)).toBe(true);
      endWaveAdvance(code);
    });

    it('second caller is rejected while first holds the lock', () => {
      const code = 'H2GAME2';
      expect(tryBeginWaveAdvance(code)).toBe(true);
      expect(tryBeginWaveAdvance(code)).toBe(false);
      endWaveAdvance(code);
    });

    it('lock is reusable after endWaveAdvance', () => {
      const code = 'H2GAME3';
      expect(tryBeginWaveAdvance(code)).toBe(true);
      endWaveAdvance(code);
      expect(tryBeginWaveAdvance(code)).toBe(true);
      endWaveAdvance(code);
    });

    it('locks are independent per gameCode', () => {
      expect(tryBeginWaveAdvance('H2A')).toBe(true);
      expect(tryBeginWaveAdvance('H2B')).toBe(true);
      expect(tryBeginWaveAdvance('H2A')).toBe(false);
      expect(tryBeginWaveAdvance('H2B')).toBe(false);
      endWaveAdvance('H2A');
      endWaveAdvance('H2B');
    });

    it('endWaveAdvance is idempotent (safe in finally blocks)', () => {
      const code = 'H2GAME4';
      tryBeginWaveAdvance(code);
      endWaveAdvance(code);
      expect(() => endWaveAdvance(code)).not.toThrow();
    });
  });

  describe('Blast special cell density', () => {
    const grid6x6: string[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, (_, i) => String.fromCharCode(65 + (i % 26)))
    );
    const average = (wave: number) => {
      const counts = Array.from({ length: 200 }, (_, i) => generateBlastOverlay(grid6x6, wave, i + 1).length);
      return counts.reduce((a, b) => a + b, 0) / counts.length;
    };

    it('keeps a warm-up board mostly letters', () => {
      const avg = average(1);
      expect(avg).toBeGreaterThan(3.5);
      expect(avg).toBeLessThan(36 * 0.2);
    });

    it('rolls the same specials as the single-player wave config', () => {
      expect(average(2)).toBeGreaterThan(average(4));
    });
  });
});
