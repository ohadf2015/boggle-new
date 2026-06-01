/**
 * Test: feature-gated modes must NOT award leaderboard points / XP.
 *
 * word-tower (admin-only) and shiritori (coming-soon) are gated at game START
 * but their RESULT recording was previously ungated, letting them write
 * profiles.total_score + XP and pollute the season/global leaderboard.
 *
 * Verifies processGameResults: gated mode → recordGameResult (history) still
 * runs, but updatePlayerStats / updateLeaderboardEntry / updateRankedProgress
 * are skipped. Public mode (classic) still awards normally.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  recordGameResult,
  updatePlayerStats,
  ensureProfileExists,
  updateLeaderboardEntry,
  updateRankedProgress,
  updateGuestStats,
} = vi.hoisted(() => ({
  recordGameResult: vi.fn(async () => ({ data: { game_mode: 'x' }, error: null })),
  updatePlayerStats: vi.fn(async () => ({ data: {}, error: null, xpInfo: { xpEarned: 10 }, updatedStats: {} })),
  ensureProfileExists: vi.fn(async () => true),
  updateLeaderboardEntry: vi.fn(async () => ({ data: {}, error: null })),
  updateRankedProgress: vi.fn(async () => ({ data: {}, error: null })),
  updateGuestStats: vi.fn(async () => ({ data: {}, error: null })),
}));

vi.mock('../gameResults', () => ({ recordGameResult }));
vi.mock('../playerStats', () => ({ updatePlayerStats, ensureProfileExists }));
vi.mock('../leaderboard', () => ({ updateLeaderboardEntry, updateRankedProgress }));
vi.mock('../guestTokens', () => ({ updateGuestStats }));
vi.mock('../../gameSessionLogger', () => ({ logGameSession: vi.fn(async () => 'sess-1') }));
vi.mock('../../achievementManager', () => ({ checkLifetimeAchievements: vi.fn(() => []) }));
vi.mock('../../../redisClient', () => ({ invalidateUserLeaderboardCaches: vi.fn(async () => {}) }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>();
  return { ...actual, isSupabaseConfigured: () => true, getSupabase: () => ({}) };
});

import { processGameResults } from '../gameProcessing';

const authMap = { Alice: { authUserId: 'user-alice', socketId: 'sock-1' } };
const scores = [{ username: 'Alice', score: 200, wordCount: 10, placement: 1, achievements: [] }];

describe('processGameResults — feature-gated mode award gating', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips leaderboard/XP writes for word-tower but still records history', async () => {
    await processGameResults('GAME1', scores as never, { gameMode: 'word-tower', language: 'en' } as never, authMap as never);

    expect(recordGameResult).toHaveBeenCalledTimes(1); // history preserved
    expect(updatePlayerStats).not.toHaveBeenCalled();   // no total_score / XP
    expect(updateLeaderboardEntry).not.toHaveBeenCalled();
    expect(updateRankedProgress).not.toHaveBeenCalled();
  });

  it('skips leaderboard/XP writes for shiritori', async () => {
    await processGameResults('GAME2', scores as never, { gameMode: 'shiritori', language: 'en' } as never, authMap as never);

    expect(updatePlayerStats).not.toHaveBeenCalled();
    expect(updateLeaderboardEntry).not.toHaveBeenCalled();
  });

  it('awards normally for a public mode (classic)', async () => {
    await processGameResults('GAME3', scores as never, { gameMode: 'classic', language: 'en' } as never, authMap as never);

    expect(recordGameResult).toHaveBeenCalledTimes(1);
    expect(updatePlayerStats).toHaveBeenCalledTimes(1);
    expect(updateLeaderboardEntry).toHaveBeenCalledTimes(1);
  });
});
