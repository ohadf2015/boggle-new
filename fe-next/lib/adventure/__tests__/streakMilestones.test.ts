import { getStreakMilestone, STREAK_MILESTONES } from '../adventureStreak';

describe('getStreakMilestone', () => {
  it('returns null for streak of 0', () => {
    expect(getStreakMilestone(0)).toBeNull();
  });

  it('returns null for non-milestone streak (e.g. 2)', () => {
    expect(getStreakMilestone(2)).toBeNull();
  });

  it('returns milestone for 3-day streak', () => {
    const m = getStreakMilestone(3);
    expect(m).not.toBeNull();
    expect(m!.days).toBe(3);
    expect(m!.rewardGold).toBeGreaterThan(0);
    expect(m!.titleKey).toContain('adventure.streak.milestone');
  });

  it('returns milestone for 7-day streak', () => {
    const m = getStreakMilestone(7);
    expect(m).not.toBeNull();
    expect(m!.days).toBe(7);
    expect(m!.rewardGold).toBeGreaterThan(getStreakMilestone(3)!.rewardGold);
  });

  it('returns milestone for 14-day streak', () => {
    const m = getStreakMilestone(14);
    expect(m).not.toBeNull();
    expect(m!.days).toBe(14);
  });

  it('returns milestone for 30-day streak', () => {
    const m = getStreakMilestone(30);
    expect(m).not.toBeNull();
    expect(m!.days).toBe(30);
    expect(m!.rewardGold).toBeGreaterThan(getStreakMilestone(14)!.rewardGold);
  });

  it('returns null for non-milestone (e.g. 5, 10, 20)', () => {
    expect(getStreakMilestone(5)).toBeNull();
    expect(getStreakMilestone(10)).toBeNull();
    expect(getStreakMilestone(20)).toBeNull();
  });

  it('STREAK_MILESTONES is sorted ascending by days', () => {
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      expect(STREAK_MILESTONES[i].days).toBeGreaterThan(STREAK_MILESTONES[i - 1].days);
    }
  });
});
