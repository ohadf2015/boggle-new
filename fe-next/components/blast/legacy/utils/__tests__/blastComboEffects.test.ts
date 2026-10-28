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

function run(grid: BlastTileState[][], combo: SpecialCombo, wordLengthScale = 1) {
  const ctx: ComboEffectContext = {
    combo, next: grid, gridSize: 6, now: 1000, wordLengthScale,
    markCleared: (t) => { t.isCleared = true; },
  };
  return executeComboEffect(ctx);
}

const cleared = (grid: BlastTileState[][]) => grid.flat().filter(t => t.isCleared).length;

describe('executeComboEffect', () => {
  it('bomb_bomb clears a 5x5 around the midpoint and consumes both bombs', () => {
    const grid = makeGrid([{ row: 2, col: 2, type: 'bomb' }, { row: 2, col: 3, type: 'bomb' }]);
    const result = run(grid, {
      type: 'bomb_bomb', scoreMultiplier: 2, label: '',
      tiles: [{ row: 2, col: 2, tileType: 'bomb' }, { row: 2, col: 3, tileType: 'bomb' }],
    });
    expect(cleared(grid)).toBe(25);
    expect(result.processedBombKeys.sort()).toEqual(['2,2', '2,3']);
    expect(result.explosions[0].type).toBe('mega_blast');
  });

  it('gold_special blasts around the bomb and scales the radius with word length', () => {
    const small = makeGrid([{ row: 0, col: 0, type: 'gold' }, { row: 3, col: 3, type: 'bomb' }]);
    const combo: SpecialCombo = {
      type: 'gold_special', scoreMultiplier: 5, label: '',
      tiles: [{ row: 0, col: 0, tileType: 'gold' }, { row: 3, col: 3, tileType: 'bomb' }],
    };
    const result = run(small, combo, 1);
    expect(cleared(small)).toBe(25);
    expect(result.processedBombKeys).toEqual(['3,3']);

    const big = makeGrid([{ row: 0, col: 0, type: 'gold' }, { row: 3, col: 3, type: 'bomb' }]);
    run(big, combo, 2);
    expect(cleared(big)).toBe(36);
  });

  it('triple_special blasts around the middle tile', () => {
    const grid = makeGrid();
    run(grid, {
      type: 'triple_special', scoreMultiplier: 4, label: '',
      tiles: [{ row: 0, col: 0, tileType: 'gold' }, { row: 0, col: 1, tileType: 'gold' }, { row: 0, col: 2, tileType: 'diamond' }],
    });
    expect(cleared(grid)).toBe(12);
  });
});
