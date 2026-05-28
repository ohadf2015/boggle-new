import { describe, it, expect } from 'vitest';
import {
  EMPTY_STREAK,
  recordDailyPlay,
  displayStreak,
  type DailyStreakState,
} from '../dailyStreak';

describe('recordDailyPlay — building the daily-return habit', () => {
  it('starts a streak at 1 on the first ever play', () => {
    const next = recordDailyPlay(EMPTY_STREAK, '2026-05-28');
    expect(next.current).toBe(1);
    expect(next.best).toBe(1);
    expect(next.lastPlayedDate).toBe('2026-05-28');
  });

  it('extends the streak when you play the very next UTC day', () => {
    const day1 = recordDailyPlay(EMPTY_STREAK, '2026-05-28');
    const day2 = recordDailyPlay(day1, '2026-05-29');
    expect(day2.current).toBe(2);
    expect(day2.best).toBe(2);
  });

  it('is idempotent for the same day — replays do not inflate the streak', () => {
    const first = recordDailyPlay(EMPTY_STREAK, '2026-05-28');
    const again = recordDailyPlay(first, '2026-05-28');
    expect(again.current).toBe(1);
    expect(again).toEqual(first);
  });

  it('resets to 1 when a day is skipped', () => {
    const day1 = recordDailyPlay(EMPTY_STREAK, '2026-05-28');
    // skips the 29th, returns on the 30th
    const day3 = recordDailyPlay(day1, '2026-05-30');
    expect(day3.current).toBe(1);
  });

  it('keeps the best streak even after a reset', () => {
    let s: DailyStreakState = EMPTY_STREAK;
    s = recordDailyPlay(s, '2026-05-26');
    s = recordDailyPlay(s, '2026-05-27');
    s = recordDailyPlay(s, '2026-05-28'); // current 3
    s = recordDailyPlay(s, '2026-05-30'); // skip → reset to 1
    expect(s.current).toBe(1);
    expect(s.best).toBe(3);
  });

  it('handles month boundaries (28→May ends, June begins)', () => {
    const may31 = recordDailyPlay(EMPTY_STREAK, '2026-05-31');
    const jun1 = recordDailyPlay(may31, '2026-06-01');
    expect(jun1.current).toBe(2);
  });
});

describe('displayStreak — what the chip shows right now', () => {
  it('is 0 with no history', () => {
    expect(displayStreak(EMPTY_STREAK, '2026-05-28')).toBe(0);
  });

  it('shows the live count on the day you played', () => {
    const s = recordDailyPlay(EMPTY_STREAK, '2026-05-28');
    expect(displayStreak(s, '2026-05-28')).toBe(1);
  });

  it('still shows the streak the day AFTER your last play (grace — not yet lapsed)', () => {
    const s = recordDailyPlay(recordDailyPlay(EMPTY_STREAK, '2026-05-27'), '2026-05-28');
    expect(displayStreak(s, '2026-05-29')).toBe(2);
  });

  it('shows 0 once two or more days have passed (streak lapsed)', () => {
    const s = recordDailyPlay(EMPTY_STREAK, '2026-05-28');
    expect(displayStreak(s, '2026-05-30')).toBe(0);
  });
});
