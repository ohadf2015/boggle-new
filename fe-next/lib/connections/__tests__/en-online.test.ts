import { describe, it, expect } from 'vitest';
import { EN_ONLINE } from '../puzzles/en-online';
import { getPuzzlesForLocale } from '../puzzles';
import { checkGuess } from '../gameLogic';

describe('EN_ONLINE — curated English compound-chain riddles', () => {
  it('is a non-empty set', () => {
    expect(EN_ONLINE.length).toBeGreaterThan(0);
  });

  it('every puzzle is non-degenerate: word1, word2, bridge all distinct', () => {
    for (const p of EN_ONLINE) {
      expect(p.bridge).not.toBe(p.word1);
      expect(p.bridge).not.toBe(p.word2);
      expect(p.word1).not.toBe(p.word2);
    }
  });

  it('ids are unique and namespaced en-o-', () => {
    const ids = EN_ONLINE.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('en-o-')).toBe(true);
  });

  it('the bridge solves the puzzle (checkGuess accepts it, case-insensitive)', () => {
    for (const p of EN_ONLINE) {
      expect(checkGuess(p.bridge.toLowerCase(), p).correct, `bridge "${p.bridge}" not solvable`).toBe(true);
    }
  });

  it('is wired into the live English pool', () => {
    const poolIds = new Set(getPuzzlesForLocale('en').map((p) => p.id));
    for (const p of EN_ONLINE) expect(poolIds.has(p.id)).toBe(true);
  });
});
