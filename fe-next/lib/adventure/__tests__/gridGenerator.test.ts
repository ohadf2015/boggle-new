/**
 * gridGenerator Tests
 *
 * Tests for adventure level letter grid generation.
 * Ensures grids have good letter distribution for word formation.
 */

import {
  generateAdventureGrid,
  getLevelSeed,
  VOWELS,
  COMMON_CONSONANTS,
} from '../gridGenerator';

describe('generateAdventureGrid', () => {
  describe('Grid Size', () => {
    it('should generate a 4x4 grid when size is 4', () => {
      // GIVEN
      const size = 4;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(4);
      expect(grid[0]).toHaveLength(4);
      expect(grid[3]).toHaveLength(4);
    });

    it('should generate a 5x5 grid when size is 5', () => {
      // GIVEN
      const size = 5;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(5);
      expect(grid[0]).toHaveLength(5);
    });

    it('should generate a 6x6 grid when size is 6', () => {
      // GIVEN
      const size = 6;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(6);
      expect(grid[0]).toHaveLength(6);
    });

    it('should generate a 7x7 grid when size is 7', () => {
      // GIVEN
      const size = 7;

      // WHEN
      const grid = generateAdventureGrid(size);

      // THEN
      expect(grid).toHaveLength(7);
      expect(grid[0]).toHaveLength(7);
    });
  });

  describe('Letter Content', () => {
    it('should contain only uppercase letters', () => {
      // GIVEN
      const grid = generateAdventureGrid(4);

      // WHEN/THEN
      for (const row of grid) {
        for (const letter of row) {
          expect(letter).toMatch(/^[A-Z]$/);
        }
      }
    });

    it('should include at least 25% vowels for playability', () => {
      // GIVEN
      const grid = generateAdventureGrid(5);
      const totalTiles = 25;

      // WHEN
      let vowelCount = 0;
      for (const row of grid) {
        for (const letter of row) {
          if (VOWELS.includes(letter)) {
            vowelCount++;
          }
        }
      }

      // THEN - at least 25% should be vowels
      expect(vowelCount).toBeGreaterThanOrEqual(totalTiles * 0.25);
    });

    it('should include common consonants for word formation', () => {
      // GIVEN
      const grid = generateAdventureGrid(5);

      // WHEN
      const allLetters = grid.flat();

      // THEN - at least one common consonant should appear
      const hasCommonConsonant = COMMON_CONSONANTS.some((c) =>
        allLetters.includes(c)
      );
      expect(hasCommonConsonant).toBe(true);
    });
  });

  describe('Seeding', () => {
    it('should generate same grid with same seed', () => {
      // GIVEN
      const seed = 12345;

      // WHEN
      const grid1 = generateAdventureGrid(4, seed);
      const grid2 = generateAdventureGrid(4, seed);

      // THEN
      expect(grid1).toEqual(grid2);
    });

    it('should generate different grids with different seeds', () => {
      // GIVEN
      const seed1 = 12345;
      const seed2 = 67890;

      // WHEN
      const grid1 = generateAdventureGrid(4, seed1);
      const grid2 = generateAdventureGrid(4, seed2);

      // THEN
      expect(grid1).not.toEqual(grid2);
    });

    it('should generate different grids without seed (random)', () => {
      // GIVEN - no seed
      // Note: We use seeded randoms to make this test deterministic
      // by checking multiple generations produce variety

      // WHEN
      const grids: string[][][] = [];
      for (let i = 0; i < 3; i++) {
        grids.push(generateAdventureGrid(4));
      }

      // THEN - at least 2 of 3 should be different
      const uniqueGrids = new Set(grids.map((g) => JSON.stringify(g)));
      expect(uniqueGrids.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Level-based Generation', () => {
    it('should generate consistent grid for world-level combination', () => {
      // GIVEN
      const world = 3;
      const level = 5;
      const size = 5;

      // WHEN - using world*1000 + level as seed for consistency
      const seed = getLevelSeed(world, level);
      const grid1 = generateAdventureGrid(size, seed);
      const grid2 = generateAdventureGrid(size, seed);

      // THEN
      expect(grid1).toEqual(grid2);
    });
  });
});

describe('getLevelSeed', () => {
  it('should generate unique seed for each world-level combination', () => {
    // GIVEN
    const seeds = new Set<number>();

    // WHEN - generate seeds for all combinations
    for (let world = 1; world <= 10; world++) {
      for (let level = 1; level <= 10; level++) {
        seeds.add(getLevelSeed(world, level));
      }
    }

    // THEN - all seeds should be unique
    expect(seeds.size).toBe(100);
  });

  it('should produce deterministic seed for same inputs', () => {
    // GIVEN
    const world = 5;
    const level = 7;

    // WHEN
    const seed1 = getLevelSeed(world, level);
    const seed2 = getLevelSeed(world, level);

    // THEN
    expect(seed1).toBe(seed2);
  });
});

describe('Constants', () => {
  it('VOWELS should contain A, E, I, O, U', () => {
    expect(VOWELS).toEqual(['A', 'E', 'I', 'O', 'U']);
  });

  it('COMMON_CONSONANTS should contain frequent consonants', () => {
    expect(COMMON_CONSONANTS).toContain('R');
    expect(COMMON_CONSONANTS).toContain('S');
    expect(COMMON_CONSONANTS).toContain('T');
    expect(COMMON_CONSONANTS).toContain('N');
  });
});
