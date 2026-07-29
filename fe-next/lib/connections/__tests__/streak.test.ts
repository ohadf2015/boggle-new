import { describe, it, expect } from 'vitest';
import { yesterdayISO, nextStreakValue, clientStreakAfterSolve } from '../streak';

describe('connections streak — UTC day math', () => {
  it('yesterdayISO handles plain, month, and year boundaries', () => {
    expect(yesterdayISO('2026-05-30')).toBe('2026-05-29');
    expect(yesterdayISO('2026-06-01')).toBe('2026-05-31');
    expect(yesterdayISO('2026-01-01')).toBe('2025-12-31');
  });
});

describe('connections streak — server-side resolution (anti-cheat)', () => {
  it('starts at 1 when there is no D-1 row', () => {
    expect(nextStreakValue(null)).toBe(1);
  });
  it('increments the D-1 streak (never trusts the client value)', () => {
    expect(nextStreakValue(4)).toBe(5);
    expect(nextStreakValue(0)).toBe(1);
  });
});

describe('connections streak — guest/localStorage advance', () => {
  it('starts a fresh streak', () => {
    expect(clientStreakAfterSolve(null, '2026-05-30')).toEqual({ streak: 1, lastDate: '2026-05-30' });
  });
  it('continues when last solve was yesterday', () => {
    expect(clientStreakAfterSolve({ streak: 3, lastDate: '2026-05-29' }, '2026-05-30')).toEqual({
      streak: 4,
      lastDate: '2026-05-30',
    });
  });
  it('is idempotent on a same-day re-solve', () => {
    expect(clientStreakAfterSolve({ streak: 3, lastDate: '2026-05-30' }, '2026-05-30')).toEqual({
      streak: 3,
      lastDate: '2026-05-30',
    });
  });
  it('resets to 1 after a missed day', () => {
    expect(clientStreakAfterSolve({ streak: 7, lastDate: '2026-05-27' }, '2026-05-30')).toEqual({
      streak: 1,
      lastDate: '2026-05-30',
    });
  });
});
