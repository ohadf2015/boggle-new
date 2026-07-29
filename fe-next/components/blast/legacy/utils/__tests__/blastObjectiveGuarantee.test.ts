/**
 * blastObjectiveGuarantee - Tests for guaranteeing board has enough tiles
 * of each type required by wave objectives.
 */
import { guaranteeObjectiveTiles, MIN_STANDARD_RATIO } from '../blastObjectiveGuarantee';
import type { BlastTileState, BlastObjective, BlastTileType } from '../../types';

// Helper: create a grid of all-standard tiles
function makeStandardGrid(size: number): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      grid[row][col] = {
        row,
        col,
        type: 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  return grid;
}

// Helper: count tiles of a given type in the grid
function countType(grid: BlastTileState[][], type: BlastTileType): number {
  let count = 0;
  for (const row of grid) {
    for (const tile of row) {
      if (tile.type === type) count++;
    }
  }
  return count;
}

describe('guaranteeObjectiveTiles', () => {
  describe('collect_type objectives', () => {
    it('should place missing gem tiles when board has none', () => {
      // GIVEN: all-standard 6x6 grid, objective needs 3 gems
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 3 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: at least 3 gems exist
      expect(countType(result, 'gem')).toBeGreaterThanOrEqual(3);
    });

    it('should not add tiles when board already has enough', () => {
      // GIVEN: grid with 4 gems already
      const grid = makeStandardGrid(6);
      grid[0][0].type = 'gem';
      grid[0][1].type = 'gem';
      grid[0][2].type = 'gem';
      grid[0][3].type = 'gem';
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 3 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: still exactly 4 gems (no additional ones placed)
      expect(countType(result, 'gem')).toBe(4);
    });

    it('should add only the deficit tiles', () => {
      // GIVEN: grid with 1 gem, objective needs 3
      const grid = makeStandardGrid(6);
      grid[0][0].type = 'gem';
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 3 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: exactly 3 gems (1 existing + 2 added)
      expect(countType(result, 'gem')).toBe(3);
    });

    it('should handle multiple collect_type objectives', () => {
      // GIVEN: objectives for bombs and lightning
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'bomb', target: 4 },
        { type: 'collect_type', tileType: 'lightning', target: 3 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: both types guaranteed
      expect(countType(result, 'bomb')).toBeGreaterThanOrEqual(4);
      expect(countType(result, 'lightning')).toBeGreaterThanOrEqual(3);
    });

    it('should only replace standard tiles, not other special tiles', () => {
      // GIVEN: grid with some existing special tiles
      const grid = makeStandardGrid(4); // small grid to make it tight
      grid[0][0].type = 'gold';
      grid[0][1].type = 'bomb';
      grid[0][2].type = 'rainbow';
      grid[0][3].type = 'ice';
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 2 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: existing specials untouched
      expect(result[0][0].type).toBe('gold');
      expect(result[0][1].type).toBe('bomb');
      expect(result[0][2].type).toBe('rainbow');
      expect(result[0][3].type).toBe('ice');
      // gems placed on standard tiles
      expect(countType(result, 'gem')).toBeGreaterThanOrEqual(2);
    });
  });

  describe('clear_all_type objectives', () => {
    it('should ensure at least 1 tile of the type exists', () => {
      // GIVEN: no ice tiles, objective is clear_all_type ice
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'clear_all_type', tileType: 'ice', target: 0 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: at least 1 ice tile exists (so objective is meaningful)
      expect(countType(result, 'ice')).toBeGreaterThanOrEqual(1);
    });

    it('should not modify board when tiles of that type already exist', () => {
      // GIVEN: 3 ice tiles already
      const grid = makeStandardGrid(6);
      grid[0][0].type = 'ice';
      grid[0][1].type = 'ice';
      grid[0][2].type = 'ice';
      const objectives: BlastObjective[] = [
        { type: 'clear_all_type', tileType: 'ice', target: 0 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: ice count unchanged
      expect(countType(result, 'ice')).toBe(3);
    });
  });

  describe('non-tile objectives', () => {
    it('should not modify the grid for score_target objectives', () => {
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'score_target', target: 50 },
      ];

      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: all tiles still standard
      expect(countType(result, 'standard')).toBe(36);
    });

    it('should not modify the grid for word_length objectives', () => {
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'word_length', target: 2, minWordLength: 5 },
      ];

      const result = guaranteeObjectiveTiles(grid, objectives);

      expect(countType(result, 'standard')).toBe(36);
    });
  });

  describe('edge cases', () => {
    it('should return grid unchanged when no objectives', () => {
      const grid = makeStandardGrid(6);
      const result = guaranteeObjectiveTiles(grid, []);
      expect(countType(result, 'standard')).toBe(36);
    });

    it('should not mutate the original grid', () => {
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 3 },
      ];

      guaranteeObjectiveTiles(grid, objectives);

      // Original grid unchanged
      expect(countType(grid, 'gem')).toBe(0);
      expect(countType(grid, 'standard')).toBe(36);
    });

    it('should handle case when board already violates standard ratio without crashing', () => {
      // GIVEN: tiny 2x2 grid (4 tiles), 3 already special (75% special — already over 40% budget)
      // With MIN_STANDARD_RATIO=0.6, minStandardCount=ceil(4*0.6)=3, conversionBudget=max(0,1-3)=0
      // The board already violates the ratio, so NO additional specials should be placed.
      const grid = makeStandardGrid(2);
      grid[0][0].type = 'gold';
      grid[0][1].type = 'bomb';
      grid[1][0].type = 'rainbow';
      // Only grid[1][1] is standard
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 3 },
      ];

      // WHEN: should not crash and should respect the minimum ratio
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: board is already over special budget — no gems placed (budget=0)
      expect(countType(result, 'gem')).toBe(0);
      // Existing specials preserved unchanged
      expect(result[0][0].type).toBe('gold');
      expect(result[0][1].type).toBe('bomb');
      expect(result[1][0].type).toBe('rainbow');
      // The one standard tile remains standard
      expect(result[1][1].type).toBe('standard');
    });

    it('should set correct hitsRemaining for placed tiles', () => {
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'ice', target: 2 },
      ];

      const result = guaranteeObjectiveTiles(grid, objectives);

      // Ice tiles have hitsRemaining = 2
      for (const row of result) {
        for (const tile of row) {
          if (tile.type === 'ice') {
            expect(tile.hitsRemaining).toBe(2);
          }
        }
      }
    });

    it('should set correct hitsRemaining for gem tiles', () => {
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 2 },
      ];

      const result = guaranteeObjectiveTiles(grid, objectives);

      for (const row of result) {
        for (const tile of row) {
          if (tile.type === 'gem') {
            expect(tile.hitsRemaining).toBe(3);
          }
        }
      }
    });
  });

  describe('BUGF-08 — clustering: objective tiles must be distributed across board', () => {
    it('should not place all bomb tiles in the first row (single run)', () => {
      // GIVEN: 6x6 all-standard grid, objective needs 6 bombs
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'bomb', target: 6 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: bombs should NOT all be in row 0 (top row).
      // With a proper Fisher-Yates shuffle on 36 positions, the probability
      // of all 6 bombs landing in row 0 is 6!/(36*35*34*33*32*31) < 0.000001%.
      const bombRows = new Set<number>();
      for (const row of result) {
        for (const tile of row) {
          if (tile.type === 'bomb') {
            bombRows.add(tile.row);
          }
        }
      }
      // Placed 6 bombs — they should appear in at least 2 different rows
      expect(bombRows.size).toBeGreaterThanOrEqual(2);
    });

    it('should distribute bombs across multiple rows over repeated placements (statistical)', () => {
      // Run placement 50 times and verify bombs appear in varied rows.
      // Without shuffle, bombs always land in row 0 cols 0-5 (first 6 standard tiles).
      // With shuffle, over 50 runs bombs should appear in rows 1-5 at least once.
      const rowsWithBombs = new Set<number>();

      for (let run = 0; run < 50; run++) {
        const grid = makeStandardGrid(6);
        const objectives: BlastObjective[] = [
          { type: 'collect_type', tileType: 'bomb', target: 6 },
        ];
        const result = guaranteeObjectiveTiles(grid, objectives);

        for (const row of result) {
          for (const tile of row) {
            if (tile.type === 'bomb') {
              rowsWithBombs.add(tile.row);
            }
          }
        }
      }

      // After 50 runs, bombs should have appeared in at least 3 different rows
      // (rows beyond the first row must appear — if no shuffle, only row 0 ever appears)
      expect(rowsWithBombs.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('BUGF-09 — minimum ratio: at least 60% of tiles must remain standard', () => {
    it('should maintain at least 60% standard tiles when objectives demand many specials', () => {
      // GIVEN: 6x6 grid (36 tiles) with 10 pre-existing specials + objective needing 15 more
      const grid = makeStandardGrid(6);
      // Place 10 existing specials
      let specialCount = 0;
      outer: for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (specialCount >= 10) break outer;
          grid[r][c].type = 'gold';
          specialCount++;
        }
      }

      // Objective demands 15 bomb tiles — combined with 10 existing that would be 25 specials
      // (69% of board), violating the 60% standard tile minimum
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'bomb', target: 15 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: at least 60% of 36 tiles must remain standard (>= 22 standard tiles)
      const standardCount = countType(result, 'standard');
      expect(standardCount).toBeGreaterThanOrEqual(Math.ceil(36 * 0.6));
    });

    it('should place as many objective tiles as possible within the 60% ratio budget', () => {
      // GIVEN: 6x6 all-standard grid, objective needs 20 gems (which would leave only 44%)
      // Budget: 40% of 36 = 14 special tiles allowed → only 14 gems should be placed
      const grid = makeStandardGrid(6);
      const objectives: BlastObjective[] = [
        { type: 'collect_type', tileType: 'gem', target: 20 },
      ];

      // WHEN
      const result = guaranteeObjectiveTiles(grid, objectives);

      // THEN: placed gems are capped by budget (max 40% of board = 14 tiles)
      const gemCount = countType(result, 'gem');
      const standardCount = countType(result, 'standard');

      // Standard tiles must be >= 60% of total
      expect(standardCount).toBeGreaterThanOrEqual(Math.ceil(36 * 0.6));
      // Some gems must have been placed (as many as budget allows)
      expect(gemCount).toBeGreaterThan(0);
      // Total tiles unchanged
      expect(gemCount + standardCount).toBe(36);
    });

    it('should export MIN_STANDARD_RATIO constant equal to 0.6', () => {
      expect(MIN_STANDARD_RATIO).toBe(0.6);
    });
  });
});
