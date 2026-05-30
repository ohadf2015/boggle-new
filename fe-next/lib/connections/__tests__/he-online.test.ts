import { describe, it, expect } from 'vitest';
import { HE_ONLINE } from '../puzzles/he-online';
import { getPuzzlesForLocale } from '../puzzles';

// Sofit/final Hebrew letters — a bridge must NOT contain these (the on-screen
// keyboard only emits base letters; see lib/connections/keyboard.ts).
const SOFIT = /[ךםןףץ]/;

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

  it('every bridge is base-letter typable (no sofit finals)', () => {
    for (const p of HE_ONLINE) {
      expect(SOFIT.test(p.bridge), `bridge "${p.bridge}" has a sofit letter`).toBe(false);
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
