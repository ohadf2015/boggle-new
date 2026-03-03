import { detectSpecialCombos, type SpecialCombo, type BlastComboType } from '../blastCombos';
import type { BlastTileState, BlastTileType } from '../../types';

// ==================== Helpers ====================

/** Create a 6x6 grid of standard tiles */
function makeGrid(overrides: Array<{ row: number; col: number; type: BlastTileType }> = []): BlastTileState[][] {
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
  }
  return grid;
}

/** Build a simple path of cells */
function makePath(...coords: Array<[number, number]>): Array<{ row: number; col: number }> {
  return coords.map(([row, col]) => ({ row, col }));
}

// ==================== Tests ====================

describe('detectSpecialCombos', () => {
  // ── No combos ──────────────────────────────────────────────────────────────

  it('should return empty array when path has no special tiles', () => {
    const grid = makeGrid();
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toEqual([]);
  });

  it('should return empty array when path has only one special tile', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'bomb' }]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toEqual([]);
  });

  it('should ignore cleared tiles', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 2, type: 'bomb' },
    ]);
    grid[0][0].isCleared = true;
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toEqual([]);
  });

  // ── BOMB + BOMB ────────────────────────────────────────────────────────────

  it('should detect bomb_bomb combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 2, type: 'bomb' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toHaveLength(1);
    expect(combos[0].type).toBe('bomb_bomb');
    expect(combos[0].scoreMultiplier).toBe(3);
    expect(combos[0].tiles).toHaveLength(2);
  });

  // ── BOMB + LIGHTNING ───────────────────────────────────────────────────────

  it('should detect bomb_lightning combo', () => {
    const grid = makeGrid([
      { row: 1, col: 1, type: 'bomb' },
      { row: 1, col: 3, type: 'lightning' },
    ]);
    const path = makePath([1, 1], [1, 2], [1, 3]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toHaveLength(1);
    expect(combos[0].type).toBe('bomb_lightning');
    expect(combos[0].scoreMultiplier).toBe(4);
  });

  // ── BOMB + PRISM ───────────────────────────────────────────────────────────

  it('should detect bomb_prism combo', () => {
    const grid = makeGrid([
      { row: 2, col: 0, type: 'bomb' },
      { row: 2, col: 1, type: 'prism' },
    ]);
    const path = makePath([2, 0], [2, 1], [2, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toHaveLength(1);
    expect(combos[0].type).toBe('bomb_prism');
    expect(combos[0].scoreMultiplier).toBe(5);
  });

  // ── LIGHTNING + LIGHTNING ──────────────────────────────────────────────────

  it('should detect lightning_lightning combo', () => {
    const grid = makeGrid([
      { row: 3, col: 0, type: 'lightning' },
      { row: 3, col: 2, type: 'lightning' },
    ]);
    const path = makePath([3, 0], [3, 1], [3, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toHaveLength(1);
    expect(combos[0].type).toBe('lightning_lightning');
    expect(combos[0].scoreMultiplier).toBe(4);
  });

  // ── LIGHTNING + PRISM ──────────────────────────────────────────────────────

  it('should detect lightning_prism combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'lightning' },
      { row: 0, col: 1, type: 'prism' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toHaveLength(1);
    expect(combos[0].type).toBe('lightning_prism');
    expect(combos[0].scoreMultiplier).toBe(6);
  });

  // ── PRISM + PRISM (ULTIMATE) ──────────────────────────────────────────────

  it('should detect prism_prism combo (ultimate)', () => {
    const grid = makeGrid([
      { row: 1, col: 0, type: 'prism' },
      { row: 1, col: 2, type: 'prism' },
    ]);
    const path = makePath([1, 0], [1, 1], [1, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos).toHaveLength(1);
    expect(combos[0].type).toBe('prism_prism');
    expect(combos[0].scoreMultiplier).toBe(10);
  });

  // ── GOLD + SPECIAL ────────────────────────────────────────────────────────

  it('should detect gold_special when gold paired with bomb', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'bomb' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const goldCombo = combos.find(c => c.type === 'gold_special');
    expect(goldCombo).toBeDefined();
    expect(goldCombo!.scoreMultiplier).toBe(5);
  });

  it('should detect gold_special when gold paired with lightning', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 2, type: 'lightning' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const goldCombo = combos.find(c => c.type === 'gold_special');
    expect(goldCombo).toBeDefined();
  });

  it('should NOT detect gold_special when gold paired with only non-effect specials', () => {
    // gold + wildcard — wildcard has no area effect, so no gold_special
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'wildcard' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos.find(c => c.type === 'gold_special')).toBeUndefined();
  });

  // ── RAINBOW + SPECIAL ─────────────────────────────────────────────────────

  it('should detect rainbow_special when rainbow paired with bomb', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'bomb' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const rainbowCombo = combos.find(c => c.type === 'rainbow_special');
    expect(rainbowCombo).toBeDefined();
    expect(rainbowCombo!.scoreMultiplier).toBe(3);
  });

  // ── TRIPLE SPECIAL ────────────────────────────────────────────────────────

  it('should detect triple_special when 3+ special tiles in path', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'lightning' },
      { row: 0, col: 2, type: 'prism' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const tripleCombo = combos.find(c => c.type === 'triple_special');
    expect(tripleCombo).toBeDefined();
    expect(tripleCombo!.scoreMultiplier).toBe(2);
  });

  it('should NOT detect triple_special with only 2 specials', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'lightning' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos.find(c => c.type === 'triple_special')).toBeUndefined();
  });

  // ── Ordering / priority ───────────────────────────────────────────────────

  it('should return multiple combos when applicable (e.g., bomb_lightning + triple_special)', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'lightning' },
      { row: 0, col: 2, type: 'prism' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const types = combos.map(c => c.type);
    // Should have bomb_lightning, bomb_prism, lightning_prism, AND triple_special
    expect(types).toContain('bomb_lightning');
    expect(types).toContain('bomb_prism');
    expect(types).toContain('lightning_prism');
    expect(types).toContain('triple_special');
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('should handle empty path', () => {
    const grid = makeGrid();

    const combos = detectSpecialCombos([], grid);

    expect(combos).toEqual([]);
  });

  it('should handle single-cell path with special tile', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'bomb' }]);

    const combos = detectSpecialCombos(makePath([0, 0]), grid);

    expect(combos).toEqual([]);
  });

  it('should use highest-priority combo when same pair appears (bomb+bomb before individual)', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'bomb' },
      { row: 0, col: 2, type: 'bomb' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    // Should detect bomb_bomb (at least one) + triple_special
    expect(combos.find(c => c.type === 'bomb_bomb')).toBeDefined();
    expect(combos.find(c => c.type === 'triple_special')).toBeDefined();
  });

  it('should include label string for each combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 0, col: 2, type: 'prism' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos[0].label).toBe('blast.combo.prism_prism');
  });

  it('should include participating tile info in combo tiles array', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 2, type: 'lightning' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const combo = combos.find(c => c.type === 'bomb_lightning')!;
    expect(combo.tiles).toEqual([
      { row: 0, col: 0, tileType: 'bomb' },
      { row: 0, col: 2, tileType: 'lightning' },
    ]);
  });
});
