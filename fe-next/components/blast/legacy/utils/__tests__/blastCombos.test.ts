import { detectSpecialCombos } from '../blastCombos';
import type { BlastTileState, BlastTileType } from '../../types';

function makeGrid(overrides: Array<{ row: number; col: number; type: BlastTileType }> = []): BlastTileState[][] {
  const grid: BlastTileState[][] = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => ({
      uid: `${r}-${c}`, row: r, col: c, type: 'standard' as BlastTileType, isCleared: false, activationEffect: null, hitsRemaining: 0,
    })),
  );
  for (const o of overrides) grid[o.row][o.col].type = o.type;
  return grid;
}

const path = (...coords: Array<[number, number]>) => coords.map(([row, col]) => ({ row, col }));

describe('detectSpecialCombos', () => {
  it('finds nothing on a path of plain letters', () => {
    expect(detectSpecialCombos(path([0, 0], [0, 1], [0, 2]), makeGrid())).toEqual([]);
  });

  it('finds nothing with a single special', () => {
    const grid = makeGrid([{ row: 0, col: 1, type: 'bomb' }]);
    expect(detectSpecialCombos(path([0, 0], [0, 1], [0, 2]), grid)).toEqual([]);
  });

  it('pairs two bombs into a mega blast', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'bomb' }, { row: 0, col: 2, type: 'bomb' }]);
    const combos = detectSpecialCombos(path([0, 0], [0, 1], [0, 2]), grid);
    expect(combos.map(c => c.type)).toEqual(['bomb_bomb']);
    expect(combos[0].label).toBe('blast.combo.bomb_bomb');
  });

  it('pairs a coin with a bomb', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'gold' }, { row: 0, col: 1, type: 'bomb' }]);
    const [combo] = detectSpecialCombos(path([0, 0], [0, 1]), grid);
    expect(combo.type).toBe('gold_special');
    expect(combo.scoreMultiplier).toBe(5);
  });

  it('does not pair two coins', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'gold' }, { row: 0, col: 1, type: 'gold' }]);
    expect(detectSpecialCombos(path([0, 0], [0, 1]), grid)).toEqual([]);
  });

  it('turns three unclaimed specials into a triple', () => {
    const grid = makeGrid([
      { row: 0, col: 0, type: 'gold' }, { row: 0, col: 1, type: 'gold' }, { row: 0, col: 2, type: 'diamond' },
    ]);
    expect(detectSpecialCombos(path([0, 0], [0, 1], [0, 2]), grid).map(c => c.type)).toEqual(['triple_special']);
  });

  it('ignores cleared tiles', () => {
    const grid = makeGrid([{ row: 0, col: 0, type: 'bomb' }, { row: 0, col: 1, type: 'bomb' }]);
    grid[0][1].isCleared = true;
    expect(detectSpecialCombos(path([0, 0], [0, 1]), grid)).toEqual([]);
  });
});
