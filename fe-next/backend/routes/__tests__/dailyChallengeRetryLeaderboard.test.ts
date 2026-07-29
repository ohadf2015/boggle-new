/**
 * Daily Challenge Submit — Retry Leaderboard Penalty Logic
 *
 * Bug: When a player retried the daily challenge, the second submission hit
 * the unique constraint on (player_id, puzzle_date, language) and the route
 * returned `alreadySubmitted: true` without updating the leaderboard.
 *
 * Fix: SELECT existing → if present, treat as retry → UPDATE row with
 * (newScore - DAILY_RETRY_LEADERBOARD_PENALTY) clamped to 0 → recompute rank.
 *
 * The pure score-with-penalty helper is exported from the route file so it
 * can be unit-tested without booting Express + mocking Supabase.
 */

import { describe, it, expect } from 'vitest';
import { computeRetryScore } from '../dailyChallenge';

const PENALTY = 100;

describe('computeRetryScore — retry penalty applied to leaderboard score', () => {
  it('returns raw score with no penalty on first attempt', () => {
    expect(computeRetryScore(500, false)).toEqual({
      finalScore: 500,
      penaltyApplied: 0,
    });
  });

  it('subtracts the leaderboard penalty on retry', () => {
    expect(computeRetryScore(800, true)).toEqual({
      finalScore: 800 - PENALTY,
      penaltyApplied: PENALTY,
    });
  });

  it('clamps to 0 when penalty exceeds the new score', () => {
    expect(computeRetryScore(50, true)).toEqual({
      finalScore: 0,
      penaltyApplied: PENALTY,
    });
  });

  it('clamps to 0 when score equals penalty', () => {
    expect(computeRetryScore(PENALTY, true)).toEqual({
      finalScore: 0,
      penaltyApplied: PENALTY,
    });
  });

  it('handles zero score on first attempt', () => {
    expect(computeRetryScore(0, false)).toEqual({
      finalScore: 0,
      penaltyApplied: 0,
    });
  });
});
