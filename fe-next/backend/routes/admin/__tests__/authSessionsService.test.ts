/**
 * Tests for auth-game-sessions admin aggregator.
 * Mirrors the existing guest-games aggregator but filters to authenticated
 * players only (user_id NOT NULL). Same response shape as guest stats.
 */

import { aggregateAuthSessions } from '../authSessionsService';

const SESSIONS = [
  { user_id: 'u1', mode: 'multiplayer', language: 'en', score: 200, duration_seconds: 180, completed: true },
  { user_id: 'u1', mode: 'multiplayer', language: 'en', score: 150, duration_seconds: 120, completed: true },
  { user_id: 'u2', mode: 'singleplayer', language: 'he', score: 80, duration_seconds: 60, completed: false },
  { user_id: 'u2', mode: 'singleplayer', language: 'he', score: 100, duration_seconds: 70, completed: true },
  { user_id: 'u3', mode: 'daily_challenge', language: 'en', score: 50, duration_seconds: 45, completed: true },
];

describe('aggregateAuthSessions', () => {
  it('counts total games + total score + average score', () => {
    const result = aggregateAuthSessions(SESSIONS);
    expect(result.totalGames).toBe(5);
    expect(result.totalScore).toBe(580);
    expect(result.avgScore).toBe(116);
  });

  it('counts unique users', () => {
    const result = aggregateAuthSessions(SESSIONS);
    expect(result.uniqueUsers).toBe(3);
  });

  it('breaks down by mode, sorted by count desc', () => {
    const result = aggregateAuthSessions(SESSIONS);
    expect(result.byMode).toEqual([
      { mode: 'multiplayer', count: 2 },
      { mode: 'singleplayer', count: 2 },
      { mode: 'daily_challenge', count: 1 },
    ]);
  });

  it('breaks down by language, sorted by count desc', () => {
    const result = aggregateAuthSessions(SESSIONS);
    expect(result.byLanguage).toEqual([
      { language: 'en', count: 3 },
      { language: 'he', count: 2 },
    ]);
  });

  it('counts completion rate', () => {
    const result = aggregateAuthSessions(SESSIONS);
    // 4 of 5 completed = 80%
    expect(result.completedCount).toBe(4);
    expect(result.completionRate).toBe(80);
  });

  it('returns zeroed stats on empty input', () => {
    const result = aggregateAuthSessions([]);
    expect(result).toEqual({
      totalGames: 0,
      totalScore: 0,
      avgScore: 0,
      uniqueUsers: 0,
      completedCount: 0,
      completionRate: 0,
      byMode: [],
      byLanguage: [],
    });
  });
});
