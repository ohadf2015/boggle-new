import {
  DAILY_REWARD_SCHEDULE,
  getRewardForDay,
  getNextMilestone,
  getRewardCoins,
} from '../dailyRewards';

describe('dailyRewards', () => {
  describe('DAILY_REWARD_SCHEDULE', () => {
    it('has entries sorted by ascending day', () => {
      for (let i = 1; i < DAILY_REWARD_SCHEDULE.length; i++) {
        expect(DAILY_REWARD_SCHEDULE[i].day).toBeGreaterThan(
          DAILY_REWARD_SCHEDULE[i - 1].day
        );
      }
    });
  });

  describe('getRewardForDay', () => {
    it('returns exact milestone reward for day 1', () => {
      const reward = getRewardForDay(1);
      expect(reward.coins).toBe(10);
      expect(reward.label).toBe('starter');
    });

    it('returns coins for day 7 without warrior badge (replaced by weekly chest)', () => {
      const reward = getRewardForDay(7);
      expect(reward.coins).toBe(100);
      expect(reward.badge).toBeUndefined();
      expect(reward.label).toBe('weekWarrior');
    });

    it('returns exact milestone reward for day 100', () => {
      const reward = getRewardForDay(100);
      expect(reward.coins).toBe(1000);
      expect(reward.badge).toBe('centurion');
    });

    it('returns interpolated reward for day 4 (between day 3=25 and day 5=50)', () => {
      const reward = getRewardForDay(4);
      // Linear interpolation: 25 + (50-25) * (4-3)/(5-3) = 25 + 12.5 = 37
      expect(reward.coins).toBe(37);
      expect(reward.badge).toBeUndefined();
    });

    it('returns interpolated reward for day 10 (between day 7=100 and day 14=200)', () => {
      const reward = getRewardForDay(10);
      // 100 + (200-100) * (10-7)/(14-7) = 100 + 42.8 = 142
      expect(reward.coins).toBe(142);
    });

    it('returns day 1 reward for day 0 or negative', () => {
      expect(getRewardForDay(0).coins).toBe(10);
      expect(getRewardForDay(-5).coins).toBe(10);
    });

    it('extrapolates for days beyond 100', () => {
      const reward = getRewardForDay(150);
      // Beyond last milestone, should return last milestone coins (1000)
      expect(reward.coins).toBe(1000);
    });
  });

  describe('getNextMilestone', () => {
    it('returns day 2 milestone when on day 1', () => {
      const next = getNextMilestone(1);
      expect(next!.day).toBe(2);
      expect(next!.coins).toBe(15);
    });

    it('returns day 7 milestone when on day 5', () => {
      const next = getNextMilestone(5);
      expect(next!.day).toBe(7);
      expect(next!.coins).toBe(100);
    });

    it('returns day 7 milestone when on day 6 (no badge — replaced by weekly chest)', () => {
      const next = getNextMilestone(6);
      expect(next!.day).toBe(7);
      expect(next!.coins).toBe(100);
      expect(next!.badge).toBeUndefined();
    });

    it('returns null when on day 100 (last milestone)', () => {
      const next = getNextMilestone(100);
      expect(next).toBeNull();
    });

    it('returns day 1 milestone for day 0', () => {
      const next = getNextMilestone(0);
      expect(next!.day).toBe(1);
    });

    describe('with { badgeOnly: true }', () => {
      it('skips non-badge milestones AND the now-badgeless day-7 milestone', () => {
        // Day 7 used to surface weekly_warrior; weekly chest replaces it,
        // so the next badge milestone for a fresh user is fortnight_fighter (day 14).
        const next = getNextMilestone(0, { badgeOnly: true });
        expect(next!.day).toBe(14);
        expect(next!.badge).toBe('fortnight_fighter');
      });

      it('returns day 14 fortnight when on day 7', () => {
        const next = getNextMilestone(7, { badgeOnly: true });
        expect(next!.day).toBe(14);
        expect(next!.badge).toBe('fortnight_fighter');
      });

      it('skips veteran (day 50, no badge) for centurion (day 100)', () => {
        const next = getNextMilestone(50, { badgeOnly: true });
        expect(next!.day).toBe(100);
        expect(next!.badge).toBe('centurion');
      });

      it('returns null past last badge milestone', () => {
        expect(getNextMilestone(100, { badgeOnly: true })).toBeNull();
        expect(getNextMilestone(150, { badgeOnly: true })).toBeNull();
      });
    });
  });

  describe('getRewardCoins', () => {
    it('returns exact coins for milestone days', () => {
      expect(getRewardCoins(1)).toBe(10);
      expect(getRewardCoins(7)).toBe(100);
      expect(getRewardCoins(30)).toBe(500);
    });

    it('interpolates between milestones', () => {
      // Day 4: between 3(25) and 5(50) → 37
      expect(getRewardCoins(4)).toBe(37);
    });

    it('caps at last milestone for days beyond schedule', () => {
      expect(getRewardCoins(200)).toBe(1000);
    });
  });
});
