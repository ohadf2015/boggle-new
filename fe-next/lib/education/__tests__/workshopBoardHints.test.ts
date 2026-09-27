import { describe, it, expect } from 'vitest';
import { buildableCells } from '../workshopBoardHints';

describe('buildableCells', () => {
  it('GIVEN no tiles THEN nothing is marked buildable', () => {
    expect(buildableCells(new Set(), 7).size).toBe(0);
  });

  it('GIVEN one tile in the middle THEN its four orthogonal empty neighbours are buildable', () => {
    expect([...buildableCells(new Set(['3,3']), 7)].sort()).toEqual(['2,3', '3,2', '3,4', '4,3']);
  });

  it('GIVEN a tile on the edge THEN off-board neighbours are ignored', () => {
    expect([...buildableCells(new Set(['0,0']), 7)].sort()).toEqual(['0,1', '1,0']);
  });

  it('GIVEN a row of tiles THEN occupied cells are never buildable and diagonals are not included', () => {
    const out = buildableCells(new Set(['3,2', '3,3', '3,4']), 7);
    expect(out.has('3,3')).toBe(false);
    expect(out.has('2,1')).toBe(false);
    expect([...out].sort()).toEqual(['2,2', '2,3', '2,4', '3,1', '3,5', '4,2', '4,3', '4,4']);
  });
});
