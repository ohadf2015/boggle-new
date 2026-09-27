import { describe, it, expect } from 'vitest';
import {
  REWARD_EVERY,
  isStreakMilestone,
  streakTier,
  momentumState,
} from '../momentum';

describe('connections momentum — the "succeed in more puzzles" hook', () => {
  describe('isStreakMilestone', () => {
    it('fires at 3, 5, 10', () => {
      expect(isStreakMilestone(3)).toBe(true);
      expect(isStreakMilestone(5)).toBe(true);
      expect(isStreakMilestone(10)).toBe(true);
    });
    it('does not fire at non-milestones', () => {
      expect(isStreakMilestone(0)).toBe(false);
      expect(isStreakMilestone(2)).toBe(false);
      expect(isStreakMilestone(4)).toBe(false);
      expect(isStreakMilestone(6)).toBe(false);
    });
  });

  describe('streakTier escalation', () => {
    it('tiers by streak length', () => {
      expect(streakTier(0)).toBe(0);
      expect(streakTier(2)).toBe(0);
      expect(streakTier(3)).toBe(1);
      expect(streakTier(5)).toBe(2);
      expect(streakTier(9)).toBe(2);
      expect(streakTier(10)).toBe(3);
    });
  });

  describe('momentumState', () => {
    it('nudges to start when nothing solved yet', () => {
      const m = momentumState({ solvedThisSession: 0, streak: 0 });
      expect(m.message.kind).toBe('start');
      expect(m.solvedToNextReward).toBe(REWARD_EVERY);
      expect(m.progressFraction).toBe(0);
    });

    it('counts down to the next reward mid-run', () => {
      const m = momentumState({ solvedThisSession: 2, streak: 2 });
      expect(m.message.kind).toBe('toReward');
      expect(m.solvedToNextReward).toBe(REWARD_EVERY - 2);
      expect(m.progressFraction).toBeCloseTo(2 / REWARD_EVERY);
    });

    it('announces a reward when a reward milestone is hit (full bar)', () => {
      const m = momentumState({ solvedThisSession: REWARD_EVERY, streak: 5 });
      expect(m.justReachedReward).toBe(true);
      expect(m.message.kind).toBe('rewardEarned');
      expect(m.progressFraction).toBe(1);
      if (m.message.kind === 'rewardEarned') expect(m.message.rewardNumber).toBe(1);
    });

    it('hypes an on-fire streak between rewards', () => {
      const m = momentumState({ solvedThisSession: 6, streak: 6 });
      expect(m.message.kind).toBe('onFire');
      if (m.message.kind === 'onFire') expect(m.message.streak).toBe(6);
    });
  });
});
