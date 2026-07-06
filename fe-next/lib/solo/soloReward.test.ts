/**
 * Tests for soloReward — pure per-mode score→coin mapping + variable bonus roll.
 * RED-GREEN-REFACTOR. Pure module, node env.
 */

import {
  computeSoloReward,
  crosswordScore,
} from './soloReward';
import { COIN_EARNING_OTHER } from '@/utils/coinManager';

describe('soloReward', () => {
  describe('computeSoloReward', () => {
    it('gives zero coins and zero base when score is 0 and not won', () => {
      const r = computeSoloReward({ mode: 'sealed-bid', score: 0, won: false, seed: 1 });
      expect(r.breakdown.base).toBe(0);
      expect(r.breakdown.scoreBonus).toBe(0);
      expect(r.breakdown.winBonus).toBe(0);
      // bonus may still roll, but with score 0 + not won we suppress all reward
      expect(r.coins).toBe(0);
    });

    it('applies single-player base when score > 0', () => {
      const r = computeSoloReward({ mode: 'sealed-bid', score: 40, won: false, seed: 7 });
      expect(r.breakdown.base).toBe(COIN_EARNING_OTHER.SINGLEPLAYER_BASE);
    });

    it('adds score bonus = floor(score / SCORE_DIVISOR)', () => {
      const r = computeSoloReward({ mode: 'shiritori', score: 95, won: false, seed: 3 });
      expect(r.breakdown.scoreBonus).toBe(Math.floor(95 / COIN_EARNING_OTHER.SCORE_DIVISOR));
    });

    it('adds a win bonus only when won', () => {
      const lost = computeSoloReward({ mode: 'shiritori', score: 50, won: false, seed: 3 });
      const won = computeSoloReward({ mode: 'shiritori', score: 50, won: true, seed: 3 });
      expect(lost.breakdown.winBonus).toBe(0);
      expect(won.breakdown.winBonus).toBeGreaterThan(0);
    });

    it('coins = base + scoreBonus + winBonus + bonus (sum of parts)', () => {
      const r = computeSoloReward({ mode: 'crossword', score: 120, won: true, seed: 42 });
      expect(r.coins).toBe(
        r.breakdown.base + r.breakdown.scoreBonus + r.breakdown.winBonus + r.bonus,
      );
    });

    it('caps total at MAX_GAME_REWARD', () => {
      const r = computeSoloReward({ mode: 'shiritori', score: 100000, won: true, seed: 9 });
      expect(r.coins).toBeLessThanOrEqual(COIN_EARNING_OTHER.MAX_GAME_REWARD);
    });

    it('variable bonus is deterministic for a given seed (no reload exploit)', () => {
      const a = computeSoloReward({ mode: 'sealed-bid', score: 30, won: true, seed: 12345 });
      const b = computeSoloReward({ mode: 'sealed-bid', score: 30, won: true, seed: 12345 });
      expect(a.bonus).toBe(b.bonus);
    });

    it('variable bonus differs across seeds (real variance)', () => {
      const bonuses = new Set<number>();
      for (let s = 0; s < 40; s++) {
        bonuses.add(computeSoloReward({ mode: 'sealed-bid', score: 30, won: true, seed: s }).bonus);
      }
      expect(bonuses.size).toBeGreaterThan(1);
    });

    it('bonus is always a non-negative known tier value', () => {
      for (let s = 0; s < 30; s++) {
        const r = computeSoloReward({ mode: 'shiritori', score: 30, won: true, seed: s });
        expect([0, 5, 10, 25]).toContain(r.bonus);
      }
    });
  });

  describe('crosswordScore (time + hints → synthesized score)', () => {
    it('rewards faster solves more', () => {
      const fast = crosswordScore(30_000, 0, 10);
      const slow = crosswordScore(600_000, 0, 10);
      expect(fast).toBeGreaterThan(slow);
    });
    it('penalizes hints used', () => {
      const noHints = crosswordScore(60_000, 0, 10);
      const withHints = crosswordScore(60_000, 5, 10);
      expect(withHints).toBeLessThan(noHints);
    });
    it('never returns a negative score', () => {
      expect(crosswordScore(9_999_999, 999, 1)).toBeGreaterThanOrEqual(0);
    });
  });
});
