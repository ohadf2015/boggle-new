import { describe, it, expect } from 'vitest';
import { earnedSlotIds } from '../earnedSlots';

const slot = (id: string, cells: Array<[number, number]>) => ({ id, cells: cells.map(([row, col]) => ({ row, col })) });
const puzzle = { slots: [slot('A1', [[0, 0], [0, 1], [0, 2]]), slot('D1', [[0, 0], [1, 0], [2, 0]]), slot('A2', [[2, 0], [2, 1]])] } as never;

describe('earnedSlotIds', () => {
  it('keeps solved clues the player filled in themselves', () => {
    expect(earnedSlotIds(puzzle, ['A1', 'D1'], [])).toEqual(['A1', 'D1']);
  });

  it('drops a solved clue that used a revealed letter, even one shared at a crossing', () => {
    expect(earnedSlotIds(puzzle, ['A1', 'D1', 'A2'], ['2,0'])).toEqual(['A1']);
  });

  it('ignores ids that are not solved or not on the grid', () => {
    expect(earnedSlotIds(puzzle, ['Z9'], [])).toEqual([]);
  });
});
