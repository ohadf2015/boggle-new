import { describe, it, expect } from 'vitest';
import {
  planCoinReward,
  BIG_AMOUNT,
  JACKPOT_AMOUNT,
  MAX_COIN_RATE,
  MIN_COINS_PER_BURST,
  MAX_COINS_PER_BURST,
} from './coinSoundPlan';

/**
 * Deterministic RNG: replays a fixed sequence, then holds the last value.
 * Lets us pin down the "feels random every time" behaviour in tests.
 */
function seqRand(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

// First rand() call is always the jackpot-surprise roll. A high value (>= chance)
// guarantees NO surprise jackpot, so tier follows the amount thresholds.
const NO_SURPRISE = 0.99;

describe('planCoinReward', () => {
  describe('tier selection', () => {
    it('GIVEN amount >= JACKPOT_AMOUNT THEN tier is jackpot with cascade', () => {
      const plan = planCoinReward(JACKPOT_AMOUNT, seqRand([NO_SURPRISE, 0.5, 0.5]));
      expect(plan.tier).toBe('jackpot');
      expect(plan.cascade).toBe(true);
    });

    it('GIVEN BIG_AMOUNT <= amount < JACKPOT_AMOUNT AND no surprise THEN tier is big', () => {
      const plan = planCoinReward(BIG_AMOUNT, seqRand([NO_SURPRISE, 0.5, 0.5]));
      expect(plan.tier).toBe('big');
      expect(plan.cascade).toBe(false);
    });

    it('GIVEN small amount AND no surprise THEN tier is normal', () => {
      const plan = planCoinReward(10, seqRand([NO_SURPRISE, 0.5, 0.5]));
      expect(plan.tier).toBe('normal');
    });

    it('GIVEN small amount BUT surprise roll hits THEN tier is jackpot (casino randomness)', () => {
      // First rand() = 0.0 → below the surprise chance → jackpot despite tiny amount.
      const plan = planCoinReward(10, seqRand([0.0, 0.5, 0.5]));
      expect(plan.tier).toBe('jackpot');
    });
  });

  describe('chimes (ascending arpeggio)', () => {
    it('GIVEN a plan THEN chime rates strictly ascend and never exceed MAX_COIN_RATE', () => {
      const plan = planCoinReward(JACKPOT_AMOUNT, seqRand([NO_SURPRISE, 0.95, 0.5]));
      expect(plan.chimes.length).toBeGreaterThan(0);
      for (let i = 1; i < plan.chimes.length; i++) {
        expect(plan.chimes[i].rate).toBeGreaterThan(plan.chimes[i - 1].rate);
      }
      for (const c of plan.chimes) {
        expect(c.rate).toBeLessThanOrEqual(MAX_COIN_RATE);
        expect(c.rate).toBeGreaterThan(0);
        expect(c.volume).toBeGreaterThan(0);
        expect(c.delayMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('GIVEN richer tiers THEN more chimes (normal < big < jackpot)', () => {
      const normal = planCoinReward(10, seqRand([NO_SURPRISE, 0.5, 0.5]));
      const big = planCoinReward(BIG_AMOUNT, seqRand([NO_SURPRISE, 0.5, 0.5]));
      const jackpot = planCoinReward(JACKPOT_AMOUNT, seqRand([NO_SURPRISE, 0.5, 0.5]));
      expect(normal.chimes.length).toBeLessThan(big.chimes.length);
      expect(big.chimes.length).toBeLessThan(jackpot.chimes.length);
    });

    it('GIVEN first delay THEN it starts immediately (delayMs 0)', () => {
      const plan = planCoinReward(10, seqRand([NO_SURPRISE, 0.5, 0.5]));
      expect(plan.chimes[0].delayMs).toBe(0);
    });
  });

  describe('coinCount', () => {
    it('GIVEN tiny amount THEN coinCount clamped to MIN_COINS_PER_BURST', () => {
      const plan = planCoinReward(1, seqRand([NO_SURPRISE, 0.5, 0.0]));
      expect(plan.coinCount).toBeGreaterThanOrEqual(MIN_COINS_PER_BURST);
    });

    it('GIVEN non-jackpot tier THEN coinCount never exceeds MAX_COINS_PER_BURST', () => {
      const plan = planCoinReward(JACKPOT_AMOUNT - 1, seqRand([NO_SURPRISE, 0.5, 0.99]));
      expect(plan.tier).toBe('big');
      expect(plan.coinCount).toBeLessThanOrEqual(MAX_COINS_PER_BURST);
    });

    it('GIVEN jackpot THEN coinCount may exceed normal cap (bonus coins)', () => {
      const jackpot = planCoinReward(500, seqRand([NO_SURPRISE, 0.5, 0.99]));
      expect(jackpot.tier).toBe('jackpot');
      expect(jackpot.coinCount).toBeGreaterThan(MIN_COINS_PER_BURST);
    });
  });

  describe('guards + determinism', () => {
    it('GIVEN amount <= 0 THEN empty plan (no coins, no chimes)', () => {
      const plan = planCoinReward(0, seqRand([0.5]));
      expect(plan.coinCount).toBe(0);
      expect(plan.chimes).toEqual([]);
      expect(plan.cascade).toBe(false);
    });

    it('GIVEN identical rand sequence THEN identical plan (deterministic)', () => {
      const a = planCoinReward(42, seqRand([0.3, 0.6, 0.2]));
      const b = planCoinReward(42, seqRand([0.3, 0.6, 0.2]));
      expect(a).toEqual(b);
    });

    it('GIVEN default rand THEN does not throw', () => {
      expect(() => planCoinReward(50)).not.toThrow();
    });
  });
});
