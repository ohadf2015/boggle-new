import { describe, it, expect } from 'vitest';
import { seededRng, pickWeightedCatalyst, isLeaderMarginLarge } from '../roundEventPick';

describe('seededRng', () => {
  it('is reproducible for the same seed and differs across seeds', () => {
    const a = seededRng('7:2');
    const b = seededRng('7:2');
    const c = seededRng('7:3');
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const v of seqA) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of seqA) expect(v).toBeLessThan(1);
  });
});

describe('isLeaderMarginLarge', () => {
  it('is false for close or empty rooms', () => {
    expect(isLeaderMarginLarge([])).toBe(false);
    expect(isLeaderMarginLarge([100])).toBe(false);
    expect(isLeaderMarginLarge([120, 100, 90])).toBe(false);
  });

  it('is true when the leader has run away from the last player', () => {
    expect(isLeaderMarginLarge([500, 150, 40])).toBe(true);
  });
});

describe('pickWeightedCatalyst', () => {
  function tally(rubberBand: boolean): Record<string, number> {
    const rng = seededRng('tally');
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const c = pickWeightedCatalyst(rng, rubberBand);
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }

  it('is roughly uniform when the race is close', () => {
    const counts = tally(false);
    expect(Object.keys(counts).sort()).toEqual(['blizzard', 'earthquake', 'lightning', 'meteor']);
    expect(counts.earthquake).toBeLessThan(1300);
  });

  it('leans toward the board-reshuffling earthquake when the leader runs away', () => {
    const counts = tally(true);
    expect(counts.earthquake).toBeGreaterThan(counts.lightning * 2);
  });

  it('is deterministic for a seeded rng', () => {
    expect(pickWeightedCatalyst(seededRng('x'), true)).toBe(pickWeightedCatalyst(seededRng('x'), true));
  });
});
