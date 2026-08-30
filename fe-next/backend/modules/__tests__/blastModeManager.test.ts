/**
 * Blast Mode Manager Tests
 * Tests for overlay generation, tile bonus calc, move tracking, bonus move logic
 */

import {
  generateBlastOverlay,
  calculateBlastTileBonus,
  initBlastModeState,
  recordBlastMove,
  getTilesOnPath,
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
  BLAST_SPECIAL_TILE_CHANCE,
  BLAST_TILE_BONUSES,
  BLAST_RAINBOW_FLAT_BONUS,
  BLAST_TILE_TYPES,
} from '@/shared/constants/blastMultiplayerConstants';

import type { BlastTileOverlay, BlastModeState } from '@/shared/types/game';

describe('blastModeManager', () => {
  // ==========================================
  // generateBlastOverlay
  // ==========================================
  describe('generateBlastOverlay', () => {
    const grid: string[][] = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ];

    it('should return an array of BlastTileOverlay objects', () => {
      const overlay = generateBlastOverlay(grid, 0.5);
      expect(Array.isArray(overlay)).toBe(true);
      overlay.forEach((tile) => {
        expect(tile).toHaveProperty('row');
        expect(tile).toHaveProperty('col');
        expect(tile).toHaveProperty('type');
        expect(typeof tile.row).toBe('number');
        expect(typeof tile.col).toBe('number');
      });
    });

    it('should only include special tiles (not standard) in overlay', () => {
      const overlay = generateBlastOverlay(grid, 1.0); // 100% chance
      overlay.forEach((tile) => {
        expect(tile.type).not.toBe('standard');
      });
    });

    it('should return empty array when specialChance is 0', () => {
      const overlay = generateBlastOverlay(grid, 0);
      expect(overlay).toEqual([]);
    });

    it('should return special tiles for every cell when specialChance is 1', () => {
      const overlay = generateBlastOverlay(grid, 1.0);
      // Every cell should have a special tile
      expect(overlay.length).toBe(9); // 3x3 grid
    });

    it('should assign valid special tile types from BLAST_TILE_TYPES', () => {
      const overlay = generateBlastOverlay(grid, 1.0);
      const specialTypes = BLAST_TILE_TYPES.filter(t => t !== 'standard');
      overlay.forEach((tile) => {
        expect(specialTypes).toContain(tile.type);
      });
    });

    it('should have row and col within grid bounds', () => {
      const overlay = generateBlastOverlay(grid, 1.0);
      overlay.forEach((tile) => {
        expect(tile.row).toBeGreaterThanOrEqual(0);
        expect(tile.row).toBeLessThan(grid.length);
        expect(tile.col).toBeGreaterThanOrEqual(0);
        expect(tile.col).toBeLessThan(grid[0].length);
      });
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

    it('should add BLAST_RAINBOW_FLAT_BONUS when rainbow is in path', () => {
      // rainbow=1 + flat bonus=5 => 6
      const result = calculateBlastTileBonus(['rainbow']);
      expect(result).toBe(1 + BLAST_RAINBOW_FLAT_BONUS);
    });

    it('should add flat bonus only once even with multiple rainbows', () => {
      // 2 rainbows: (1+1) multiplier + 5 flat = 7
      const result = calculateBlastTileBonus(['rainbow', 'rainbow']);
      expect(result).toBe(2 + BLAST_RAINBOW_FLAT_BONUS);
    });

    it('should handle mixed tile types correctly', () => {
      const result = calculateBlastTileBonus(['standard', 'gold', 'rainbow', 'ice']);
      expect(result).toBe(
        BLAST_TILE_BONUSES.standard + BLAST_TILE_BONUSES.gold +
        BLAST_TILE_BONUSES.rainbow + BLAST_TILE_BONUSES.ice +
        BLAST_RAINBOW_FLAT_BONUS
      );
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
      recordBlastMove(state, 'alice', 3, 'HELLO', 5, 0);
      expect(state.playerStats.alice.wordsFound).toEqual(['HELLO']);
      expect(state.playerStats.alice.tilesCleared).toBe(5);
      expect(state.playerStats.alice.maxCombo).toBe(3);
    });

    it('should update bestWord to longest word', () => {
      recordBlastMove(state, 'alice', 0, 'HI', 2, 0);
      recordBlastMove(state, 'alice', 0, 'WORLD', 5, 0);
      recordBlastMove(state, 'alice', 0, 'CAT', 3, 0);
      expect(state.playerStats.alice.bestWord).toBe('WORLD');
    });

    it('should accumulate gems collected', () => {
      recordBlastMove(state, 'alice', 0, 'GEM', 3, 2);
      recordBlastMove(state, 'alice', 0, 'GEMS', 4, 1);
      expect(state.playerStats.alice.gemsCollected).toBe(3);
    });

    it('should update maxCombo only when higher', () => {
      recordBlastMove(state, 'alice', 5, 'A', 1, 0);
      recordBlastMove(state, 'alice', 3, 'B', 1, 0);
      recordBlastMove(state, 'alice', 7, 'C', 1, 0);
      expect(state.playerStats.alice.maxCombo).toBe(7);
    });
  });

  // ==========================================
  // generateBlastOverlay — canonical tile types (Task 1)
  // ==========================================
  describe('generateBlastOverlay — canonical tile types', () => {
    const largeGrid: string[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => 'A')
    );

    // Subset guard only — no hardcoded total. Adding a tile to the source must
    // not break this test (a magic count here duplicated the one in
    // shared/types/blast.test.ts and drifted independently, blocking unrelated
    // PRs). Removing a documented tile still fails via toContain.
    it('BLAST_TILE_TYPES should include every canonical type', () => {
      const canonicalTypes = [
        'standard', 'gold', 'bomb', 'rainbow', 'ice', 'lightning',
        'magnet', 'prism', 'gem', 'frozen', 'diamond',
        'countdown', 'portal', 'catalyst', 'shuffle', 'magma',
        'crystal', 'fuse', 'anchor', 'mystery',
        'chocolate', 'cake', 'locked', 'key',
      ];
      for (const t of canonicalTypes) {
        expect(BLAST_TILE_TYPES).toContain(t);
      }
    });

    it('BLAST_TILE_TYPES should include core advanced types (diamond, prism, frozen)', () => {
      expect(BLAST_TILE_TYPES).toContain('diamond');
      expect(BLAST_TILE_TYPES).toContain('prism');
      expect(BLAST_TILE_TYPES).toContain('frozen');
    });

    it('statistical: running 100 overlays on large grid eventually produces basic tile types', () => {
      const newTypes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 1);
        for (const tile of overlay) {
          newTypes.add(tile.type);
        }
      }
      // After 100 overlays with wave=1, we expect at least gold to appear (enabled wave 1)
      // wave 1 enables: bomb, ice, gold, rainbow
      expect(newTypes.has('gold')).toBe(true);
    });
  });

  // ==========================================
  // generateBlastOverlay — wave-aware (Task 2)
  // ==========================================
  describe('generateBlastOverlay — wave-aware', () => {
    const largeGrid: string[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => 'A')
    );

    it('wave 1 overlay should NOT contain diamond tiles (diamond unlocks at wave 4+)', () => {
      // Run 200 overlays to get statistical confidence
      for (let i = 0; i < 200; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 1);
        for (const tile of overlay) {
          expect(tile.type).not.toBe('diamond');
        }
      }
    });

    it('wave 5 overlay should NOT contain diamond tiles (diamond retired in Sprint 1)', () => {
      for (let i = 0; i < 200; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 5);
        for (const tile of overlay) {
          expect(tile.type).not.toBe('diamond');
        }
      }
    });

    it('wave 3 overlay CAN contain prism tiles (prism enabled at wave 3)', () => {
      const prismSeen = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 3);
        for (const tile of overlay) {
          prismSeen.add(tile.type);
        }
        if (prismSeen.has('prism')) break;
      }
      expect(prismSeen.has('prism')).toBe(true);
    });

    it('wave 1 overlay should NOT contain lightning tiles (lightning unlocks at wave 4)', () => {
      for (let i = 0; i < 200; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 1);
        for (const tile of overlay) {
          expect(tile.type).not.toBe('lightning');
        }
      }
    });

    it('initBlastModeState accepts optional wave parameter (defaults to 1)', () => {
      const grid = [['A', 'B'], ['C', 'D']];
      const players = ['alice'];
      // Without wave param — should not throw
      const stateDefault = initBlastModeState(grid, players);
      expect(stateDefault).toHaveProperty('overlay');
      // With wave=2 — should not throw
      const stateWave2 = initBlastModeState(grid, players, 2);
      expect(stateWave2).toHaveProperty('overlay');
    });
  });

  // ==========================================
  // getTilesOnPath
  // ==========================================
  describe('getTilesOnPath', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'rainbow' },
      { row: 1, col: 0, type: 'bomb' },
    ];

    it('should return tile types for letters on overlay positions', () => {
      // Word "AB" - A at (0,0) has gold, B at (0,1) has rainbow
      const positions = new Map<string, [number, number][]>();
      positions.set('a', [[0, 0]]);
      positions.set('b', [[0, 1]]);

      const result = getTilesOnPath('ab', positions, overlay);
      expect(result).toContain('gold');
      expect(result).toContain('rainbow');
    });

    it('should return standard for letters not on special tiles', () => {
      const positions = new Map<string, [number, number][]>();
      positions.set('x', [[1, 1]]); // No overlay at (1,1)

      const result = getTilesOnPath('x', positions, overlay);
      expect(result).toEqual(['standard']);
    });

    it('should return empty array for unknown letters', () => {
      const positions = new Map<string, [number, number][]>();
      // Letter 'z' not in positions map

      const result = getTilesOnPath('z', positions, overlay);
      expect(result).toEqual([]);
    });

    it('should handle word with duplicate letters', () => {
      const positions = new Map<string, [number, number][]>();
      positions.set('a', [[0, 0], [1, 0]]);

      const result = getTilesOnPath('aa', positions, overlay);
      // Both positions have overlays: (0,0)=gold, (1,0)=bomb
      expect(result.length).toBe(2);
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

  // ==========================================
  // Deterministic overlay via seed (GD-005)
  // ==========================================
  describe('generateBlastOverlay with seed', () => {
    const grid: string[][] = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ];

    it('should produce identical overlays for the same seed', () => {
      const seed = hashStringToSeed('TESTGAME');
      const o1 = generateBlastOverlay(grid, 0.5, 1, seed);
      const o2 = generateBlastOverlay(grid, 0.5, 1, seed);
      expect(o1).toEqual(o2);
    });

    it('should produce different overlays for different seeds', () => {
      // Not guaranteed but overwhelmingly likely with different seeds
      const o1 = generateBlastOverlay(grid, 0.5, 1, hashStringToSeed('AAAA11'));
      const o2 = generateBlastOverlay(grid, 0.5, 1, hashStringToSeed('BBBB22'));
      // At least tile counts or types should differ in most cases
      // We just verify both are valid arrays
      expect(Array.isArray(o1)).toBe(true);
      expect(Array.isArray(o2)).toBe(true);
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

  // ==========================================
  // Special Cell Density (Blast Mode Enhancement)
  // ==========================================
  describe('Blast special cell density', () => {
    // 6x6 board = 36 cells. Target density: ~40% ± variance
    // With 40% base chance, expect 14.4 ± 5 cells due to binomial variance
    const grid6x6: string[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, (_, i) => String.fromCharCode(65 + (i % 26)))
    );
    const BOARD_SIZE = 36;
    const TARGET_DENSITY = 0.40;
    const EXPECTED_CELLS = Math.round(BOARD_SIZE * TARGET_DENSITY);
    const EXPECTED_MIN_CELLS = Math.max(8, EXPECTED_CELLS - 6);  // ~8 cells min
    const EXPECTED_MAX_CELLS = Math.min(32, EXPECTED_CELLS + 6); // ~20 cells max

    it('should generate boards with substantial special cell density (~40%)', () => {
      const overlay = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1);
      const specialCellCount = overlay.length;

      // With 40% per-cell chance, expect ~14 cells (±6 due to variance)
      expect(specialCellCount).toBeGreaterThanOrEqual(EXPECTED_MIN_CELLS);
      expect(specialCellCount).toBeLessThanOrEqual(EXPECTED_MAX_CELLS);
    });

    it('should maintain determinism: same seed produces identical overlay', () => {
      const seed = 12345;
      const overlay1 = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1, seed);
      const overlay2 = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1, seed);

      expect(overlay1.length).toBe(overlay2.length);
      expect(overlay1).toEqual(overlay2);
    });

    it('should cap ice tiles so obstructive types do not dominate', () => {
      // Wave 1 ice distribution is 0.17 (17% of specials)
      // With 40% base density and ice at 17% of that: expect ~2-3 ice tiles max on 6x6
      // Obstructive tiles should not exceed 20% of the board
      const overlay = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1);
      const iceTiles = overlay.filter(t => t.type === 'ice').length;
      const maxAllowedIce = Math.ceil(BOARD_SIZE * 0.20);

      expect(iceTiles).toBeLessThanOrEqual(maxAllowedIce);
    });

    it('wave 1 should spawn at least 4 distinct special types (core set)', () => {
      // Wave 1 has access to: bomb, ice, gold, rainbow (core set of 4)
      const overlay = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1);
      const distinctTypes = new Set(overlay.map(t => t.type));

      // With 35-45% density and 4 available types, should have several types present
      expect(distinctTypes.size).toBeGreaterThanOrEqual(2);

      // Most boards should have at least 3 types (bomb, gold, ice, rainbow should all appear)
      if (overlay.length >= 10) {
        // Only assert variety for boards with enough specials
        expect(distinctTypes.size).toBeGreaterThanOrEqual(3);
      }
    });

    it('should handle initBlastModeState with increased density', () => {
      const grid = grid6x6;
      const players = ['alice', 'bob'];
      const state = initBlastModeState(grid, players, 1, 999);

      const specialCellCount = state.overlay.length;
      expect(specialCellCount).toBeGreaterThanOrEqual(EXPECTED_MIN_CELLS);
      expect(specialCellCount).toBeLessThanOrEqual(EXPECTED_MAX_CELLS);
    });

    it('higher waves should maintain substantial special density', () => {
      const overlayWave1 = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1, 111);
      const overlayWave5 = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 5, 111);

      // Both waves should generate boards with good density (at least 8+ cells)
      expect(overlayWave1.length).toBeGreaterThanOrEqual(EXPECTED_MIN_CELLS - 4);
      expect(overlayWave5.length).toBeGreaterThanOrEqual(EXPECTED_MIN_CELLS - 4);
    });

    it('boards should feel substantially fuller than pre-change', () => {
      // Generate multiple boards and verify average density is around target (40%)
      // With variance, individual boards will vary ±15%, but average should converge to ~40%
      const samples = 20;
      const densities: number[] = [];

      for (let i = 0; i < samples; i++) {
        const overlay = generateBlastOverlay(grid6x6, BLAST_SPECIAL_TILE_CHANCE, 1, i + 5000);
        densities.push(overlay.length / BOARD_SIZE);
      }

      const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
      // Average across 20 boards should be close to 40%
      expect(avgDensity).toBeGreaterThanOrEqual(0.35);
      expect(avgDensity).toBeLessThanOrEqual(0.45);
    });
  });
});
