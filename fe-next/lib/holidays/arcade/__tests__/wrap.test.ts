import { describe, it, expect } from 'vitest';
import { WRAP_MISSES, newWrap, travelFor, wrapAccept, wrapTick } from '../wrap';
import { wordPoints } from '../letters';

describe('Wrap It Up', () => {
  it('Given a box reaches the end, then a miss is counted and three misses end the shift', () => {
    let s = newWrap(30);
    s = wrapTick(s, travelFor(0) + 0.01);
    expect(s.lives).toBe(WRAP_MISSES - 1);
    expect(s.i).toBe(1);
    s = wrapTick(s, travelFor(1) + 0.01);
    s = wrapTick(s, travelFor(2) + 0.01);
    expect(s.over).toBe(true);
  });

  it('Given a mystery gift solved instantly, then it pays the most a box can pay (2x)', () => {
    const s = wrapAccept(newWrap(30), 'SANTA', 5, true);
    expect(s.score).toBe(Math.round(wordPoints(5) * 2));
    expect(s.plays).toEqual([{ w: 'SANTA', i: 0 }]);
  });

  it('Given a plain box solved late, then it pays close to base', () => {
    const s = wrapAccept(wrapTick(newWrap(30), travelFor(0) - 0.01), 'TREE', 4, false);
    expect(s.score).toBe(wordPoints(4));
  });

  it('Given boxes keep coming, then they speed up to a 5s floor', () => {
    expect(travelFor(10)).toBeLessThan(travelFor(0));
    expect(travelFor(99)).toBe(5);
  });
});
