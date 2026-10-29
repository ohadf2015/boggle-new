import { describe, it, expect } from 'vitest';
import { planClearFx, nextShimmer, listSpecialTiles, createCellsChannel } from '../blastFxEvents';

const tile = (row: number, col: number, type: 'standard' | 'gold' | 'bomb' | 'diamond' = 'standard') => ({ row, col, type });

describe('planClearFx', () => {
  it('maps each special tile to its own signature cue at the cell centre', () => {
    const plan = planClearFx([tile(0, 0, 'bomb'), tile(0, 1, 'gold'), tile(1, 1, 'diamond'), tile(1, 2)], {
      cellSize: 100,
      isWordPop: true,
      score: 10,
    });
    expect(plan.cues.map((c) => c.kind)).toEqual(['bomb', 'coin', 'diamond']);
    expect(plan.cues[0]).toMatchObject({ x: 50, y: 50 });
    expect(plan.cues[2]).toMatchObject({ x: 150, y: 150 });
  });

  it('numbers coins in a stack so each chime can climb', () => {
    const plan = planClearFx([tile(0, 0, 'gold'), tile(0, 1), tile(0, 2, 'gold'), tile(0, 3, 'gold')], {
      cellSize: 10,
      isWordPop: true,
      score: 0,
    });
    expect(plan.cues.filter((c) => c.kind === 'coin').map((c) => c.stackIndex)).toEqual([0, 1, 2]);
  });

  it('grows bomb power when several bombs go off together', () => {
    const one = planClearFx([tile(0, 0, 'bomb')], { cellSize: 10, isWordPop: true, score: 0 });
    const two = planClearFx([tile(0, 0, 'bomb'), tile(3, 3, 'bomb')], { cellSize: 10, isWordPop: true, score: 0 });
    expect(two.bombPower).toBeGreaterThan(one.bombPower);
    expect(one.bombPower).toBeGreaterThan(0);
  });

  it('scales word intensity from the word only on the word pop', () => {
    const big = Array.from({ length: 8 }, (_, i) => tile(0, i));
    const pop = planClearFx(big, { cellSize: 10, isWordPop: true, score: 40 });
    const chain = planClearFx(big, { cellSize: 10, isWordPop: false, score: 40 });
    expect(pop.word?.bigWord).toBe(true);
    expect(chain.word).toBeNull();
  });

  it('gives the centroid of the cleared tiles', () => {
    const plan = planClearFx([tile(0, 0), tile(2, 2)], { cellSize: 10, isWordPop: true, score: 0 });
    expect(plan.centroid).toEqual({ x: 15, y: 15 });
  });

  it('returns an empty plan for no tiles', () => {
    const plan = planClearFx([], { cellSize: 10, isWordPop: true, score: 0 });
    expect(plan.cues).toEqual([]);
    expect(plan.word).toBeNull();
    expect(plan.bombPower).toBe(0);
  });
});

describe('nextShimmer', () => {
  const specials = [tile(0, 0, 'bomb'), tile(1, 1, 'gold'), tile(2, 2, 'diamond')];

  it('picks a special tile deterministically from the roll', () => {
    expect(nextShimmer(specials, 0, 0, 3)).toEqual(specials[0]);
    expect(nextShimmer(specials, 0.99, 0, 3)).toEqual(specials[2]);
  });

  it('respects the global concurrent budget', () => {
    expect(nextShimmer(specials, 0.5, 3, 3)).toBeNull();
  });

  it('returns null when the board has no specials', () => {
    expect(nextShimmer([], 0.5, 0, 3)).toBeNull();
  });
});

describe('listSpecialTiles', () => {
  const st = (row: number, col: number, type: string, isCleared = false) => ({ row, col, type, isCleared }) as never;

  it('lists live bomb/gold/diamond tiles with grid positions', () => {
    const grid = [[st(0, 0, 'standard'), st(0, 1, 'bomb')], [st(1, 0, 'gold'), st(1, 1, 'diamond')]];
    expect(listSpecialTiles(grid)).toEqual([
      { row: 0, col: 1, type: 'bomb' },
      { row: 1, col: 0, type: 'gold' },
      { row: 1, col: 1, type: 'diamond' },
    ]);
  });

  it('skips cleared tiles and holes', () => {
    const grid = [[st(0, 0, 'bomb', true), undefined as never]];
    expect(listSpecialTiles(grid)).toEqual([]);
  });
});

describe('createCellsChannel', () => {
  it('delivers the latest path to the subscriber without React state', () => {
    const ch = createCellsChannel();
    const seen: number[] = [];
    const off = ch.subscribe((cells) => seen.push(cells.length));
    ch.set([{ row: 0, col: 0 }]);
    ch.set([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
    off();
    ch.set([]);
    expect(seen).toEqual([1, 2]);
  });
});
