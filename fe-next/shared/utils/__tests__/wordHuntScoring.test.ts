/**
 * Word Hunt guess-efficiency scoring.
 *
 * Product rule: a player who solves the target in few guesses must NOT be
 * punished for having farmed fewer board words. Fewer same-length guesses →
 * bigger reward, on BOTH surfaces:
 *  - MP (uncapped raw points): additive `wordHuntEfficiencyBonus`.
 *  - SP (fixed 1000-pt budget): `wordHuntExplorationCredit` is a FLOOR so a
 *    clean fast solve earns the exploration ceiling without word-farming.
 * Spec: docs/2026-06-27-wordhunt-scoring-ux-spec.md
 */
import { describe, it, expect } from 'vitest';
import {
  wordHuntEfficiencyBonus,
  wordHuntExplorationCredit,
  wordHuntSolveTier,
} from '../wordHuntScoring';

describe('wordHuntEfficiencyBonus (MP additive)', () => {
  it('rewards a guess-1 solve the most', () => {
    expect(wordHuntEfficiencyBonus(1)).toBe(140);
  });

  it('decreases monotonically with more guesses', () => {
    const seq = [1, 2, 3, 4, 5, 6].map(wordHuntEfficiencyBonus);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeLessThan(seq[i - 1]);
    }
  });

  it('is calibrated to top a strong farm run (~12 words ≈ 120pts) on guess 1', () => {
    expect(wordHuntEfficiencyBonus(1)).toBeGreaterThan(12 * 5 * 2 * 0.9);
  });

  it('clamps past the table to the floor and never goes negative', () => {
    expect(wordHuntEfficiencyBonus(6)).toBe(12);
    expect(wordHuntEfficiencyBonus(99)).toBe(12);
    expect(wordHuntEfficiencyBonus(0)).toBe(140); // treated as best
  });
});

describe('wordHuntExplorationCredit (SP floor)', () => {
  it('grants the full 200 exploration ceiling for a guess-1 solve', () => {
    expect(wordHuntExplorationCredit(1)).toBe(200);
  });

  it('still rewards a 2nd-guess solve generously (not punished)', () => {
    expect(wordHuntExplorationCredit(2)).toBe(150);
  });

  it('tapers to 0 so mid/late solvers still need words', () => {
    expect(wordHuntExplorationCredit(6)).toBe(0);
    expect(wordHuntExplorationCredit(10)).toBe(0);
  });

  it('never exceeds the SP exploration ceiling', () => {
    for (let a = 1; a <= 12; a++) {
      expect(wordHuntExplorationCredit(a)).toBeLessThanOrEqual(200);
    }
  });
});

describe('wordHuntSolveTier (celebration)', () => {
  it('flags a guess-1 solve as the ace tier', () => {
    const t = wordHuntSolveTier(1);
    expect(t.tier).toBe(0);
    expect(t.isAce).toBe(true);
    expect(t.labelKey).toBe('wordHunt.celebrate.tier1');
    expect(t.bonus).toBe(140);
  });

  it('maps later solves to lower tiers with a stable label key', () => {
    expect(wordHuntSolveTier(2).labelKey).toBe('wordHunt.celebrate.tier2');
    expect(wordHuntSolveTier(2).isAce).toBe(false);
    expect(wordHuntSolveTier(7).tier).toBe(5);
    expect(wordHuntSolveTier(7).labelKey).toBe('wordHunt.celebrate.tier6');
  });
});
