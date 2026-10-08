import { describe, it, expect } from 'vitest';
import { computeClassStreak } from '../classroomPlayStreak';

describe('computeClassStreak', () => {
  it('given no play days, then the streak is zero', () => {
    expect(computeClassStreak([], '2026-10-08')).toEqual({ streak: 0, playedToday: false });
  });

  it('given the class played today and yesterday, then the streak is two and playedToday is true', () => {
    expect(computeClassStreak(['2026-10-07', '2026-10-08'], '2026-10-08')).toEqual({ streak: 2, playedToday: true });
  });

  it('given the class played yesterday but not yet today, then the streak is still alive', () => {
    expect(computeClassStreak(['2026-10-06', '2026-10-07'], '2026-10-08')).toEqual({ streak: 2, playedToday: false });
  });

  it('given the last play was two days ago, then the streak has broken', () => {
    expect(computeClassStreak(['2026-10-05', '2026-10-06'], '2026-10-08')).toEqual({ streak: 0, playedToday: false });
  });

  it('given a gap in the middle, then only the run ending at today counts', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-08'];
    expect(computeClassStreak(days, '2026-10-08')).toEqual({ streak: 1, playedToday: true });
  });

  it('given duplicate days, then each day counts once', () => {
    expect(computeClassStreak(['2026-10-08', '2026-10-08'], '2026-10-08')).toEqual({ streak: 1, playedToday: true });
  });

  it('given a month boundary, then consecutive days still chain', () => {
    expect(computeClassStreak(['2026-09-30', '2026-10-01'], '2026-10-01')).toEqual({ streak: 2, playedToday: true });
  });
});
