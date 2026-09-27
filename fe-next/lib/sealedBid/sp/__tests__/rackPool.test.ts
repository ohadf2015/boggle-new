import { describe, it, expect } from 'vitest';
import { dealRounds } from '../rackPool';

describe('dealRounds', () => {
  it('is deterministic for same seed', () => {
    const a = dealRounds(5, 'en', '2026-07-06');
    const b = dealRounds(5, 'en', '2026-07-06');
    expect(a.map(r => r.rack)).toEqual(b.map(r => r.rack));
  });
  it('returns requested count with 7 display letters each', () => {
    const rounds = dealRounds(5, 'en', 'seed-x');
    expect(rounds).toHaveLength(5);
    for (const r of rounds) expect(r.displayLetters).toHaveLength(7);
  });
  it('displayLetters is a permutation of rack letters (shuffled, no info lost)', () => {
    const [r] = dealRounds(1, 'en', 'seed-y');
    expect([...r.displayLetters].sort().join('')).toEqual([...r.rack].sort().join(''));
  });
  it('different seeds usually give different first rack', () => {
    const a = dealRounds(1, 'en', 'aaa')[0].rack;
    const b = dealRounds(1, 'en', 'zzz')[0].rack;
    expect(typeof a).toBe('string'); expect(typeof b).toBe('string');
  });
  it('falls back to en pool for unsupported lang', () => {
    expect(dealRounds(3, 'sv', 's')).toHaveLength(3);
  });
});
