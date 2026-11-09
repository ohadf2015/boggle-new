import { describe, it, expect } from 'vitest';
import {
  CHEST_DAYS_REQUIRED,
  CHEST_WEEKLY_RULE_START,
  weekStartOf,
  computeWeekProgress,
  findQualifiedPastWeeks,
  findOwedChests,
} from '../weeklyChest';

const days = (start: string, n: number, skip: number[] = []) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(start + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  }).filter((_, i) => !skip.includes(i));

describe('weekly chest, 5 of 7', () => {
  it('weeks start on Monday (UTC)', () => {
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(weekStartOf('2026-11-16')).toBe('2026-11-16');
  });

  it('fills on the 5th day of the week even with gaps', () => {
    expect(CHEST_DAYS_REQUIRED).toBe(5);
    const played = days('2026-11-09', 6, [1]); // Mon, Wed, Thu, Fri, Sat
    const p = computeWeekProgress(played, '2026-11-14');
    expect(p.cycleStart).toBe('2026-11-09');
    expect(p.daysCompleted).toBe(5);
    expect(p.isClaimable).toBe(true);
  });

  it('is not claimable at 4 days, and last week does not count toward this one', () => {
    const played = [...days('2026-11-02', 7), ...days('2026-11-09', 4)];
    const p = computeWeekProgress(played, '2026-11-12');
    expect(p.daysCompleted).toBe(4);
    expect(p.isClaimable).toBe(false);
  });

  it('still owes last week on Monday, but never weeks before the rule started', () => {
    const lastWeek = days('2026-11-09', 5);
    expect(findQualifiedPastWeeks(lastWeek, '2026-11-16')).toEqual([
      expect.objectContaining({ cycleStart: '2026-11-09', completedDates: lastWeek }),
    ]);
    expect(findQualifiedPastWeeks(days('2026-11-09', 4), '2026-11-16')).toEqual([]);
    expect(findQualifiedPastWeeks(days('2026-11-02', 7), '2026-11-10')).toEqual([]);
    expect(CHEST_WEEKLY_RULE_START).toBe('2026-11-09');
  });

  it('keeps a 7-in-a-row chest earned under the old rule claimable', () => {
    const oldRun = days('2026-11-01', 7); // ends Sat 11-07, before the switch
    const owed = findOwedChests(oldRun, '2026-11-10');
    expect(owed.map((c) => c.cycleStart)).toEqual(['2026-11-01']);
  });

  it('does not let an old run that crosses the switch mint a legacy chest from new-week days', () => {
    const run = days('2026-11-05', 7); // 11-05..11-11
    expect(findOwedChests(run, '2026-11-11')).toEqual([]);
  });
});
