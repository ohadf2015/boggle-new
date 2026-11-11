import { describe, it, expect, beforeEach } from 'vitest';
import { cheerMilestone, cheerKey, markMilestoneCheered } from '../milestoneCheer';

const TODAY = '2026-11-11';

describe('cheerMilestone', () => {
  it('Given a 7-day streak played today, cheers the 7-day milestone', () => {
    expect(cheerMilestone(7, true, TODAY)?.days).toBe(7);
  });

  it('Given streaks below 7, stays quiet', () => {
    expect(cheerMilestone(3, true, TODAY)).toBeNull();
    expect(cheerMilestone(6, true, TODAY)).toBeNull();
  });

  it('Given the milestone was reached yesterday (one day late), still cheers it', () => {
    expect(cheerMilestone(8, true, TODAY)?.days).toBe(7);
    expect(cheerMilestone(31, false, TODAY)?.days).toBe(30);
  });

  it('Given a long streak well past the last milestone, does not cheer an old one', () => {
    expect(cheerMilestone(12, true, TODAY)).toBeNull();
    expect(cheerMilestone(45, true, TODAY)).toBeNull();
  });

  it('keys the cheer to this streak run, so a new run can earn it again', () => {
    const playedToday = cheerMilestone(7, true, TODAY)!;
    const sameRunNextDay = cheerMilestone(8, true, '2026-11-12')!;
    expect(sameRunNextDay.key).toBe(playedToday.key);
    expect(cheerMilestone(7, true, '2026-12-01')!.key).not.toBe(playedToday.key);
    expect(playedToday.key).toBe(cheerKey(7, '2026-11-05'));
  });

  it('counts a streak not yet played today from yesterday', () => {
    expect(cheerMilestone(7, false, TODAY)!.key).toBe(cheerKey(7, '2026-11-04'));
  });
});

describe('markMilestoneCheered', () => {
  beforeEach(() => localStorage.clear());

  it('marks the run so the home cheer does not repeat a celebration already shown elsewhere', () => {
    markMilestoneCheered(7, 7, true, TODAY);
    expect(localStorage.getItem(cheerKey(7, '2026-11-05'))).toBe('1');
  });
});

describe('markMilestoneCheered without a known streak', () => {
  it('does nothing instead of throwing', () => {
    expect(() => markMilestoneCheered(7, Number.NaN, true, TODAY)).not.toThrow();
  });
});
