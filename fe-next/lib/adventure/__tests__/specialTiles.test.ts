/**
 * Tests for specialTiles — Sprint 3 backfill (M20)
 * Verifies tile generation rules, vowel protection, 25% cap,
 * and Gem Detector boost.
 */

import { generateSpecialTiles, applyGemDetectorBoost } from '../specialTiles';

describe('generateSpecialTiles', () => {
  // ==============================================
  // WORLD 1 TUTORIALS (levels 1-4): No tiles
  // ==============================================

  describe('world 1 tutorial levels', () => {
    it('returns empty for W1 L1', () => {
      expect(generateSpecialTiles(1, 1, 4, undefined, 'classic')).toHaveLength(0);
    });

    it('returns empty for W1 L4', () => {
      expect(generateSpecialTiles(1, 4, 4, undefined, 'classic')).toHaveLength(0);
    });
  });

  // ==============================================
  // GOLD TILES: W1 L5+ and W2+
  // ==============================================

  describe('gold tiles', () => {
    it('W1 L5 generates gold tiles', () => {
      const tiles = generateSpecialTiles(1, 5, 4, undefined, 'classic');
      const goldTiles = tiles.filter(t => t.type === 'gold');
      expect(goldTiles.length).toBeGreaterThanOrEqual(1);
    });

    it('W2 L1 generates gold tiles', () => {
      const tiles = generateSpecialTiles(2, 1, 4, undefined, 'classic');
      const goldTiles = tiles.filter(t => t.type === 'gold');
      expect(goldTiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==============================================
  // ICE TILES: W2+
  // ==============================================

  describe('ice tiles', () => {
    it('W1 does not generate ice tiles (classic archetype)', () => {
      const tiles = generateSpecialTiles(1, 5, 4, undefined, 'classic');
      const iceTiles = tiles.filter(t => t.type === 'ice');
      expect(iceTiles).toHaveLength(0);
    });

    it('W2 generates ice tiles', () => {
      const tiles = generateSpecialTiles(2, 3, 5, undefined, 'classic');
      const iceTiles = tiles.filter(t => t.type === 'ice');
      expect(iceTiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==============================================
  // BOMB TILES: W3+ L3+
  // ==============================================

  describe('bomb tiles', () => {
    it('W3 L2 does not generate bomb tiles', () => {
      const tiles = generateSpecialTiles(3, 2, 5, undefined, 'classic');
      const bombTiles = tiles.filter(t => t.type === 'bomb');
      expect(bombTiles).toHaveLength(0);
    });

    it('W3 L3 generates bomb tiles', () => {
      const tiles = generateSpecialTiles(3, 3, 5, undefined, 'classic');
      const bombTiles = tiles.filter(t => t.type === 'bomb');
      expect(bombTiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==============================================
  // TIME TILES: W3+ L2+
  // ==============================================

  describe('time tiles', () => {
    it('W3 L1 does not generate time tiles', () => {
      const tiles = generateSpecialTiles(3, 1, 5, undefined, 'classic');
      const timeTiles = tiles.filter(t => t.type === 'time');
      expect(timeTiles).toHaveLength(0);
    });

    it('W3 L2 generates time tiles', () => {
      const tiles = generateSpecialTiles(3, 2, 5, undefined, 'classic');
      const timeTiles = tiles.filter(t => t.type === 'time');
      expect(timeTiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==============================================
  // VOWEL PROTECTION (ice avoids vowels)
  // ==============================================

  describe('vowel protection', () => {
    it('ice tiles avoid vowels when grid provided', () => {
      // Grid full of vowels — ice placement should fail (fall through)
      const vowelGrid = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => 'A')
      );
      const tiles = generateSpecialTiles(2, 3, 5, vowelGrid, 'classic');
      const iceTiles = tiles.filter(t => t.type === 'ice');
      // All vowels means no valid ice positions → 0 ice tiles
      expect(iceTiles).toHaveLength(0);
    });

    it('ice tiles can be placed on consonants', () => {
      // Grid of consonants
      const consonantGrid = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => 'X')
      );
      const tiles = generateSpecialTiles(2, 3, 5, consonantGrid, 'classic');
      const iceTiles = tiles.filter(t => t.type === 'ice');
      expect(iceTiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==============================================
  // 25% CAP
  // ==============================================

  describe('25% cap', () => {
    it('never exceeds 25% of grid cells', () => {
      // High world/level with blast archetype (high ice multiplier)
      for (let w = 3; w <= 5; w++) {
        for (let l = 3; l <= 6; l++) {
          const gridSize = 5;
          const maxTiles = Math.floor(gridSize * gridSize * 0.25);
          const tiles = generateSpecialTiles(w, l, gridSize, undefined, 'classic');
          expect(tiles.length).toBeLessThanOrEqual(maxTiles);
        }
      }
    });
  });

  // ==============================================
  // UNIQUE POSITIONS
  // ==============================================

  describe('unique positions', () => {
    it('no two tiles share the same position', () => {
      const tiles = generateSpecialTiles(5, 5, 5, undefined, 'classic');
      const positions = tiles.map(t => `${t.row},${t.col}`);
      expect(new Set(positions).size).toBe(positions.length);
    });
  });
});

describe('applyGemDetectorBoost', () => {
  it('returns same tiles when no boost', () => {
    const tiles = [{ row: 0, col: 0, type: 'gold' as const }];
    const result = applyGemDetectorBoost(tiles, 5, 0, false);
    expect(result).toBe(tiles); // same reference — no-op
  });

  it('adds extra gold tiles with specialTileBoost', () => {
    const tiles = [{ row: 0, col: 0, type: 'gold' as const }];
    const result = applyGemDetectorBoost(tiles, 5, 0.5, false);
    const goldCount = result.filter(t => t.type === 'gold').length;
    expect(goldCount).toBeGreaterThan(1);
  });

  it('guarantees gold tile when guaranteedGoldTile=true and none exist', () => {
    const tiles = [{ row: 0, col: 0, type: 'ice' as const }];
    const result = applyGemDetectorBoost(tiles, 5, 0, true);
    const hasGold = result.some(t => t.type === 'gold');
    expect(hasGold).toBe(true);
  });

  it('does not add extra gold when guaranteedGoldTile=true and gold exists', () => {
    const tiles = [{ row: 0, col: 0, type: 'gold' as const }];
    const result = applyGemDetectorBoost(tiles, 5, 0, true);
    // Only the original gold, no extras
    expect(result).toHaveLength(1);
  });

  it('new tiles have unique positions', () => {
    const tiles = [{ row: 0, col: 0, type: 'gold' as const }];
    const result = applyGemDetectorBoost(tiles, 5, 1.0, false);
    const positions = result.map(t => `${t.row},${t.col}`);
    expect(new Set(positions).size).toBe(positions.length);
  });
});
