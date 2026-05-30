import { describe, it, expect } from 'vitest';
import { HE_ONLINE } from '../puzzles/he-online';
import { getPuzzlesForLocale } from '../puzzles';
import { checkGuess } from '../gameLogic';
import { normalizeHebrewWord } from '../../../shared/utils/wordNormalization';

describe('HE_ONLINE — curated online-harvested riddles (3-judge verified)', () => {
  it('is a non-empty set', () => {
    expect(HE_ONLINE.length).toBeGreaterThan(0);
  });

  it('every puzzle is non-degenerate: word1, word2, bridge all distinct', () => {
    for (const p of HE_ONLINE) {
      expect(p.bridge).not.toBe(p.word1);
      expect(p.bridge).not.toBe(p.word2);
      expect(p.word1).not.toBe(p.word2);
    }
  });

  it('is solvable from the base-letter keyboard (bridge accepted even with natural sofit)', () => {
    // The keyboard emits base letters; checkGuess normalizes both sides, so a
    // bridge stored with a natural final letter (e.g. ים, חורף) must still match
    // its base-letter typing.
    for (const p of HE_ONLINE) {
      const typed = normalizeHebrewWord(p.bridge); // what the base keyboard produces
      expect(checkGuess(typed, p).correct, `bridge "${p.bridge}" not solvable as "${typed}"`).toBe(true);
    }
  });

  it('ids are unique and namespaced he-o-', () => {
    const ids = HE_ONLINE.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('he-o-')).toBe(true);
  });

  it('is wired into the live Hebrew pool', () => {
    const poolIds = new Set(getPuzzlesForLocale('he').map((p) => p.id));
    for (const p of HE_ONLINE) expect(poolIds.has(p.id)).toBe(true);
  });
});
