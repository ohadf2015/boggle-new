import { describe, it, expect } from 'vitest';
import { dailySeed, advanceDaily, readDaily, type DailyState } from '../daily';

const EMPTY: DailyState = { lastDate: null, streak: 0, best: 0 };

describe('dailySeed', () => {
  it('is stable for a UTC day and differs across days', () => {
    expect(dailySeed('2026-10-27')).toBe(dailySeed('2026-10-27'));
    expect(dailySeed('2026-10-27')).not.toBe(dailySeed('2026-10-28'));
  });
});

describe('advanceDaily', () => {
  it('starts a streak on the first finished daily', () => {
    expect(advanceDaily(EMPTY, '2026-10-27')).toEqual({ lastDate: '2026-10-27', streak: 1, best: 1 });
  });
  it('extends the streak on consecutive days', () => {
    const s = advanceDaily({ lastDate: '2026-10-27', streak: 4, best: 4 }, '2026-10-28');
    expect(s).toEqual({ lastDate: '2026-10-28', streak: 5, best: 5 });
  });
  it('does not double count the same day', () => {
    const s: DailyState = { lastDate: '2026-10-27', streak: 4, best: 6 };
    expect(advanceDaily(s, '2026-10-27')).toBe(s);
  });
  it('resets to 1 after a missed day but keeps best', () => {
    expect(advanceDaily({ lastDate: '2026-10-25', streak: 9, best: 9 }, '2026-10-27')).toEqual({
      lastDate: '2026-10-27',
      streak: 1,
      best: 9,
    });
  });
  it('handles month and year rollover', () => {
    expect(advanceDaily({ lastDate: '2026-12-31', streak: 2, best: 2 }, '2027-01-01').streak).toBe(3);
  });
});

describe('readDaily', () => {
  it('shows a broken streak as 0 when the last play was before yesterday', () => {
    const stored = JSON.stringify({ lastDate: '2026-10-20', streak: 5, best: 5 });
    expect(readDaily('2026-10-27', () => stored)).toEqual({ lastDate: '2026-10-20', streak: 0, best: 5 });
  });
  it('keeps a live streak when last play was yesterday', () => {
    const stored = JSON.stringify({ lastDate: '2026-10-26', streak: 5, best: 5 });
    expect(readDaily('2026-10-27', () => stored).streak).toBe(5);
  });
  it('survives garbage storage', () => {
    expect(readDaily('2026-10-27', () => '{nope')).toEqual(EMPTY);
    expect(readDaily('2026-10-27', () => null)).toEqual(EMPTY);
  });
});
