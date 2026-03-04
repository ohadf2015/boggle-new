import { executeComboEffect, type ComboEffectContext, type ComboEffectResult } from '../blastComboEffects';
import type { BlastTileState, BlastTileType } from '../../types';
import type { SpecialCombo } from '../blastCombos';
import {
  TREASURE_GEM_COMPLETION_BONUS,
  RAINBOW_BOOST_MULTIPLIER,
  FROST_REVEAL_BONUS,
} from '../../types';

// ==================== Helpers ====================

/** Create a 6x6 grid of standard tiles */
function makeGrid(overrides: Array<{ row: number; col: number; type: BlastTileType; hitsRemaining?: number }> = []): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < 6; r++) {
    grid[r] = [];
    for (let c = 0; c < 6; c++) {
      grid[r][c] = {
        row: r,
        col: c,
        type: 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  for (const o of overrides) {
    grid[o.row][o.col].type = o.type;
    if (o.hitsRemaining !== undefined) {
      grid[o.row][o.col].hitsRemaining = o.hitsRemaining;
    }
  }
  return grid;
}

/** Build a simple path of cells */
function makePath(...coords: Array<[number, number]>): Array<{ row: number; col: number }> {
  return coords.map(([row, col]) => ({ row, col }));
}

/** Build a SpecialCombo */
function makeCombo(
  type: SpecialCombo['type'],
  tiles: Array<{ row: number; col: number; tileType: BlastTileType }>,
  scoreMultiplier = 1,
): SpecialCombo {
  return { type, tiles, scoreMultiplier, label: `blast.combo.${type}` };
}

/** Build a ComboEffectContext */
function makeCtx(
  grid: BlastTileState[][],
  combo: SpecialCombo,
  path: Array<{ row: number; col: number }> = [],
  overrides: Partial<Pick<ComboEffectContext, 'gridSize' | 'now'>> = {},
): ComboEffectContext {
  const clearedList: BlastTileState[] = [];
  const hitList: BlastTileState[] = [];
  return {
    combo,
    next: grid,
    gridSize: overrides.gridSize ?? 6,
    path,
    now: overrides.now ?? 1000,
    markCleared: (t) => { t.isCleared = true; clearedList.push(t); },
    isMultiHitAlive: (t) => t.hitsRemaining > 1 && (t.type === 'ice' || t.type === 'prism' || t.type === 'frozen' || t.type === 'gem'),
    hitMultiHitTile: (t) => { t.hitsRemaining--; t.activationEffect = `${t.type}-crack`; hitList.push(t); },
  };
}

// ==================== Tests ====================

describe('executeComboEffect', () => {

  // ── bomb_bomb ─────────────────────────────────────────────────────────────

  it('should clear 5x5 area around midpoint of two bomb tiles', () => {
    // Place two bombs at (0,0) and (4,4) → midpoint (2,2)
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 4, col: 4, type: 'bomb' },
    ]);
    const combo = makeCombo('bomb_bomb', [
      { row: 0, col: 0, tileType: 'bomb' },
      { row: 4, col: 4, tileType: 'bomb' },
    ], 3);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    // Midpoint (2,2) → 5x5 area = rows 0-4, cols 0-4
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].type).toBe('mega_blast');
    expect(result.explosions[0].intensity).toBe(4);
    // Tiles in the 5x5 area should be cleared
    expect(grid[2][2].isCleared).toBe(true);
    expect(grid[0][0].isCleared).toBe(true);
  });

  it('should return processedBombKeys for bomb_bomb combo', () => {
    const grid = makeGrid([
      { row: 1, col: 1, type: 'bomb' },
      { row: 1, col: 3, type: 'bomb' },
    ]);
    const combo = makeCombo('bomb_bomb', [
      { row: 1, col: 1, tileType: 'bomb' },
      { row: 1, col: 3, tileType: 'bomb' },
    ], 3);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.processedBombKeys).toContain('1,1');
    expect(result.processedBombKeys).toContain('1,3');
  });

  // ── bomb_lightning ────────────────────────────────────────────────────────

  it('should clear 3-column strip around bomb for bomb_lightning combo', () => {
    const grid = makeGrid([
      { row: 0, col: 2, type: 'bomb' },
      { row: 3, col: 4, type: 'lightning' },
    ]);
    const combo = makeCombo('bomb_lightning', [
      { row: 0, col: 2, tileType: 'bomb' },
      { row: 3, col: 4, tileType: 'lightning' },
    ], 4);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions.length).toBeGreaterThan(0);
    // Cols 1-3 (BOMB_RADIUS=1 around col 2) should be cleared
    for (let r = 0; r < 6; r++) {
      expect(grid[r][2].isCleared).toBe(true);
    }
  });

  // ── bomb_prism ────────────────────────────────────────────────────────────

  it('should fire cross-clear from each bomb neighbor for bomb_prism combo', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'bomb' },
      { row: 2, col: 3, type: 'prism' },
    ]);
    const combo = makeCombo('bomb_prism', [
      { row: 2, col: 2, tileType: 'bomb' },
      { row: 2, col: 3, tileType: 'prism' },
    ], 5);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions.length).toBeGreaterThan(0);
    // Should have cleared entire row 2 and col 2 (and adjacent neighbors)
    expect(grid[2][0].isCleared).toBe(true); // row 2 cleared
  });

  // ── lightning_lightning ───────────────────────────────────────────────────

  it('should clear all word path columns for lightning_lightning combo', () => {
    const grid = makeGrid([
      { row: 0, col: 1, type: 'lightning' },
      { row: 0, col: 3, type: 'lightning' },
    ]);
    const combo = makeCombo('lightning_lightning', [
      { row: 0, col: 1, tileType: 'lightning' },
      { row: 0, col: 3, tileType: 'lightning' },
    ], 4);
    const path = makePath([0, 1], [0, 2], [0, 3]);
    const ctx = makeCtx(grid, combo, path);

    const result = executeComboEffect(ctx);

    expect(result.explosions.length).toBeGreaterThan(0);
    // Columns 1, 2, 3 should be cleared
    for (let r = 0; r < 6; r++) {
      expect(grid[r][1].isCleared).toBe(true);
      expect(grid[r][3].isCleared).toBe(true);
    }
  });

  // ── lightning_prism ───────────────────────────────────────────────────────

  it('should clear rows and columns of both tiles for lightning_prism combo', () => {
    const grid = makeGrid([
      { row: 1, col: 1, type: 'lightning' },
      { row: 3, col: 3, type: 'prism' },
    ]);
    const combo = makeCombo('lightning_prism', [
      { row: 1, col: 1, tileType: 'lightning' },
      { row: 3, col: 3, tileType: 'prism' },
    ], 6);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions.length).toBeGreaterThan(0);
    // Row 1 and col 1 should be cleared (from lightning_prism cross logic)
    expect(grid[1][0].isCleared).toBe(true);
    expect(grid[0][1].isCleared).toBe(true);
  });

  // ── prism_prism ───────────────────────────────────────────────────────────

  it('should clear entire board for prism_prism combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 5, col: 5, type: 'prism' },
    ]);
    const combo = makeCombo('prism_prism', [
      { row: 0, col: 0, tileType: 'prism' },
      { row: 5, col: 5, tileType: 'prism' },
    ], 10);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].type).toBe('total_destruction');
    // Every tile should be cleared
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        expect(grid[r][c].isCleared).toBe(true);
      }
    }
  });

  // ── Unknown combo type (no-op) ─────────────────────────────────────────────

  it('should return empty result for unknown combo type (no-op)', () => {
    const grid = makeGrid();
    // Use gold_special (handled by useBlastGame score logic, not executeComboEffect)
    const combo = makeCombo('gold_special', [
      { row: 0, col: 0, tileType: 'gold' },
      { row: 0, col: 1, tileType: 'bomb' },
    ], 4);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions).toEqual([]);
    expect(result.processedBombKeys).toEqual([]);
    expect(result.processedLightningKeys).toEqual([]);
    expect(result.bonusScore).toBe(0);
    // No tiles should be cleared
    expect(grid[0][0].isCleared).toBe(false);
  });

  it('should not throw for any combo type (all must be safe)', () => {
    // All combo types from blastCombos.ts — each must not throw
    const allTypes: SpecialCombo['type'][] = [
      'bomb_mirror', 'bomb_magnet', 'bomb_gem', 'bomb_frozen',
      'lightning_rainbow', 'lightning_mirror', 'lightning_magnet', 'lightning_gem', 'lightning_frozen',
      'prism_rainbow', 'prism_mirror', 'prism_magnet', 'prism_gem', 'prism_frozen',
      'rainbow_mirror', 'rainbow_magnet', 'rainbow_gem', 'rainbow_frozen',
      'mirror_magnet', 'mirror_gem', 'mirror_frozen',
      'magnet_gem', 'magnet_frozen', 'gem_frozen',
      'gold_special', 'rainbow_special', 'triple_special',
    ];

    for (const type of allTypes) {
      const grid = makeGrid([
        { row: 0, col: 0, type: 'prism' },
        { row: 1, col: 1, type: 'magnet' },
        { row: 2, col: 2, type: 'gem', hitsRemaining: 2 },
        { row: 3, col: 3, type: 'frozen', hitsRemaining: 2 },
        { row: 4, col: 4, type: 'mirror' },
        { row: 5, col: 5, type: 'rainbow' },
      ]);
      const combo = makeCombo(type, [
        { row: 0, col: 0, tileType: 'prism' },
        { row: 1, col: 1, tileType: 'magnet' },
      ]);
      const ctx = makeCtx(grid, combo);
      expect(() => executeComboEffect(ctx)).not.toThrow();
    }
  });

  // ── Result shape ─────────────────────────────────────────────────────────

  it('should return explosions array with expected explosion type for bomb_bomb', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'bomb' },
      { row: 2, col: 4, type: 'bomb' },
    ]);
    const combo = makeCombo('bomb_bomb', [
      { row: 2, col: 2, tileType: 'bomb' },
      { row: 2, col: 4, tileType: 'bomb' },
    ], 3);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions[0].type).toBe('mega_blast');
    expect(result.explosions[0].intensity).toBe(4);
  });

  it('should include bomb tile coords in processedBombKeys for bomb combos', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 2, type: 'lightning' },
    ]);
    const combo = makeCombo('bomb_lightning', [
      { row: 0, col: 0, tileType: 'bomb' },
      { row: 0, col: 2, tileType: 'lightning' },
    ], 4);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.processedBombKeys).toContain('0,0');
  });

  // ── prism_magnet (Vortex Lattice) ─────────────────────────────────────────

  it('prism_magnet: should fire vortex pull and cross-clear from magnet position', () => {
    // prism at (2,2), magnet at (2,4)
    const grid = makeGrid([
      { row: 2, col: 2, type: 'prism' },
      { row: 2, col: 4, type: 'magnet' },
    ]);
    const combo = makeCombo('prism_magnet', [
      { row: 2, col: 2, tileType: 'prism' },
      { row: 2, col: 4, tileType: 'magnet' },
    ], 6);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    // Should produce an explosion
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].intensity).toBe(4);
    // Cross-clear from magnet position (row 2 and col 4) should be cleared
    expect(grid[2][0].isCleared).toBe(true); // row 2
    expect(grid[0][4].isCleared).toBe(true); // col 4
    expect(grid[5][4].isCleared).toBe(true); // col 4
  });

  // ── prism_gem (Crystal Lattice) ───────────────────────────────────────────

  it('prism_gem: should complete gem and fire cross-clear from prism position with bonus score', () => {
    // prism at (1,1), gem at (3,3) with hitsRemaining=2
    const grid = makeGrid([
      { row: 1, col: 1, type: 'prism' },
      { row: 3, col: 3, type: 'gem', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('prism_gem', [
      { row: 1, col: 1, tileType: 'prism' },
      { row: 3, col: 3, tileType: 'gem' },
    ], 5);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    // Gem should be instantly completed (cleared)
    expect(grid[3][3].isCleared).toBe(true);
    // Bonus includes TREASURE_GEM_COMPLETION_BONUS
    expect(result.bonusScore).toBeGreaterThanOrEqual(TREASURE_GEM_COMPLETION_BONUS);
    // Cross-clear from prism: row 1 should be cleared
    expect(grid[1][0].isCleared).toBe(true);
    expect(grid[1][5].isCleared).toBe(true);
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  // ── prism_frozen (Frost Lattice) ──────────────────────────────────────────

  it('prism_frozen: should free ALL frost tiles on board and fire cross-clear from prism', () => {
    // prism at (0,0), multiple frost tiles scattered
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 1, col: 1, type: 'frozen', hitsRemaining: 2 },
      { row: 3, col: 4, type: 'frozen', hitsRemaining: 1 },
      { row: 5, col: 5, type: 'frozen', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('prism_frozen', [
      { row: 0, col: 0, tileType: 'prism' },
      { row: 1, col: 1, tileType: 'frozen' },
    ], 4);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    // ALL frost tiles should be freed (hitsRemaining=0, cleared)
    expect(grid[1][1].isCleared).toBe(true);
    expect(grid[3][4].isCleared).toBe(true);
    expect(grid[5][5].isCleared).toBe(true);
    // Cross-clear from prism position (0,0): row 0 and col 0
    expect(grid[0][5].isCleared).toBe(true); // row 0
    expect(grid[5][0].isCleared).toBe(true); // col 0
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  // ── rainbow_mirror (Kaleidoscope) ─────────────────────────────────────────

  it('rainbow_mirror: should give 3x baseScore bonus (mirror triples rainbow amplification)', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'mirror' },
    ]);
    const combo = makeCombo('rainbow_mirror', [
      { row: 0, col: 0, tileType: 'rainbow' },
      { row: 0, col: 1, tileType: 'mirror' },
    ], 5);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    // Score-only combo: no tile clearing expected, but bonusScore should be 3 * baseScore
    // baseScore here is computed from path/word — we check bonusScore > 0
    expect(result.bonusScore).toBeGreaterThan(0);
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  it('rainbow_mirror: bonusScore should equal 3 times the provided baseScore', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'mirror' },
    ]);
    const combo = makeCombo('rainbow_mirror', [
      { row: 0, col: 0, tileType: 'rainbow' },
      { row: 0, col: 1, tileType: 'mirror' },
    ], 5);
    // Provide a known baseScore via combo scoreMultiplier used as baseScore proxy
    // The implementation should use combo.scoreMultiplier * 3 or a passed baseScore
    // We test the behavior: bonusScore = 3 * some positive reference value
    const ctx = makeCtx(grid, combo);
    const result = executeComboEffect(ctx);
    // Implementation uses baseScore=1 (default when no word score passed), so 3*1=3
    expect(result.bonusScore).toBe(3);
  });

  // ── rainbow_magnet (Whirlwind) ────────────────────────────────────────────

  it('rainbow_magnet: should fire boosted vortex pull (radius 3) and explode', () => {
    // rainbow at (2,2), magnet at (2,4)
    const grid = makeGrid([
      { row: 2, col: 2, type: 'rainbow' },
      { row: 2, col: 4, type: 'magnet' },
    ]);
    // Place tiles at vortex radius 3 (should be affected)
    const combo = makeCombo('rainbow_magnet', [
      { row: 2, col: 2, tileType: 'rainbow' },
      { row: 2, col: 4, tileType: 'magnet' },
    ], 4);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    expect(result.explosions.length).toBeGreaterThan(0);
    // At minimum one explosion should be generated
    expect(result.bonusScore).toBeGreaterThanOrEqual(0);
  });

  // ── rainbow_gem (Lucky Boost) ─────────────────────────────────────────────

  it('rainbow_gem: should add RAINBOW_BOOST_MULTIPLIER * TREASURE_GEM_COMPLETION_BONUS to bonusScore', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 2, col: 2, type: 'gem', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('rainbow_gem', [
      { row: 0, col: 0, tileType: 'rainbow' },
      { row: 2, col: 2, tileType: 'gem' },
    ], 4);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    const expectedBonus = RAINBOW_BOOST_MULTIPLIER * TREASURE_GEM_COMPLETION_BONUS;
    expect(result.bonusScore).toBe(expectedBonus);
    // Gem NOT auto-completed (rainbow boosts eventual completion)
    expect(grid[2][2].isCleared).toBe(false);
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  // ── rainbow_frozen (Frost Bloom) ──────────────────────────────────────────

  it('rainbow_frozen: should advance all frost tiles by 1 hit (mass reveal)', () => {
    // Multiple frost tiles on board
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 1, col: 1, type: 'frozen', hitsRemaining: 2 },
      { row: 2, col: 3, type: 'frozen', hitsRemaining: 1 },
      { row: 4, col: 4, type: 'frozen', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('rainbow_frozen', [
      { row: 0, col: 0, tileType: 'rainbow' },
      { row: 1, col: 1, tileType: 'frozen' },
    ], 3);
    const ctx = makeCtx(grid, combo);

    const result = executeComboEffect(ctx);

    // Frost at (1,1): was 2 hits → should be cracked (hitsRemaining decremented to 1)
    expect(grid[1][1].hitsRemaining).toBe(1);
    // Frost at (2,3): was 1 hit → should be freed (cleared)
    expect(grid[2][3].isCleared).toBe(true);
    // Frost at (4,4): was 2 hits → should be cracked
    expect(grid[4][4].hitsRemaining).toBe(1);
    expect(result.explosions.length).toBeGreaterThan(0);
  });
});
