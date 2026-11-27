import { describe, it, expect } from 'vitest';
import { STACK_COLS, STACK_ROWS, adjacent, newStack, stackClear, stackTick, dropEvery, chainLetters } from '../stack';

const drops = Array.from({ length: 300 }, (_, i) => ({ letter: 'ABCDE'[i % 5], col: i % STACK_COLS }));

describe('Sufganiyah Stack', () => {
  it('Given a new tray, then it starts with two rows of doughnuts', () => {
    const s = newStack(drops);
    expect(s.cols.every((c) => c.length === 2)).toBe(true);
    expect(s.next).toBe(12);
  });

  it('Given time passes, then a doughnut drops into its column', () => {
    const s = stackTick(newStack(drops), dropEvery(12) + 0.01, drops);
    expect(s.cols[0].length).toBe(3);
    expect(s.next).toBe(13);
  });

  it('Given a column overflows, then the tray is lost', () => {
    const one = Array.from({ length: 60 }, () => ({ letter: 'A', col: 0 }));
    let s = newStack(one);
    for (let i = 0; i < 400 && !s.over; i++) s = stackTick(s, 0.2, one);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
    expect(s.cols[0].length).toBe(STACK_ROWS);
  });

  it('Given touching cells, then they are adjacent in all 8 directions only', () => {
    expect(adjacent({ c: 0, r: 0 }, { c: 1, r: 1 })).toBe(true);
    expect(adjacent({ c: 0, r: 0 }, { c: 2, r: 0 })).toBe(false);
    expect(adjacent({ c: 1, r: 1 }, { c: 1, r: 1 })).toBe(false);
  });

  it('Given a cleared word, then its cells vanish, the stack falls and long words double', () => {
    const s = newStack(drops);
    const path = [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }];
    expect(chainLetters(s, path)).toBe('ABC');
    const short = stackClear(s, path, 'ABC', 3);
    expect(short.cols[0]).toHaveLength(1);
    expect(short.score).toBe(20);
    const long = stackClear(s, [...path, { c: 3, r: 0 }, { c: 4, r: 0 }], 'ABCDE', 5);
    expect(long.score).toBe(110);
    expect(long.plays).toEqual([{ w: 'ABCDE' }]);
  });

  it('Given the 90 seconds survive, then the tray is won', () => {
    const s = stackTick({ ...newStack(drops), elapsed: 89.99 }, 0.02, drops);
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
  });
});
