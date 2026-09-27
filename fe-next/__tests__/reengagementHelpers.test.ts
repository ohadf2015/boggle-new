/**
 * Pure-function tests for re-engagement enrichment helpers.
 *
 * These power the personalization chips in ReengagementEmailV2:
 *  • computeHoursUntilReset → "6h left before reset" urgency chip
 *  • computeDaysSinceLastPlay → "14 days no-show" loss-aversion chip
 */

import { describe, it, expect } from 'vitest';
import {
  computeHoursUntilReset,
  computeDaysSinceLastPlay,
} from '@/lib/reengagementEnrichment';

describe('computeHoursUntilReset', () => {
  it('returns hours until next local midnight (UTC tz, mid-afternoon)', () => {
    const now = new Date('2026-05-14T18:00:00.000Z'); // 18:00 UTC
    expect(computeHoursUntilReset('UTC', now)).toBe(6);
  });

  it('returns ≤ 1 when within an hour of local midnight', () => {
    const now = new Date('2026-05-14T23:15:00.000Z'); // 23:15 UTC → 45min to midnight
    const h = computeHoursUntilReset('UTC', now);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(1);
  });

  it('rounds up to bias toward urgency framing (5.3h → 6h)', () => {
    const now = new Date('2026-05-14T18:40:00.000Z'); // 5h20m → ceil to 6
    expect(computeHoursUntilReset('UTC', now)).toBe(6);
  });

  it('respects a non-UTC timezone (Tokyo)', () => {
    // 2026-05-14T15:00Z = 2026-05-15T00:00 in Tokyo (UTC+9). 24h until next midnight there.
    const now = new Date('2026-05-14T15:00:00.000Z');
    const h = computeHoursUntilReset('Asia/Tokyo', now);
    expect(h).toBeGreaterThanOrEqual(23);
    expect(h).toBeLessThanOrEqual(24);
  });

  it('falls back to UTC for invalid timezone strings', () => {
    const now = new Date('2026-05-14T18:00:00.000Z');
    expect(computeHoursUntilReset('Not/A_Real_Zone', now)).toBe(
      computeHoursUntilReset('UTC', now),
    );
  });

  it('returns a positive integer always (never negative, never > 24)', () => {
    for (const iso of [
      '2026-01-01T00:00:00.000Z',
      '2026-06-15T12:00:00.000Z',
      '2026-12-31T23:59:00.000Z',
    ]) {
      const h = computeHoursUntilReset('UTC', new Date(iso));
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(24);
      expect(Number.isInteger(h)).toBe(true);
    }
  });
});

describe('computeDaysSinceLastPlay', () => {
  it('returns null when lastPlayedDate is null/undefined', () => {
    expect(computeDaysSinceLastPlay(null, new Date('2026-05-14'))).toBeNull();
    expect(computeDaysSinceLastPlay(undefined, new Date('2026-05-14'))).toBeNull();
  });

  it('returns integer day delta from lastPlayed to now', () => {
    const now = new Date('2026-05-14T08:00:00.000Z');
    const lastPlay = new Date('2026-04-30T08:00:00.000Z'); // 14 days ago
    expect(computeDaysSinceLastPlay(lastPlay, now)).toBe(14);
  });

  it('accepts an ISO date string', () => {
    const now = new Date('2026-05-14T08:00:00.000Z');
    expect(computeDaysSinceLastPlay('2026-04-30', now)).toBe(14);
  });

  it('floors partial days (12h ago → 0 days)', () => {
    const now = new Date('2026-05-14T20:00:00.000Z');
    const lastPlay = new Date('2026-05-14T08:00:00.000Z'); // 12h ago
    expect(computeDaysSinceLastPlay(lastPlay, now)).toBe(0);
  });

  it('returns null for unparseable date strings rather than NaN', () => {
    expect(computeDaysSinceLastPlay('not-a-date', new Date('2026-05-14'))).toBeNull();
  });
});
