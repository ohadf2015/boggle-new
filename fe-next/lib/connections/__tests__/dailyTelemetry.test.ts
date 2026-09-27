/**
 * The Connections daily has ZERO events in PostHog — there is currently no way
 * to tell a content problem from a discovery problem, or to evaluate any change
 * shipped to the mode. This slice covers the funnel the daily actually has:
 * start → per-bridge outcome → run complete → share.
 *
 * Every call must be non-throwing: telemetry is never allowed to break a run.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { get capture() { return capture; } } }));

import {
  trackDailyStarted,
  trackDailyBridgeResolved,
  trackDailyCompleted,
  trackDailyShared,
} from '../dailyTelemetry';

beforeEach(() => capture.mockReset());

describe('connections daily telemetry', () => {
  it('records a run start with the locale and puzzle count', () => {
    trackDailyStarted({ locale: 'he', puzzleCount: 5, dateISO: '2026-08-08' });
    expect(capture).toHaveBeenCalledWith('connections_daily_started', {
      surface: 'connections_daily',
      locale: 'he',
      puzzle_count: 5,
      puzzle_date: '2026-08-08',
    });
  });

  it('records each bridge outcome with how it ended', () => {
    trackDailyBridgeResolved({
      locale: 'he', puzzleId: 'he-1', index: 2, solved: true, wrongAttempts: 1, hintUsed: false,
    });
    expect(capture).toHaveBeenCalledWith('connections_daily_bridge_resolved', {
      surface: 'connections_daily',
      locale: 'he',
      puzzle_id: 'he-1',
      bridge_index: 2,
      solved: true,
      wrong_attempts: 1,
      hint_used: false,
    });
  });

  it('records the finished run with the solve count', () => {
    trackDailyCompleted({ locale: 'en', solved: 3, total: 5, score: 700, durationSeconds: 142 });
    expect(capture).toHaveBeenCalledWith('connections_daily_completed', {
      surface: 'connections_daily',
      locale: 'en',
      solved: 3,
      total: 5,
      score: 700,
      duration_seconds: 142,
      blanked: false,
    });
  });

  it('flags a blanked run — the failure mode worth watching', () => {
    trackDailyCompleted({ locale: 'en', solved: 0, total: 5, score: 0, durationSeconds: 60 });
    expect(capture.mock.calls[0][1]).toMatchObject({ solved: 0, blanked: true });
  });

  it('records a share', () => {
    trackDailyShared({ locale: 'sv', solved: 5, total: 5 });
    expect(capture).toHaveBeenCalledWith('connections_daily_shared', {
      surface: 'connections_daily', locale: 'sv', solved: 5, total: 5,
    });
  });

  it('never throws when the analytics client blows up', () => {
    capture.mockImplementation(() => { throw new Error('posthog down'); });
    try {
      expect(() => trackDailyStarted({ locale: 'he', puzzleCount: 5, dateISO: '2026-08-08' })).not.toThrow();
      expect(() => trackDailyCompleted({ locale: 'he', solved: 1, total: 5, score: 10, durationSeconds: 5 })).not.toThrow();
      expect(() => trackDailyBridgeResolved({
        locale: 'he', puzzleId: 'x', index: 0, solved: false, wrongAttempts: 4, hintUsed: true,
      })).not.toThrow();
      expect(() => trackDailyShared({ locale: 'he', solved: 1, total: 5 })).not.toThrow();
    } finally {
      // Leave the throwing impl in place and it fires again during teardown,
      // surfacing as a raw unhandled error instead of a test result.
      capture.mockReset();
    }
  });
});
