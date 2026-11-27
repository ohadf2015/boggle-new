import { describe, it, expect } from 'vitest';
import { SLEIGH_BELLS, newSleigh, passFor, sleighAccept, sleighTick } from '../sleigh';
import { wordPoints } from '../letters';

describe('Sleigh Spell', () => {
  it('Given later chimneys, then they pass faster but never under 4.5s', () => {
    expect(passFor(5)).toBeLessThan(passFor(0));
    expect(passFor(100)).toBe(4.5);
  });

  it('Given a chimney passes unanswered, then a bell is lost and the next chimney comes', () => {
    const s = sleighTick(newSleigh(40), passFor(0) + 0.01);
    expect(s.lives).toBe(SLEIGH_BELLS - 1);
    expect(s.i).toBe(1);
    expect(s.last).toBe('miss');
  });

  it('Given three misses, then the run ends', () => {
    let s = newSleigh(40);
    for (let k = 0; k < 3; k++) s = sleighTick(s, passFor(s.i) + 0.01);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('Given a fast word, then it scores up to 1.5x and records the chimney it landed in', () => {
    const s = sleighAccept(newSleigh(40), 'SNOW', 4);
    expect(s.score).toBe(Math.round(wordPoints(4) * 1.5));
    expect(s.plays).toEqual([{ w: 'SNOW', i: 0 }]);
    expect(s.i).toBe(1);
    const late = sleighAccept(sleighTick(newSleigh(40), passFor(0) - 0.01), 'SNOW', 4);
    expect(late.score).toBeLessThan(s.score);
  });

  it('Given time runs out or chimneys run out, then the run ends', () => {
    let s = newSleigh(2);
    s = sleighAccept(s, 'AB', 2);
    s = sleighAccept(s, 'CD', 2);
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
    const timed = { ...newSleigh(40), elapsed: 89.99 };
    expect(sleighTick(timed, 0.02).over).toBe(true);
  });
});
