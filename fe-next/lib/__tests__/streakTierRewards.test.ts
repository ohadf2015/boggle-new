/**
 * Streak Tier Rewards — Tests
 * RED phase: Define expected behavior for streak tier coin bonuses
 */

import {
  getStreakTier,
  getStreakCoinBonusPercent,
  getNextTierInfo,
  STREAK_TIERS,
} from '../streakTierRewards';

describe('streakTierRewards', () => {
  describe('STREAK_TIERS', () => {
    it('should define 7 tiers in ascending order', () => {
      expect(STREAK_TIERS).toHaveLength(7);
      for (let i = 1; i < STREAK_TIERS.length; i++) {
        expect(STREAK_TIERS[i].minDays).toBeGreaterThan(STREAK_TIERS[i - 1].minDays);
      }
    });

    it('should have coin bonus percentages that increase with tier', () => {
      for (let i = 1; i < STREAK_TIERS.length; i++) {
        expect(STREAK_TIERS[i].coinBonusPercent).toBeGreaterThan(
          STREAK_TIERS[i - 1].coinBonusPercent
        );
      }
    });
  });

  describe('getStreakTier', () => {
    it('should return null for streak 0', () => {
      expect(getStreakTier(0)).toBeNull();
    });

    it('should return "starting" for 1-2 day streak', () => {
      expect(getStreakTier(1)?.id).toBe('starting');
      expect(getStreakTier(2)?.id).toBe('starting');
    });

    it('should return "hot" for 3-6 day streak', () => {
      expect(getStreakTier(3)?.id).toBe('hot');
      expect(getStreakTier(6)?.id).toBe('hot');
    });

    it('should return "fire" for 7-13 day streak', () => {
      expect(getStreakTier(7)?.id).toBe('fire');
      expect(getStreakTier(13)?.id).toBe('fire');
    });

    it('should return "epic" for 14-29 day streak', () => {
      expect(getStreakTier(14)?.id).toBe('epic');
      expect(getStreakTier(29)?.id).toBe('epic');
    });

    it('should return "legendary" for 30-59 day streak', () => {
      expect(getStreakTier(30)?.id).toBe('legendary');
      expect(getStreakTier(59)?.id).toBe('legendary');
    });

    it('should return "mythic" for 60-99 day streak', () => {
      expect(getStreakTier(60)?.id).toBe('mythic');
      expect(getStreakTier(99)?.id).toBe('mythic');
    });

    it('should return "immortal" for 100+ day streak', () => {
      expect(getStreakTier(100)?.id).toBe('immortal');
      expect(getStreakTier(365)?.id).toBe('immortal');
    });
  });

  describe('getStreakCoinBonusPercent', () => {
    it('should return 0 for no streak', () => {
      expect(getStreakCoinBonusPercent(0)).toBe(0);
    });

    it('should return 0 for starting tier (no bonus yet)', () => {
      expect(getStreakCoinBonusPercent(1)).toBe(0);
    });

    it('should return 5 for hot tier', () => {
      expect(getStreakCoinBonusPercent(3)).toBe(5);
    });

    it('should return 10 for fire tier', () => {
      expect(getStreakCoinBonusPercent(7)).toBe(10);
    });

    it('should return 15 for epic tier', () => {
      expect(getStreakCoinBonusPercent(14)).toBe(15);
    });

    it('should return 25 for legendary tier', () => {
      expect(getStreakCoinBonusPercent(30)).toBe(25);
    });

    it('should return 35 for mythic tier', () => {
      expect(getStreakCoinBonusPercent(60)).toBe(35);
    });

    it('should return 50 for immortal tier', () => {
      expect(getStreakCoinBonusPercent(100)).toBe(50);
    });
  });

  describe('getNextTierInfo', () => {
    it('should return starting tier info for streak 0', () => {
      const next = getNextTierInfo(0);
      expect(next?.tier.id).toBe('starting');
      expect(next?.daysNeeded).toBe(1);
    });

    it('should return hot tier info for streak 1', () => {
      const next = getNextTierInfo(1);
      expect(next?.tier.id).toBe('hot');
      expect(next?.daysNeeded).toBe(2);
    });

    it('should return fire tier for streak 5', () => {
      const next = getNextTierInfo(5);
      expect(next?.tier.id).toBe('fire');
      expect(next?.daysNeeded).toBe(2);
    });

    it('should return mythic tier for streak 30', () => {
      const next = getNextTierInfo(30);
      expect(next?.tier.id).toBe('mythic');
      expect(next?.daysNeeded).toBe(30);
    });

    it('should return immortal tier for streak 60', () => {
      const next = getNextTierInfo(60);
      expect(next?.tier.id).toBe('immortal');
      expect(next?.daysNeeded).toBe(40);
    });

    it('should return null for max tier (100+)', () => {
      expect(getNextTierInfo(100)).toBeNull();
      expect(getNextTierInfo(365)).toBeNull();
    });
  });
});
