import { describe, it, expect } from 'vitest';
import { formatNotificationTime } from '../formatNotificationTime';

// Fake t: echoes the chosen key + count so we assert the LOGIC (threshold +
// singular/plural selection), independent of real translation strings.
const t = (key: string, params?: Record<string, string | number>) =>
  params && 'count' in params ? `${key}:${params.count}` : key;

const now = 1_700_000_000_000;
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe('formatNotificationTime', () => {
  it('renders "just now" under 60s', () => {
    expect(formatNotificationTime(now - 30_000, now, t)).toBe('notifications.justNow');
  });

  it('uses singular minute at exactly 1 minute', () => {
    expect(formatNotificationTime(now - 1 * MIN, now, t)).toBe('notifications.minutesAgo:1');
  });

  it('uses plural minutes', () => {
    expect(formatNotificationTime(now - 5 * MIN, now, t)).toBe('notifications.minutesAgoPlural:5');
  });

  it('uses singular hour at exactly 1 hour', () => {
    expect(formatNotificationTime(now - 1 * HR, now, t)).toBe('notifications.hoursAgo:1');
  });

  it('uses plural hours', () => {
    expect(formatNotificationTime(now - 3 * HR, now, t)).toBe('notifications.hoursAgoPlural:3');
  });

  it('uses singular day at exactly 1 day', () => {
    expect(formatNotificationTime(now - 1 * DAY, now, t)).toBe('notifications.daysAgo:1');
  });

  it('uses plural days', () => {
    expect(formatNotificationTime(now - 4 * DAY, now, t)).toBe('notifications.daysAgoPlural:4');
  });

  it('accepts an ISO string', () => {
    expect(formatNotificationTime(new Date(now - 30_000).toISOString(), now, t)).toBe('notifications.justNow');
  });

  it('clamps future timestamps to "just now"', () => {
    expect(formatNotificationTime(now + 10_000, now, t)).toBe('notifications.justNow');
  });
});
