import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale } from '../puzzles';
import { checkGuess } from '../gameLogic';

/**
 * The live English pool is the validated set materialized from the DB
 * (datamuse frequency + dual-LLM judge: both word1+bridge and bridge+word2 are
 * real common compounds). This guards the quality invariants and the specific
 * regression that prompted the rebuild (KEY+STONE+NOTE: keystone ok, stonenote
 * not a word).
 */
describe('live English Word Bridge pool', () => {
  const pool = getPuzzlesForLocale('en');

  it('is a healthy-sized set', () => {
    expect(pool.length).toBeGreaterThan(100);
  });

  it('every puzzle is non-degenerate: word1, bridge, word2 all distinct', () => {
    for (const p of pool) {
      expect(p.bridge).not.toBe(p.word1);
      expect(p.bridge).not.toBe(p.word2);
      expect(p.word1).not.toBe(p.word2);
    }
  });

  it('ids are unique', () => {
    const ids = pool.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the canonical bridge solves every puzzle (case-insensitive)', () => {
    for (const p of pool) {
      expect(checkGuess(p.bridge.toLowerCase(), p).correct, `bridge "${p.bridge}" not solvable`).toBe(true);
    }
  });

  it('does NOT contain the broken KEY+STONE+NOTE chain (stonenote is not a word)', () => {
    const broken = pool.find((p) => p.word1 === 'KEY' && p.bridge === 'STONE' && p.word2 === 'NOTE');
    expect(broken).toBeUndefined();
  });

  it('carries why-it-works examples for the post-solve payoff', () => {
    const withExamples = pool.filter((p) => p.examples && p.examples.length > 0);
    expect(withExamples.length).toBe(pool.length);
  });
});
