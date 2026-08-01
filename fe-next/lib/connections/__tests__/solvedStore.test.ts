import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSolvedIds,
  markSolved,
  clearSolved,
  findFirstUnsolvedLevel,
  SOLVED_CAP,
} from '../solvedStore';
import { getPuzzleForLevel, getPuzzlesForLocale } from '../puzzles';

const EMPTY = new Set<string>();

describe('solvedStore — solved puzzles never reappear', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty and persists marked ids per locale + kind', () => {
    expect(getSolvedIds('regular', 'en').size).toBe(0);
    markSolved('regular', 'en', 'en-q-001');
    markSolved('regular', 'en', 'en-q-002');
    markSolved('pyramid', 'en', 'en-pyr-101');
    expect(getSolvedIds('regular', 'en').has('en-q-001')).toBe(true);
    expect(getSolvedIds('regular', 'en').has('en-pyr-101')).toBe(false);
    expect(getSolvedIds('pyramid', 'en').has('en-pyr-101')).toBe(true);
    expect(getSolvedIds('regular', 'he').size).toBe(0);
  });

  it('is idempotent and clearable', () => {
    markSolved('regular', 'en', 'x');
    markSolved('regular', 'en', 'x');
    expect(getSolvedIds('regular', 'en').size).toBe(1);
    clearSolved('regular', 'en');
    expect(getSolvedIds('regular', 'en').size).toBe(0);
  });

  it('caps stored ids, dropping the oldest', () => {
    for (let i = 0; i < SOLVED_CAP + 5; i++) markSolved('regular', 'en', `id-${i}`);
    const ids = getSolvedIds('regular', 'en');
    expect(ids.size).toBe(SOLVED_CAP);
    expect(ids.has('id-0')).toBe(false);
    expect(ids.has(`id-${SOLVED_CAP + 4}`)).toBe(true);
  });
});

describe('findFirstUnsolvedLevel — level resolution skips solved puzzles', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns the requested level when nothing is solved', () => {
    const { level, puzzle } = findFirstUnsolvedLevel('en', 1, EMPTY, EMPTY, 0);
    expect(level).toBe(1);
    expect(puzzle?.id).toBe(getPuzzleForLevel('en', 1, EMPTY, 0)?.id);
  });

  it('skips forward past solved puzzles', () => {
    const l1 = getPuzzleForLevel('en', 1, EMPTY, 0)!;
    const l2 = getPuzzleForLevel('en', 2, EMPTY, 0)!;
    const solved = new Set([l1.id, l2.id]);
    const { level, puzzle } = findFirstUnsolvedLevel('en', 1, EMPTY, solved, 0);
    expect(level).toBe(3);
    expect(puzzle?.id).toBe(getPuzzleForLevel('en', 3, EMPTY, 0)?.id);
  });

  it('returns null puzzle when the whole pool is solved (pack cleared) instead of looping the cycle', () => {
    // getPuzzleForLevel cycles modulo the pool — an unbounded walk would spin
    // forever. Mark EVERY active puzzle solved and expect a clean null.
    const solved = new Set<string>(getPuzzlesForLocale('en').map((p) => p.id));
    const { puzzle } = findFirstUnsolvedLevel('en', 5, EMPTY, solved, 0);
    expect(puzzle).toBeNull();
  });
});
