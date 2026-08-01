import { describe, it, expect, beforeEach } from 'vitest';
import {
  dailyShareText,
  todayUTC,
  markConnectionsPlayedToday,
  hasPlayedConnectionsToday,
} from '../dailyClient';

describe('dailyShareText — shareable daily result', () => {
  it('includes title, date, solved/total, streak and rank', () => {
    const txt = dailyShareText({
      title: 'Word Bridge',
      dateISO: '2026-05-30',
      puzzlesSolved: 4,
      total: 5,
      streak: 3,
      rank: 12,
    });
    expect(txt).toContain('Word Bridge');
    expect(txt).toContain('2026-05-30');
    expect(txt).toContain('4/5');
    expect(txt).toContain('3');
    expect(txt).toContain('#12');
  });

  it('omits the rank fragment when rank is null', () => {
    const txt = dailyShareText({
      title: 'Word Bridge',
      dateISO: '2026-05-30',
      puzzlesSolved: 5,
      total: 5,
      streak: 1,
      rank: null,
    });
    expect(txt).not.toContain('#');
    expect(txt).toContain('5/5');
  });
});

describe('connections played-today marker — unconditional, works for authed + guest', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('is false before the daily is played', () => {
    expect(hasPlayedConnectionsToday()).toBe(false);
  });

  it('is true after marking today', () => {
    markConnectionsPlayedToday();
    expect(hasPlayedConnectionsToday()).toBe(true);
  });

  it('is false when the stored marker is for a previous day', () => {
    markConnectionsPlayedToday('2020-01-01');
    expect(hasPlayedConnectionsToday()).toBe(false);
  });

  it('marks the current UTC day when no date is passed', () => {
    markConnectionsPlayedToday();
    expect(hasPlayedConnectionsToday()).toBe(true);
    // sanity: the helper agrees with todayUTC()
    markConnectionsPlayedToday(todayUTC());
    expect(hasPlayedConnectionsToday()).toBe(true);
  });
});

describe('msUntilNextUtcDay — results-screen countdown', () => {
  it('returns one hour at 23:00 UTC', async () => {
    const { msUntilNextUtcDay } = await import('../dailyClient');
    expect(msUntilNextUtcDay(new Date('2026-08-01T23:00:00.000Z'))).toBe(3_600_000);
  });

  it('returns a full day right at midnight UTC', async () => {
    const { msUntilNextUtcDay } = await import('../dailyClient');
    expect(msUntilNextUtcDay(new Date('2026-08-01T00:00:00.000Z'))).toBe(86_400_000);
  });

  it('counts down to the next UTC midnight, not local midnight', async () => {
    const { msUntilNextUtcDay } = await import('../dailyClient');
    expect(msUntilNextUtcDay(new Date('2026-08-01T21:15:30.500Z'))).toBe(
      2 * 3_600_000 + 44 * 60_000 + 29_500,
    );
  });
});
