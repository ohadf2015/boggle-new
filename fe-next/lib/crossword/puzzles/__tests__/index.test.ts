import { describe, it, expect } from 'vitest';
import { buildSeedPuzzle, getPool, getDailyPuzzle } from '../index';
import type { SeedPuzzle } from '../seed';
import { isSolved } from '../../answer';

// A REAL 3x3 crossword (across != down): cow/are/pet across · cap/ore/wet down.
const seed: SeedPuzzle = {
  id: 'en-test-001',
  locale: 'en',
  difficulty: 'easy',
  rtl: false,
  grid: [
    ['c', 'o', 'w'],
    ['a', 'r', 'e'],
    ['p', 'e', 't'],
  ],
  clues: {
    A1: 'Moo-making animal',
    A4: '"You ___ here"',
    A5: 'A cat or dog',
    D1: 'Baseball hat',
    D2: 'Metal-bearing rock',
    D3: 'Soaked',
  },
};

describe('buildSeedPuzzle', () => {
  it('builds a playable puzzle with numbered cells and slots', () => {
    const p = buildSeedPuzzle(seed);
    expect(p.id).toBe('en-test-001');
    expect(p.size).toBe(3);
    expect(p.rtl).toBe(false);
    expect(p.slots.length).toBe(6);
  });

  it('assigns clues to slots by slot id (across != down)', () => {
    const p = buildSeedPuzzle(seed);
    const a1 = p.slots.find((s) => s.id === 'A1')!;
    const d1 = p.slots.find((s) => s.id === 'D1')!;
    expect(a1.answer).toBe('cow');
    expect(a1.clue).toBe('Moo-making animal');
    expect(d1.answer).toBe('cap'); // down differs from across — a real crossword
    expect(d1.clue).toBe('Baseball hat');
    expect(p.slots.every((s) => s.clue.length > 0)).toBe(true);
  });

  it('produces a puzzle that is solvable with its own solution', () => {
    const p = buildSeedPuzzle(seed);
    const entries: Record<string, string> = {};
    for (const cell of p.cells) {
      if (!cell.block) entries[`${cell.row},${cell.col}`] = cell.solution;
    }
    expect(isSolved(p, entries)).toBe(true);
  });
});

describe('getPool / getDailyPuzzle', () => {
  it('returns a non-empty pool for en and he', () => {
    expect(getPool('en').length).toBeGreaterThan(0);
    expect(getPool('he').length).toBeGreaterThan(0);
  });

  it('falls back to en for an unknown locale', () => {
    expect(getPool('xx' as never).length).toBe(getPool('en').length);
  });

  it('getDailyPuzzle returns a puzzle for a date+locale deterministically', () => {
    const a = getDailyPuzzle('2026-06-06', 'en');
    const b = getDailyPuzzle('2026-06-06', 'en');
    expect(a?.id).toBe(b?.id);
    expect(a).not.toBeNull();
  });

  it('he puzzles are RTL and use Hebrew letters', () => {
    const p = getPool('he')[0];
    expect(p.rtl).toBe(true);
    expect(p.slots[0].answer).toMatch(/[֐-׿]/);
  });
});
