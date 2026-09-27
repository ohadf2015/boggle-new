import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale } from '../puzzles';
import { checkGuess } from '../gameLogic';

/**
 * The live Hebrew pool is the validated set materialized from the DB
 * (dual-LLM judge: both "word1 bridge" and "bridge word2" are real natural
 * Hebrew smichut/collocations). Guards quality + solvability after the verify
 * pass that dropped 75 broken smichut chains.
 */
describe('live Hebrew Word Bridge pool', () => {
  const pool = getPuzzlesForLocale('he');

  it('is a healthy-sized set', () => {
    expect(pool.length).toBeGreaterThan(300);
  });

  it('every puzzle is non-degenerate', () => {
    for (const p of pool) {
      expect(p.bridge).not.toBe(p.word1);
      expect(p.bridge).not.toBe(p.word2);
      expect(p.word1).not.toBe(p.word2);
    }
  });

  it('ids are unique and Hebrew-namespaced', () => {
    const ids = pool.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pool.every((p) => p.id.startsWith('he-'))).toBe(true);
  });

  it('the canonical bridge solves every puzzle (sofit-normalized)', () => {
    for (const p of pool) {
      expect(checkGuess(p.bridge, p).correct, `bridge "${p.bridge}" not solvable`).toBe(true);
    }
  });
});
