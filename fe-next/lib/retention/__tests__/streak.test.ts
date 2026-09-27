/**
 * Retention streak logic tests — the D1 habit loop.
 *
 * Covers the pure date math (applyPlay / displayStreak / isoWeekKey) plus the
 * localStorage persistence layer (recordRetentionPlay idempotency). The
 * weekly streak freeze is the load-bearing mechanic: exactly one missed day
 * is absorbed while a freeze is in inventory; freezes restock on ISO week
 * rollover and never bank.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  EMPTY_RETENTION_STREAK,
  RETENTION_STREAK_LS_KEY,
  __resetRetentionStreakCache,
  applyPlay,
  daysBetween,
  displayStreak,
  getRetentionStreak,
  isoWeekKey,
  recordRetentionPlay,
  utcTodayKey,
  type RetentionStreakState,
} from '../streak';

const state = (overrides: Partial<RetentionStreakState> = {}): RetentionStreakState => ({
  ...EMPTY_RETENTION_STREAK,
  freeze: { weekKey: '2026-W32', available: true },
  ...overrides,
});

describe('utcTodayKey / daysBetween', () => {
  it('formats a UTC date as YYYY-MM-DD', () => {
    expect(utcTodayKey(new Date(Date.UTC(2026, 7, 10, 23, 59)))).toBe('2026-08-10');
  });

  it('counts whole days, calendar-safe across months and DST-less UTC', () => {
    expect(daysBetween('2026-08-10', '2026-08-10')).toBe(0);
    expect(daysBetween('2026-08-10', '2026-08-11')).toBe(1);
    expect(daysBetween('2026-07-31', '2026-08-02')).toBe(2);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('isoWeekKey', () => {
  it('follows ISO 8601 week numbering', () => {
    expect(isoWeekKey('2026-08-10')).toBe('2026-W33'); // Monday of W33
    expect(isoWeekKey('2026-08-09')).toBe('2026-W32'); // Sunday belongs to W32
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01');
  });

  it('handles the year boundary (Dec 29 2025 is already 2026-W01)', () => {
    expect(isoWeekKey('2025-12-29')).toBe('2026-W01');
  });
});

describe('applyPlay', () => {
  it('starts a streak on the first ever play', () => {
    const r = applyPlay(state({ lastPlayedDate: null }), '2026-08-10');
    expect(r.outcome).toBe('started');
    expect(r.state.current).toBe(1);
    expect(r.state.best).toBe(1);
    expect(r.state.lastPlayedDate).toBe('2026-08-10');
  });

  it('is idempotent within the same day', () => {
    const prev = state({ current: 4, best: 4, lastPlayedDate: '2026-08-10' });
    const r = applyPlay(prev, '2026-08-10');
    expect(r.outcome).toBe('already-counted');
    expect(r.state).toBe(prev);
  });

  it('continues on a one-day gap', () => {
    const r = applyPlay(
      state({ current: 3, best: 5, lastPlayedDate: '2026-08-09' }),
      '2026-08-10',
    );
    expect(r.outcome).toBe('continued');
    expect(r.state.current).toBe(4);
    expect(r.state.best).toBe(5); // best never decreases, only max() up
    expect(r.state.freeze.available).toBe(true); // untouched
  });

  it('consumes the weekly freeze on exactly one missed day', () => {
    const r = applyPlay(
      state({ current: 6, best: 6, lastPlayedDate: '2026-08-08' }),
      '2026-08-10',
    );
    expect(r.outcome).toBe('freeze-consumed');
    expect(r.state.current).toBe(7);
    expect(r.state.freeze.available).toBe(false);
    expect(r.previousStreak).toBe(6);
  });

  it('breaks on one missed day when the freeze is already spent', () => {
    const r = applyPlay(
      state({
        current: 6,
        best: 6,
        lastPlayedDate: '2026-08-08',
        freeze: { weekKey: isoWeekKey('2026-08-10'), available: false },
      }),
      '2026-08-10',
    );
    expect(r.outcome).toBe('broken');
    expect(r.state.current).toBe(1);
    expect(r.state.best).toBe(6);
    expect(r.previousStreak).toBe(6);
  });

  it('breaks on a gap larger than one day even with a freeze available', () => {
    const r = applyPlay(
      state({ current: 10, best: 10, lastPlayedDate: '2026-08-06' }),
      '2026-08-10',
    );
    expect(r.outcome).toBe('broken');
    expect(r.state.current).toBe(1);
  });

  it('restocks the freeze on ISO week rollover', () => {
    // Last played Sunday W32; today is Monday W33 with the freeze spent.
    const r = applyPlay(
      state({
        current: 5,
        best: 5,
        lastPlayedDate: '2026-08-09',
        freeze: { weekKey: '2026-W32', available: false },
      }),
      '2026-08-10',
    );
    expect(r.outcome).toBe('continued');
    expect(r.state.freeze).toEqual({ weekKey: '2026-W33', available: true });
  });

  it('a restocked freeze can immediately absorb a one-day gap across the week boundary', () => {
    // Missed Sunday (W32); playing Monday (W33) — gap of 2, freeze restocks Monday.
    const r = applyPlay(
      state({
        current: 4,
        best: 4,
        lastPlayedDate: '2026-08-08',
        freeze: { weekKey: '2026-W32', available: false },
      }),
      '2026-08-10',
    );
    expect(r.outcome).toBe('freeze-consumed');
    expect(r.state.current).toBe(5);
    expect(r.state.freeze).toEqual({ weekKey: '2026-W33', available: false });
  });

  it('never banks a second freeze (use-it-or-lose-it)', () => {
    const r = applyPlay(
      state({ current: 2, best: 2, lastPlayedDate: '2026-08-09' }),
      '2026-08-10',
    );
    // State carries exactly one boolean freeze slot — no count field exists.
    expect(Object.keys(r.state.freeze)).toEqual(['weekKey', 'available']);
  });
});

describe('displayStreak', () => {
  it('shows 0 for a player who never played', () => {
    expect(displayStreak(state(), '2026-08-10')).toBe(0);
  });

  it('shows the streak for same-day or yesterday play', () => {
    const s = state({ current: 7, best: 7, lastPlayedDate: '2026-08-09' });
    expect(displayStreak(s, '2026-08-09')).toBe(7);
    expect(displayStreak(s, '2026-08-10')).toBe(7);
  });

  it('still shows the streak during the freeze-covered grace day', () => {
    const s = state({ current: 7, best: 7, lastPlayedDate: '2026-08-08' });
    expect(displayStreak(s, '2026-08-10')).toBe(7);
  });

  it('shows 0 once the grace day passed with a spent freeze', () => {
    const s = state({
      current: 7,
      best: 7,
      lastPlayedDate: '2026-08-08',
      freeze: { weekKey: '2026-W33', available: false },
    });
    expect(displayStreak(s, '2026-08-10')).toBe(0);
  });

  it('shows 0 on longer lapses regardless of freeze', () => {
    const s = state({ current: 7, best: 7, lastPlayedDate: '2026-08-06' });
    expect(displayStreak(s, '2026-08-10')).toBe(0);
  });
});

describe('persistence layer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetRetentionStreakCache();
  });

  it('round-trips state through localStorage', () => {
    recordRetentionPlay('2026-08-10');
    __resetRetentionStreakCache();
    const s = getRetentionStreak();
    expect(s.current).toBe(1);
    expect(s.lastPlayedDate).toBe('2026-08-10');
  });

  it('recordRetentionPlay is idempotent within a day', () => {
    const first = recordRetentionPlay('2026-08-10');
    const second = recordRetentionPlay('2026-08-10');
    expect(first.outcome).toBe('started');
    expect(second.outcome).toBe('already-counted');
    expect(getRetentionStreak().current).toBe(1);
  });

  it('survives corrupt localStorage payloads', () => {
    window.localStorage.setItem(RETENTION_STREAK_LS_KEY, '{not json');
    __resetRetentionStreakCache();
    expect(getRetentionStreak()).toEqual(EMPTY_RETENTION_STREAK);
  });

  it('survives partially-shaped payloads', () => {
    window.localStorage.setItem(
      RETENTION_STREAK_LS_KEY,
      JSON.stringify({ current: 3, freeze: null }),
    );
    __resetRetentionStreakCache();
    const s = getRetentionStreak();
    expect(s.current).toBe(3);
    expect(s.freeze.available).toBe(true);
    expect(s.lastPlayedDate).toBeNull();
  });
});
