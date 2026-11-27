import { describe, it, expect } from 'vitest';
import {
  addLocalDays,
  isValidTimeZone,
  localDateOf,
  localDayElapsed,
  resolveAdminTimeZone,
  withViewerTz,
  zonedMidnightUtc,
} from '../viewerTimeZone';

describe('resolveAdminTimeZone', () => {
  it('accepts a real IANA name and falls back to UTC otherwise', () => {
    expect(resolveAdminTimeZone('Asia/Jerusalem')).toBe('Asia/Jerusalem');
    expect(resolveAdminTimeZone('America/New_York')).toBe('America/New_York');
    expect(resolveAdminTimeZone('UTC')).toBe('UTC');
    expect(resolveAdminTimeZone(undefined)).toBe('UTC');
    expect(resolveAdminTimeZone('')).toBe('UTC');
    expect(resolveAdminTimeZone('not a zone')).toBe('UTC');
    expect(resolveAdminTimeZone('UTC;DROP')).toBe('UTC');
    expect(resolveAdminTimeZone('a'.repeat(80))).toBe('UTC');
  });

  it('rejects invalid names that Intl would throw on', () => {
    expect(isValidTimeZone('Foo/Bar')).toBe(false);
    expect(isValidTimeZone('Asia/Jerusalem')).toBe(true);
  });
});

describe('local calendar helpers', () => {
  it('converts local midnight in Israel and New York to the right UTC instant', () => {
    expect(new Date(zonedMidnightUtc('2026-11-28', 'Asia/Jerusalem')).toISOString()).toBe('2026-11-27T22:00:00.000Z');
    expect(new Date(zonedMidnightUtc('2026-11-28', 'America/New_York')).toISOString()).toBe('2026-11-28T05:00:00.000Z');
    expect(new Date(zonedMidnightUtc('2026-11-28', 'UTC')).toISOString()).toBe('2026-11-28T00:00:00.000Z');
  });

  it('labels the calendar date in the viewer timezone, not UTC', () => {
    const justAfterIsraelMidnight = Date.parse('2026-11-27T22:30:00Z');
    expect(localDateOf(justAfterIsraelMidnight, 'Asia/Jerusalem')).toBe('2026-11-28');
    expect(localDateOf(justAfterIsraelMidnight, 'UTC')).toBe('2026-11-27');
  });

  it('adds calendar days without using UTC time-of-day', () => {
    expect(addLocalDays('2026-11-28', -6)).toBe('2026-11-22');
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('measures elapsed time from local midnight', () => {
    const noonIsrael = Date.parse('2026-11-28T10:00:00Z'); // 12:00 in Israel (UTC+2)
    expect(localDayElapsed(noonIsrael, 'Asia/Jerusalem')).toBeCloseTo(0.5, 5);
    expect(localDayElapsed(noonIsrael, 'UTC')).toBeCloseTo(10 / 24, 5);
  });

  it('appends a tz query param', () => {
    expect(withViewerTz('/api/admin/stats', 'Asia/Jerusalem')).toBe('/api/admin/stats?tz=Asia%2FJerusalem');
    expect(withViewerTz('/api/admin/activity/daily?days=30', 'UTC')).toBe('/api/admin/activity/daily?days=30&tz=UTC');
  });
});
