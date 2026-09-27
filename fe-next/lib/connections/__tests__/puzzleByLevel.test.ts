import { describe, it, expect } from 'vitest';
import { getPuzzleForLevel, getTotalLevels, getPuzzlesForLocale } from '../puzzles';

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

// Auto-ban behavior: puzzles in the banned set are skipped at runtime.
// Source = `v_connections_banned_puzzles` (≥3 distinct authed dislike+gave_up).
describe('getPuzzleForLevel — banned puzzle filter', () => {
  it('never returns a banned puzzle id', () => {
    const all = getPuzzlesForLocale('he');
    // Pick the first 5 ids as a synthetic ban set
    const banned = new Set(all.slice(0, 5).map((p) => p.id));
    const total = getTotalLevels('he', banned);
    expect(total).toBe(all.length - 5);
    for (let lvl = 1; lvl <= Math.min(total, 50); lvl++) {
      const puzzle = getPuzzleForLevel('he', lvl, banned)!;
      expect(banned.has(puzzle.id)).toBe(false);
    }
  });

  it('returns null when every puzzle is banned', () => {
    const all = getPuzzlesForLocale('he');
    const banned = new Set(all.map((p) => p.id));
    expect(getPuzzleForLevel('he', 1, banned)).toBeNull();
    expect(getTotalLevels('he', banned)).toBe(0);
  });

  it('falls through to original pool when banned set is empty', () => {
    const a = getPuzzleForLevel('he', 1);
    const b = getPuzzleForLevel('he', 1, new Set());
    expect(a!.id).toBe(b!.id);
  });
});
