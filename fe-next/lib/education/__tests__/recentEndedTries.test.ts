import { describe, expect, it } from 'vitest';
import { LATE_JOIN_NOTICE_MS, countStampsInWindow } from '../recentEndedTries';

const NOW = 1_700_000_000_000;

describe('countStampsInWindow — the lobby only nags about the last 10 minutes', () => {
  it('Given a try 9 minutes ago and one 11 minutes ago, Then only the recent student counts', () => {
    const stamps = [NOW - 9 * 60 * 1000, NOW - 11 * 60 * 1000];
    expect(countStampsInWindow(stamps, NOW)).toBe(1);
  });

  it('Given a try exactly at the window edge, Then it still counts', () => {
    expect(countStampsInWindow([NOW - LATE_JOIN_NOTICE_MS], NOW)).toBe(1);
  });

  it('Given a future stamp or a blank, Then it does not count', () => {
    expect(countStampsInWindow([NOW + 1000, Number.NaN], NOW)).toBe(0);
  });
});
