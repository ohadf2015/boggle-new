import { describe, it, expect } from 'vitest';
import { DAILY_PLAYER_ID, utcDateKey, dailyTowerGameCode } from '../dailySeed';

describe('utcDateKey — the calendar day everyone shares', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(utcDateKey(new Date('2026-05-28T13:45:00Z'))).toBe('2026-05-28');
  });

  it('uses UTC, not local time, so the day rolls over identically worldwide', () => {
    // 23:30 in a +03:00 zone is still the 28th in UTC.
    expect(utcDateKey(new Date('2026-05-28T23:30:00Z'))).toBe('2026-05-28');
    // Just past midnight UTC is the next day.
    expect(utcDateKey(new Date('2026-05-29T00:01:00Z'))).toBe('2026-05-29');
  });
});

describe('dailyTowerGameCode — the shared seed key', () => {
  it('derives a stable daily- prefixed code from the UTC day', () => {
    expect(dailyTowerGameCode(new Date('2026-05-28T10:00:00Z'))).toBe('daily-2026-05-28');
  });

  it('gives every player the same code on the same UTC day', () => {
    const a = dailyTowerGameCode(new Date('2026-05-28T00:05:00Z'));
    const b = dailyTowerGameCode(new Date('2026-05-28T22:55:00Z'));
    expect(a).toBe(b);
  });

  it('changes when the UTC day changes', () => {
    expect(dailyTowerGameCode(new Date('2026-05-28T12:00:00Z')))
      .not.toBe(dailyTowerGameCode(new Date('2026-05-29T12:00:00Z')));
  });
});

describe('DAILY_PLAYER_ID — fixes the seed so the tray sequence is identical for all', () => {
  it('is a stable constant', () => {
    expect(DAILY_PLAYER_ID).toBe('daily');
  });
});
