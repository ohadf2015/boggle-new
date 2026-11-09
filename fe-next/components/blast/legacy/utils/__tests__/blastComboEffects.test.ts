import { executeComboEffect, type ComboEffectContext } from '../blastComboEffects';
import type { BlastTileState, BlastTileType } from '../../types';
import type { SpecialCombo } from '../blastCombos';

function makeGrid(overrides: Array<{ row: number; col: number; type: BlastTileType }> = []): BlastTileState[][] {
  const grid: BlastTileState[][] = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => ({
      uid: `${r}-${c}`, row: r, col: c, type: 'standard' as BlastTileType, isCleared: false, activationEffect: null, hitsRemaining: 0,
    })),
  );
  for (const o of overrides) grid[o.row][o.col].type = o.type;
  return grid;
}

function run(grid: BlastTileState[][], combo: SpecialCombo) {
  const ctx: ComboEffectContext = {
    combo, next: grid, gridSize: 6, now: 1000,
    markCleared: (t) => { t.isCleared = true; },
  };
  return executeComboEffect(ctx);
}

const cleared = (grid: BlastTileState[][]) => grid.flat().filter(t => t.isCleared).length;

describe('executeComboEffect', () => {
  it('bomb_bomb fires a 3x3 at each bomb and consumes both bombs', () => {
    const grid = makeGrid([{ row: 2, col: 2, type: 'bomb' }, { row: 2, col: 3, type: 'bomb' }]);
    const result = run(grid, {
      type: 'bomb_bomb', scoreMultiplier: 2, label: '',
      tiles: [{ row: 2, col: 2, tileType: 'bomb' }, { row: 2, col: 3, tileType: 'bomb' }],
    });
    expect(cleared(grid)).toBe(12); // rows 1-3 x cols 1-4
    expect(grid[0][2].isCleared).toBe(false);
    expect(result.processedBombKeys.sort()).toEqual(['2,2', '2,3']);
    expect(result.explosions[0].type).toBe('mega_blast');
  });

  it('gold_special blasts a fixed 3x3 around the bomb, whatever the word length', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'gold' }, { row: 3, col: 3, type: 'bomb' }]);
    const result = run(grid, {
      type: 'gold_special', scoreMultiplier: 5, label: '',
      tiles: [{ row: 0, col: 0, tileType: 'gold' }, { row: 3, col: 3, tileType: 'bomb' }],
    });
    expect(cleared(grid)).toBe(9);
    expect(result.processedBombKeys).toEqual(['3,3']);
  });

  it('triple_special blasts a 3x3 around the middle tile', () => {
    const grid = makeGrid();
    run(grid, {
      type: 'triple_special', scoreMultiplier: 4, label: '',
      tiles: [{ row: 0, col: 0, tileType: 'gold' }, { row: 0, col: 1, tileType: 'gold' }, { row: 0, col: 2, tileType: 'diamond' }],
    });
    expect(cleared(grid)).toBe(6);
  });
});
