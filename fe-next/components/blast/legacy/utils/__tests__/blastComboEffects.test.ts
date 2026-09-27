import { executeComboEffect, type ComboEffectContext } from '../blastComboEffects';
import {
  type BlastTileState,
  type BlastTileType,
  TREASURE_GEM_COMPLETION_BONUS,
  FROST_REVEAL_BONUS,
} from '../../types';
import type { SpecialCombo } from '../blastCombos';

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
  overrides: Partial<Pick<ComboEffectContext, 'gridSize' | 'now' | 'wordLengthScale'>> = {},
): ComboEffectContext {
  return {
    combo,
    next: grid,
    gridSize: overrides.gridSize ?? 6,
    path,
    now: overrides.now ?? 1000,
    // Default to 1.0 (base scale) so existing tests are unaffected
    wordLengthScale: overrides.wordLengthScale ?? 1.0,
    markCleared: (t) => { t.isCleared = true; },
    isMultiHitAlive: (t) => t.hitsRemaining > 1 && (t.type === 'ice' || t.type === 'prism' || t.type === 'frozen' || t.type === 'gem'),
    hitMultiHitTile: (t) => { t.hitsRemaining--; t.activationEffect = `${t.type}-crack`; },
  };
}

// ==================== Tests ====================

describe('executeComboEffect', () => {

  // ── bomb_bomb ─────────────────────────────────────────────────────────────

  it('should clear 5x5 area around midpoint of two bomb tiles', () => {
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
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].type).toBe('mega_blast');
    expect(result.explosions[0].intensity).toBe(4);
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
    const result = executeComboEffect(makeCtx(grid, combo));
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
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(result.explosions.length).toBeGreaterThan(0);
    for (let r = 0; r < 6; r++) expect(grid[r][2].isCleared).toBe(true);
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
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(grid[2][0].isCleared).toBe(true);
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
    const result = executeComboEffect(makeCtx(grid, combo, path));
    expect(result.explosions.length).toBeGreaterThan(0);
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
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(result.explosions.length).toBeGreaterThan(0);
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
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].type).toBe('total_destruction');
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        expect(grid[r][c].isCleared).toBe(true);
      }
    }
  });

  // ── gold_special now fires area blast around the effect tile ────────────────

  it('gold_special: should fire area blast around the effect tile', () => {
    const grid = makeGrid();
    const combo = makeCombo('gold_special', [
      { row: 0, col: 0, tileType: 'gold' },
      { row: 0, col: 1, tileType: 'bomb' },
    ], 4);
    const result = executeComboEffect(makeCtx(grid, combo));
    // Effect tile (bomb at 0,1) gets area blast — nearby tiles should be hit
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  it('should not throw for any new combo type', () => {
    const newTypes: SpecialCombo['type'][] = [
      'bomb_magnet', 'bomb_gem', 'bomb_frozen',
      'lightning_rainbow', 'lightning_magnet', 'lightning_gem', 'lightning_frozen',
      'prism_rainbow', 'prism_magnet', 'prism_gem', 'prism_frozen',
      'rainbow_magnet', 'rainbow_gem', 'rainbow_frozen',
      'magnet_gem', 'magnet_frozen', 'gem_frozen',
      'gold_special', 'rainbow_special', 'triple_special',
    ];
    for (const type of newTypes) {
      const grid = makeGrid();
      const combo = makeCombo(type, [
        { row: 0, col: 0, tileType: 'bomb' },
        { row: 0, col: 1, tileType: 'rainbow' },
      ]);
      expect(() => executeComboEffect(makeCtx(grid, combo))).not.toThrow();
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
    const result = executeComboEffect(makeCtx(grid, combo));
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
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(result.processedBombKeys).toContain('0,0');
  });

  // ── bomb_rainbow (Prism Bomb) ─────────────────────────────────────────────

  it('bomb_rainbow: should clear cross (row+col) from bomb AND 3x3 around bomb', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'bomb' },
      { row: 2, col: 4, type: 'rainbow' },
    ]);
    const combo = makeCombo('bomb_rainbow', [
      { row: 2, col: 2, tileType: 'bomb' },
      { row: 2, col: 4, tileType: 'rainbow' },
    ], 4);
    const result = executeComboEffect(makeCtx(grid, combo));
    // Entire row 2 cleared (cross)
    for (let c = 0; c < 6; c++) expect(grid[2][c].isCleared).toBe(true);
    // Entire col 2 cleared (cross)
    for (let r = 0; r < 6; r++) expect(grid[r][2].isCleared).toBe(true);
    // 3x3 corners also cleared
    expect(grid[1][1].isCleared).toBe(true);
    expect(grid[3][3].isCleared).toBe(true);
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].type).toBe('combo');
    expect(result.explosions[0].intensity).toBe(4);
    expect(result.processedBombKeys).toContain('2,2');
  });

  it('bomb_rainbow: multi-hit tiles in cross/3x3 area get hit not cleared', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'bomb' },
      { row: 2, col: 4, type: 'rainbow' },
      { row: 2, col: 0, type: 'frozen', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('bomb_rainbow', [
      { row: 2, col: 2, tileType: 'bomb' },
      { row: 2, col: 4, tileType: 'rainbow' },
    ], 4);
    executeComboEffect(makeCtx(grid, combo));
    expect(grid[2][0].isCleared).toBe(false);
    expect(grid[2][0].hitsRemaining).toBe(1);
  });

  // ── bomb_magnet (Gravity Bomb) ────────────────────────────────────────────

  it('bomb_magnet: should execute vortex pull then 5x5 blast around magnet', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 3, col: 3, type: 'magnet' },
    ]);
    const combo = makeCombo('bomb_magnet', [
      { row: 0, col: 0, tileType: 'bomb' },
      { row: 3, col: 3, tileType: 'magnet' },
    ], 5);
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(grid[1][1].isCleared).toBe(true);
    expect(grid[5][5].isCleared).toBe(true);
    expect(grid[3][3].isCleared).toBe(true);
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].intensity).toBe(4);
    expect(result.processedBombKeys).toContain('0,0');
  });

  // ── bomb_gem (Gem Burst) ──────────────────────────────────────────────────

  it('bomb_gem: should instantly complete gem + fire bomb 3x3', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'bomb' },
      { row: 0, col: 5, type: 'gem', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('bomb_gem', [
      { row: 2, col: 2, tileType: 'bomb' },
      { row: 0, col: 5, tileType: 'gem' },
    ], 4);
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(grid[0][5].isCleared).toBe(true);
    expect(grid[1][1].isCleared).toBe(true);
    expect(grid[3][3].isCleared).toBe(true);
    expect(result.bonusScore).toBeGreaterThanOrEqual(TREASURE_GEM_COMPLETION_BONUS);
    expect(result.processedBombKeys).toContain('2,2');
  });

  // ── bomb_frozen (Cryo Blast) ──────────────────────────────────────────────

  it('bomb_frozen: should decrement all frost tiles on board then fire bomb 3x3', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'bomb' },
      { row: 0, col: 0, type: 'frozen', hitsRemaining: 2 },
      { row: 5, col: 5, type: 'frozen', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('bomb_frozen', [
      { row: 2, col: 2, tileType: 'bomb' },
      { row: 0, col: 0, tileType: 'frozen' },
    ], 3);
    executeComboEffect(makeCtx(grid, combo));
    expect(grid[0][0].hitsRemaining).toBe(1);
    expect(grid[5][5].hitsRemaining).toBe(1);
    expect(grid[1][1].isCleared).toBe(true);
    expect(grid[3][3].isCleared).toBe(true);
  });

  it('bomb_frozen: frost tiles with hitsRemaining=1 get marked cleared', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 5, col: 5, type: 'frozen', hitsRemaining: 1 },
    ]);
    const combo = makeCombo('bomb_frozen', [
      { row: 0, col: 0, tileType: 'bomb' },
      { row: 5, col: 5, tileType: 'frozen' },
    ], 3);
    executeComboEffect(makeCtx(grid, combo));
    expect(grid[5][5].isCleared).toBe(true);
  });

  it('bomb_frozen: should add bomb to processedBombKeys', () => {
    const grid = makeGrid([{ row: 1, col: 1, type: 'bomb' }]);
    const combo = makeCombo('bomb_frozen', [
      { row: 1, col: 1, tileType: 'bomb' },
      { row: 2, col: 2, tileType: 'frozen' },
    ], 3);
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(result.processedBombKeys).toContain('1,1');
  });

  // ── lightning_rainbow (Rainbow Strike) ───────────────────────────────────

  it('lightning_rainbow: should clear all columns where rainbow tiles exist + lightning column', () => {
    const grid = makeGrid([
      { row: 0, col: 1, type: 'lightning' },
      { row: 2, col: 3, type: 'rainbow' },
      { row: 4, col: 5, type: 'rainbow' },
    ]);
    const combo = makeCombo('lightning_rainbow', [
      { row: 0, col: 1, tileType: 'lightning' },
      { row: 2, col: 3, tileType: 'rainbow' },
    ], 5);
    const result = executeComboEffect(makeCtx(grid, combo));
    for (let r = 0; r < 6; r++) expect(grid[r][1].isCleared).toBe(true);
    for (let r = 0; r < 6; r++) expect(grid[r][3].isCleared).toBe(true);
    for (let r = 0; r < 6; r++) expect(grid[r][5].isCleared).toBe(true);
    expect(result.processedLightningKeys).toContain('0,1');
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  // ── lightning_magnet (Magnetic Storm) ────────────────────────────────────

  it('lightning_magnet: should execute vortex pull then clear columns of magnet area', () => {
    const grid = makeGrid([
      { row: 0, col: 1, type: 'lightning' },
      { row: 3, col: 3, type: 'magnet' },
    ]);
    const combo = makeCombo('lightning_magnet', [
      { row: 0, col: 1, tileType: 'lightning' },
      { row: 3, col: 3, tileType: 'magnet' },
    ], 5);
    const result = executeComboEffect(makeCtx(grid, combo));
    for (let r = 0; r < 6; r++) expect(grid[r][3].isCleared).toBe(true);
    expect(result.processedLightningKeys).toContain('0,1');
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  // ── lightning_gem (Shatter Strike) ───────────────────────────────────────

  it('lightning_gem: should instantly complete gem + clear lightning column', () => {
    const grid = makeGrid([
      { row: 0, col: 2, type: 'lightning' },
      { row: 3, col: 4, type: 'gem', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('lightning_gem', [
      { row: 0, col: 2, tileType: 'lightning' },
      { row: 3, col: 4, tileType: 'gem' },
    ], 4);
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(grid[3][4].isCleared).toBe(true);
    for (let r = 0; r < 6; r++) expect(grid[r][2].isCleared).toBe(true);
    expect(result.bonusScore).toBeGreaterThanOrEqual(TREASURE_GEM_COMPLETION_BONUS);
    expect(result.processedLightningKeys).toContain('0,2');
  });

  // ── lightning_frozen (Permafrost) ─────────────────────────────────────────

  it('lightning_frozen: should clear lightning column + decrement all frost tiles', () => {
    const grid = makeGrid([
      { row: 0, col: 2, type: 'lightning' },
      { row: 1, col: 0, type: 'frozen', hitsRemaining: 2 },
      { row: 5, col: 5, type: 'frozen', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('lightning_frozen', [
      { row: 0, col: 2, tileType: 'lightning' },
      { row: 1, col: 0, tileType: 'frozen' },
    ], 3);
    const result = executeComboEffect(makeCtx(grid, combo));
    for (let r = 0; r < 6; r++) expect(grid[r][2].isCleared).toBe(true);
    expect(grid[1][0].hitsRemaining).toBe(1);
    expect(grid[5][5].hitsRemaining).toBe(1);
    expect(result.processedLightningKeys).toContain('0,2');
    expect(result.explosions.length).toBeGreaterThan(0);
  });

  // ── prism_rainbow (Aurora) ────────────────────────────────────────────────

  it('prism_rainbow: should fire cross-clear from every cell in the word path', () => {
    const grid = makeGrid([
      { row: 1, col: 1, type: 'prism' },
      { row: 1, col: 3, type: 'rainbow' },
    ]);
    const combo = makeCombo('prism_rainbow', [
      { row: 1, col: 1, tileType: 'prism' },
      { row: 1, col: 3, tileType: 'rainbow' },
    ], 7);
    const path = makePath([1, 1], [1, 2], [1, 3]);
    const result = executeComboEffect(makeCtx(grid, combo, path));
    // Cross from each path cell: row 1 cleared and cols 1, 2, 3 cleared
    for (let c = 0; c < 6; c++) expect(grid[1][c].isCleared).toBe(true);
    for (let r = 0; r < 6; r++) expect(grid[r][1].isCleared).toBe(true);
    for (let r = 0; r < 6; r++) expect(grid[r][2].isCleared).toBe(true);
    for (let r = 0; r < 6; r++) expect(grid[r][3].isCleared).toBe(true);
    expect(result.explosions.length).toBeGreaterThan(0);
    expect(result.explosions[0].intensity).toBe(4);
  });

  // ── Task 2: Magnet, Gem, Frozen cross-type combos ─────────────────────────

  // ── magnet_gem (Gem Suction) ──────────────────────────────────────────────

  it('magnet_gem: completes ALL gem tiles on board with bonus per gem', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'magnet' },
      { row: 1, col: 1, type: 'gem', hitsRemaining: 3 },
      { row: 3, col: 3, type: 'gem', hitsRemaining: 3 },
      { row: 5, col: 5, type: 'gem', hitsRemaining: 3 },
    ]);
    const combo = makeCombo('magnet_gem', [
      { row: 0, col: 0, tileType: 'magnet' },
      { row: 1, col: 1, tileType: 'gem' },
    ], 5);
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(grid[1][1].isCleared).toBe(true);
    expect(grid[3][3].isCleared).toBe(true);
    expect(grid[5][5].isCleared).toBe(true);
    // 3 gems × TREASURE_GEM_COMPLETION_BONUS + vortex bonuses
    expect(result.bonusScore).toBeGreaterThanOrEqual(3 * TREASURE_GEM_COMPLETION_BONUS);
  });

  // ── magnet_frozen (Frost Vortex) ──────────────────────────────────────────

  it('magnet_frozen: vortex pull and advances all frost tiles by 1 hit', () => {
    const grid = makeGrid([
      { row: 3, col: 3, type: 'magnet' },
      { row: 0, col: 0, type: 'frozen', hitsRemaining: 2 },
      { row: 5, col: 5, type: 'frozen', hitsRemaining: 1 },
    ]);
    const combo = makeCombo('magnet_frozen', [
      { row: 3, col: 3, tileType: 'magnet' },
      { row: 0, col: 0, tileType: 'frozen' },
    ], 4);
    executeComboEffect(makeCtx(grid, combo));
    // First frost (hitsRemaining 2 → 1 after hit)
    expect(grid[0][0].hitsRemaining).toBe(1);
    // Second frost (hitsRemaining 1 → 0 → cleared)
    expect(grid[5][5].isCleared).toBe(true);
  });

  // ── gem_frozen (Crystal Prison) ───────────────────────────────────────────

  it('gem_frozen: completes gem AND frees frost simultaneously with combined bonus', () => {
    const grid = makeGrid([
      { row: 2, col: 2, type: 'gem', hitsRemaining: 3 },
      { row: 4, col: 4, type: 'frozen', hitsRemaining: 2 },
    ]);
    const combo = makeCombo('gem_frozen', [
      { row: 2, col: 2, tileType: 'gem' },
      { row: 4, col: 4, tileType: 'frozen' },
    ], 4);
    const result = executeComboEffect(makeCtx(grid, combo));
    expect(grid[2][2].isCleared).toBe(true);
    expect(grid[4][4].isCleared).toBe(true);
    expect(result.bonusScore).toBe(TREASURE_GEM_COMPLETION_BONUS + FROST_REVEAL_BONUS);
  });

});
