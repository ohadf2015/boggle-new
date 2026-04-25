import { describe, it, expect } from 'vitest';
import { getPuzzleForLevel, getTotalLevels } from '../puzzles';

describe('getPuzzleForLevel', () => {
  it('returns same puzzle for same (locale, level) — deterministic', () => {
    const a = getPuzzleForLevel('en', 5);
    const b = getPuzzleForLevel('en', 5);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a!.id).toBe(b!.id);
  });

  it('returns different puzzles for adjacent levels', () => {
    const l1 = getPuzzleForLevel('en', 1);
    const l2 = getPuzzleForLevel('en', 2);
    expect(l1!.id).not.toBe(l2!.id);
  });

  it('cycles when level exceeds pool size (level pool.length+1 == level 1)', () => {
    const total = getTotalLevels('en');
    const first = getPuzzleForLevel('en', 1);
    const wrapped = getPuzzleForLevel('en', total + 1);
    expect(wrapped!.id).toBe(first!.id);
  });

  it('handles Hebrew locale', () => {
    const he = getPuzzleForLevel('he', 1);
    expect(he).toBeTruthy();
  });

  it('clamps level < 1 to level 1', () => {
    const lvl1 = getPuzzleForLevel('en', 1);
    const clamped = getPuzzleForLevel('en', 0);
    expect(clamped!.id).toBe(lvl1!.id);
  });

  it('getTotalLevels returns positive integer', () => {
    expect(getTotalLevels('en')).toBeGreaterThan(0);
    expect(Number.isInteger(getTotalLevels('en'))).toBe(true);
  });
});
