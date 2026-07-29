import { describe, it, expect } from 'vitest';
import { getDateRangeStart, DATE_RANGES } from '../../constants';

describe('getDateRangeStart', () => {
  const NOW = new Date('2026-05-15T12:00:00.000Z');

  it('returns today (YYYY-MM-DD) for today range', () => {
    expect(getDateRangeStart('today', NOW)).toBe('2026-05-15');
  });

  it('returns 7-days-ago for 7d range', () => {
    expect(getDateRangeStart('7d', NOW)).toBe('2026-05-08');
  });

  it('returns 30-days-ago for 30d range', () => {
    expect(getDateRangeStart('30d', NOW)).toBe('2026-04-15');
  });

  it('returns 90-days-ago for 90d range', () => {
    expect(getDateRangeStart('90d', NOW)).toBe('2026-02-14');
  });

  it('returns null for all range', () => {
    expect(getDateRangeStart('all', NOW)).toBeNull();
  });

  it('handles every supported range without throwing', () => {
    for (const r of DATE_RANGES) {
      expect(() => getDateRangeStart(r, NOW)).not.toThrow();
    }
  });
});
