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
} from '../blastModeManager';

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

    it('BLAST_TILE_TYPES should include all 13 canonical types (no wildcard)', () => {
      const canonicalTypes = [
        'standard', 'gold', 'bomb', 'rainbow', 'ice', 'lightning',
        'magnet', 'prism', 'gem', 'frozen', 'mirror', 'silver', 'diamond',
      ];
      for (const t of canonicalTypes) {
        expect(BLAST_TILE_TYPES).toContain(t);
      }
      expect(BLAST_TILE_TYPES).not.toContain('wildcard');
    });

    it('BLAST_TILE_TYPES should include previously missing types (mirror, silver, diamond, prism)', () => {
      expect(BLAST_TILE_TYPES).toContain('mirror');
      expect(BLAST_TILE_TYPES).toContain('silver');
      expect(BLAST_TILE_TYPES).toContain('diamond');
      expect(BLAST_TILE_TYPES).toContain('prism');
      expect(BLAST_TILE_TYPES).toContain('frozen');
    });

    it('statistical: running 100 overlays on large grid eventually produces new tile types', () => {
      const newTypes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 1);
        for (const tile of overlay) {
          newTypes.add(tile.type);
        }
      }
      // After 100 overlays with wave=1, we expect at least silver to appear (enabled wave 1)
      // wave 1 enables: bomb, ice, gold, silver, rainbow — silver is part of distribution
      expect(newTypes.has('silver')).toBe(true);
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

    it('wave 4 overlay CAN contain diamond tiles (diamond enabled at wave 4)', () => {
      const diamondSeen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 4);
        for (const tile of overlay) {
          diamondSeen.add(tile.type);
        }
      }
      expect(diamondSeen.has('diamond')).toBe(true);
    });

    it.skip('wave 3 overlay CAN contain mirror tiles (mirror enabled at wave 3)', () => {
      const mirrorSeen = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 3);
        for (const tile of overlay) {
          mirrorSeen.add(tile.type);
        }
        if (mirrorSeen.has('mirror')) break;
      }
      expect(mirrorSeen.has('mirror')).toBe(true);
    });

    it('wave 1 overlay should NOT contain mirror tiles (mirror unlocks at wave 3)', () => {
      for (let i = 0; i < 200; i++) {
        const overlay = generateBlastOverlay(largeGrid, 1.0, 1);
        for (const tile of overlay) {
          expect(tile.type).not.toBe('mirror');
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
      const positions = new Map<string, Array<{ row: number; col: number }>>();
      positions.set('a', [{ row: 0, col: 0 }]);
      positions.set('b', [{ row: 0, col: 1 }]);

      const result = getTilesOnPath('ab', positions, overlay);
      expect(result).toContain('gold');
      expect(result).toContain('rainbow');
    });

    it('should return standard for letters not on special tiles', () => {
      const positions = new Map<string, Array<{ row: number; col: number }>>();
      positions.set('x', [{ row: 1, col: 1 }]); // No overlay at (1,1)

      const result = getTilesOnPath('x', positions, overlay);
      expect(result).toEqual(['standard']);
    });

    it('should return empty array for unknown letters', () => {
      const positions = new Map<string, Array<{ row: number; col: number }>>();
      // Letter 'z' not in positions map

      const result = getTilesOnPath('z', positions, overlay);
      expect(result).toEqual([]);
    });

    it('should handle word with duplicate letters', () => {
      const positions = new Map<string, Array<{ row: number; col: number }>>();
      positions.set('a', [{ row: 0, col: 0 }, { row: 1, col: 0 }]);

      const result = getTilesOnPath('aa', positions, overlay);
      // Both positions have overlays: (0,0)=gold, (1,0)=bomb
      expect(result.length).toBe(2);
    });
  });
});
