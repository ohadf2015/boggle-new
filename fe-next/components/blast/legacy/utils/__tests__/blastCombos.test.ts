import { detectSpecialCombos } from '../blastCombos';
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
    expect(combos[0].scoreMultiplier).toBe(2);
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
    expect(combos[0].scoreMultiplier).toBe(3);
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
    expect(combos[0].scoreMultiplier).toBe(4);
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
    expect(combos[0].scoreMultiplier).toBe(3);
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
    expect(combos[0].scoreMultiplier).toBe(5);
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
    expect(combos[0].scoreMultiplier).toBe(6);
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
    // gold + standard — standard has no area effect, so no gold_special
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'standard' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos.find(c => c.type === 'gold_special')).toBeUndefined();
  });

  // ── RAINBOW + SPECIAL ─────────────────────────────────────────────────────

  it('should detect bomb_rainbow (not rainbow_special) when rainbow paired with bomb', () => {
    // Specific pair combo takes priority over generic rainbow_special catch-all
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'bomb' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    const bombRainbowCombo = combos.find(c => c.type === 'bomb_rainbow');
    expect(bombRainbowCombo).toBeDefined();
    expect(bombRainbowCombo!.scoreMultiplier).toBe(3);
    // rainbow_special should NOT fire — bomb_rainbow is the specific pair
    expect(combos.find(c => c.type === 'rainbow_special')).toBeUndefined();
  });

  // ── TRIPLE SPECIAL ────────────────────────────────────────────────────────

  it('should detect triple_special when 3+ unclaimed special tiles remain after pair combos', () => {
    // 4 gold tiles: gold_special claims 1 gold + 1 effect tile (needs effect → none here)
    // So all 4 gold tiles stay unclaimed → 4 unclaimed ≥ 3 → triple_special
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'gold' },
      { row: 0, col: 2, type: 'gold' },
      { row: 0, col: 3, type: 'gold' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2], [0, 3]);

    const combos = detectSpecialCombos(path, grid);

    const tripleCombo = combos.find(c => c.type === 'triple_special');
    expect(tripleCombo).toBeDefined();
    expect(tripleCombo!.scoreMultiplier).toBe(4);
  });

  it('should NOT detect triple_special when all 3 specials are claimed by pair combos', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'lightning' },
      { row: 0, col: 2, type: 'prism' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    expect(combos.find(c => c.type === 'triple_special')).toBeUndefined();
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

  it('should return only one pair combo per tile (deduplication)', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'lightning' },
      { row: 0, col: 2, type: 'prism' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    // With dedup, highest-priority pair claims tiles first; remaining tiles can't
    // form more pairs. Should NOT have triple_special (all tiles claimed).
    const types = combos.map(c => c.type);
    // lightning_prism is highest priority of these three pairs
    expect(types).toContain('lightning_prism');
    // Each tile only used once — at most 1 pair combo from 3 tiles
    const pairCombos = combos.filter(c => c.type !== 'triple_special' && c.type !== 'gold_special' && c.type !== 'rainbow_special');
    expect(pairCombos.length).toBeLessThanOrEqual(1);
    expect(types).not.toContain('triple_special');
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

  it('should use highest-priority combo when same pair appears (bomb+bomb claims 2, no triple)', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'bomb' },
      { row: 0, col: 2, type: 'bomb' },
    ]);
    const path = makePath([0, 0], [0, 1], [0, 2]);

    const combos = detectSpecialCombos(path, grid);

    // bomb_bomb claims 2 tiles, only 1 unclaimed → no triple_special
    expect(combos.find(c => c.type === 'bomb_bomb')).toBeDefined();
    expect(combos.find(c => c.type === 'triple_special')).toBeUndefined();
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

  // ── 22 NEW PAIRS (28-pair matrix) ─────────────────────────────────────────

  it('should detect bomb_rainbow combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'rainbow' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'bomb_rainbow')).toBeDefined();
    expect(combos.find(c => c.type === 'bomb_rainbow')!.scoreMultiplier).toBe(3);
  });

  it('should detect bomb_magnet combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'magnet' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'bomb_magnet')).toBeDefined();
    expect(combos.find(c => c.type === 'bomb_magnet')!.scoreMultiplier).toBe(4);
  });

  it('should detect bomb_gem combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'gem' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'bomb_gem')).toBeDefined();
    expect(combos.find(c => c.type === 'bomb_gem')!.scoreMultiplier).toBe(3);
  });

  it('should detect bomb_frozen combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'frozen' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'bomb_frozen')).toBeDefined();
    expect(combos.find(c => c.type === 'bomb_frozen')!.scoreMultiplier).toBe(2);
  });

  it('should detect lightning_rainbow combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'lightning' },
      { row: 0, col: 1, type: 'rainbow' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'lightning_rainbow')).toBeDefined();
    expect(combos.find(c => c.type === 'lightning_rainbow')!.scoreMultiplier).toBe(4);
  });

  it('should detect lightning_magnet combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'lightning' },
      { row: 0, col: 1, type: 'magnet' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'lightning_magnet')).toBeDefined();
    expect(combos.find(c => c.type === 'lightning_magnet')!.scoreMultiplier).toBe(4);
  });

  it('should detect lightning_gem combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'lightning' },
      { row: 0, col: 1, type: 'gem' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'lightning_gem')).toBeDefined();
    expect(combos.find(c => c.type === 'lightning_gem')!.scoreMultiplier).toBe(3);
  });

  it('should detect lightning_frozen combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'lightning' },
      { row: 0, col: 1, type: 'frozen' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'lightning_frozen')).toBeDefined();
    expect(combos.find(c => c.type === 'lightning_frozen')!.scoreMultiplier).toBe(2);
  });

  it('should detect prism_rainbow combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 0, col: 1, type: 'rainbow' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'prism_rainbow')).toBeDefined();
    expect(combos.find(c => c.type === 'prism_rainbow')!.scoreMultiplier).toBe(5);
  });

  it('should detect prism_magnet combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 0, col: 1, type: 'magnet' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'prism_magnet')).toBeDefined();
    expect(combos.find(c => c.type === 'prism_magnet')!.scoreMultiplier).toBe(5);
  });

  it('should detect prism_gem combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 0, col: 1, type: 'gem' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'prism_gem')).toBeDefined();
    expect(combos.find(c => c.type === 'prism_gem')!.scoreMultiplier).toBe(4);
  });

  it('should detect prism_frozen combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'prism' },
      { row: 0, col: 1, type: 'frozen' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'prism_frozen')).toBeDefined();
    expect(combos.find(c => c.type === 'prism_frozen')!.scoreMultiplier).toBe(3);
  });

  it('should detect rainbow_magnet combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'magnet' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'rainbow_magnet')).toBeDefined();
    expect(combos.find(c => c.type === 'rainbow_magnet')!.scoreMultiplier).toBe(3);
  });

  it('should detect rainbow_gem combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'gem' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'rainbow_gem')).toBeDefined();
    expect(combos.find(c => c.type === 'rainbow_gem')!.scoreMultiplier).toBe(3);
  });

  it('should detect rainbow_frozen combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'rainbow' },
      { row: 0, col: 1, type: 'frozen' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'rainbow_frozen')).toBeDefined();
    expect(combos.find(c => c.type === 'rainbow_frozen')!.scoreMultiplier).toBe(2);
  });

  it('should detect magnet_gem combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'magnet' },
      { row: 0, col: 1, type: 'gem' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'magnet_gem')).toBeDefined();
    expect(combos.find(c => c.type === 'magnet_gem')!.scoreMultiplier).toBe(4);
  });

  it('should detect magnet_frozen combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'magnet' },
      { row: 0, col: 1, type: 'frozen' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'magnet_frozen')).toBeDefined();
    expect(combos.find(c => c.type === 'magnet_frozen')!.scoreMultiplier).toBe(3);
  });

  it('should detect gem_frozen combo', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gem' },
      { row: 0, col: 1, type: 'frozen' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'gem_frozen')).toBeDefined();
    expect(combos.find(c => c.type === 'gem_frozen')!.scoreMultiplier).toBe(3);
  });

  // ── Priority: specific pair suppresses generic rainbow_special ───────────

  it('should NOT return rainbow_special for bomb+rainbow when bomb_rainbow is detected', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'rainbow' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'bomb_rainbow')).toBeDefined();
    expect(combos.find(c => c.type === 'rainbow_special')).toBeUndefined();
  });

  it('should still detect gold_special for gold+bomb (gold not in 28-pair matrix)', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'bomb' },
    ]);
    const combos = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.find(c => c.type === 'gold_special')).toBeDefined();
  });

  it('should detect triple_special only when 3+ unclaimed specials remain (new tile types)', () => {
    // 3 tiles but pair combos claim them → no triple_special
    const grid3 = makeGrid([
      { row: 0, col: 0, type: 'bomb' },
      { row: 0, col: 1, type: 'rainbow' },
      { row: 0, col: 2, type: 'magnet' },
    ]);
    const combos3 = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid3);
    expect(combos3.find(c => c.type === 'triple_special')).toBeUndefined();

    // 3 gold tiles (not in pair matrix) → all unclaimed → triple_special
    const grid3g = makeGrid([
      { row: 0, col: 0, type: 'gold' },
      { row: 0, col: 1, type: 'gold' },
      { row: 0, col: 2, type: 'gold' },
    ]);
    const combos3g = detectSpecialCombos(makePath([0, 0], [0, 1], [0, 2]), grid3g);
    expect(combos3g.find(c => c.type === 'triple_special')).toBeDefined();
  });
});
