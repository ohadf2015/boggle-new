import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  todayUTC,
  markConnectionsPlayedToday,
  hasPlayedConnectionsToday,
} from '../dailyClient';

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

describe('submitDailyScore — level-up', () => {
  it('announces the level-up a saved score carries', async () => {
    vi.resetModules();
    const publishLevelUp = vi.fn();
    vi.doMock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp }));
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, streak: 1, score: 10, currentRank: 1, totalPlayers: 1, levelUp: { oldLevel: 3, newLevel: 4 } }))));
    const { submitDailyScore } = await import('../dailyClient');
    const out = await submitDailyScore({} as never);
    expect(out.status).toBe('saved');
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 3, newLevel: 4 }, 'dailyConnections');
    vi.unstubAllGlobals();
    vi.doUnmock('@/lib/avatar/revealTrigger');
  });
});
