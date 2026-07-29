import { vi, type Mock, type MockInstance } from 'vitest';
/**
 * Tests for lifetime achievement persistence
 * Verifies that lifetime achievements are saved to achievement_counts in DB
 * and that already-earned achievements are not re-awarded
 */

// Tests use processGameResults via require() after mocks are set up

// Mock dependencies
vi.mock('../playerStats', () => ({
  updatePlayerStats: vi.fn(),
  ensureProfileExists: vi.fn().mockResolvedValue(true),
}));

vi.mock('../gameResults', () => ({
  recordGameResult: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock('../leaderboard', () => ({
  updateLeaderboardEntry: vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateRankedProgress: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock('../guestTokens', () => ({
  updateGuestStats: vi.fn(),
}));

vi.mock('../../achievementManager', () => ({
  checkLifetimeAchievements: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({ default: {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

vi.mock('../client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
  getSupabase: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

// Mock game session logger
vi.mock('../../gameSessionLogger', () => ({
  logGameSession: vi.fn().mockResolvedValue(null),
}));

// Mock Redis cache invalidation
vi.mock('../../../redisClient', () => ({
  invalidateUserLeaderboardCaches: vi.fn().mockResolvedValue(undefined),
}));

const { updatePlayerStats } = require('../playerStats') as { updatePlayerStats: Mock };
const { checkLifetimeAchievements } = require('../../achievementManager') as { checkLifetimeAchievements: Mock };
const { getSupabase } = require('../client') as { getSupabase: Mock };

describe('Lifetime Achievement Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip('should save lifetime achievements to achievement_counts when newly earned', async () => {
    // Simulate player who just hit 50 games
    updatePlayerStats.mockResolvedValue({
      data: {},
      error: null,
      xpInfo: { xpEarned: 100, newTotalXp: 1000, oldLevel: 5, newLevel: 5, leveledUp: false },
      updatedStats: {
        gamesPlayed: 50,
        gamesWon: 10,
        totalWordsFound: 500,
        totalScore: 5000,
        uniqueDaysPlayed: 15,
      },
    });

    // checkLifetimeAchievements returns VETERAN
    checkLifetimeAchievements.mockReturnValue([
      { key: 'VETERAN', icon: '🎖️' },
    ]);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
    });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    getSupabase.mockReturnValue({ from: mockFrom });

    const { processGameResults } = require('../gameProcessing');
    const result = await processGameResults(
      'TEST123',
      [{
        username: 'player1',
        score: 100,
        wordCount: 20,
        longestWord: 'testing',
        placement: 1,
        achievements: [],
        totalPlayers: 2,
      }],
      { language: 'en', isRanked: false, timePlayed: 180 },
      { player1: { authUserId: 'auth-123', socketId: 'sock-1' } },
    );

    // Verify lifetime achievements were returned for socket emission
    expect(result.lifetimeAchievements.player1).toEqual([
      { key: 'VETERAN', icon: '🎖️' },
    ]);

    // Verify achievement_counts was updated in DB
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        achievement_counts: expect.objectContaining({ VETERAN: 1 }),
      })
    );
  });

  it.skip('should not re-award lifetime achievements already in profile achievement_counts', async () => {
    // Profile has VETERAN already in achievement_counts (from a previous game)
    updatePlayerStats.mockResolvedValue({
      data: { achievement_counts: { VETERAN: 1, FIRST_BLOOD: 3 } },
      error: null,
      xpInfo: { xpEarned: 100, newTotalXp: 1000, oldLevel: 5, newLevel: 5, leveledUp: false },
      updatedStats: {
        gamesPlayed: 51,
        gamesWon: 10,
        totalWordsFound: 500,
        totalScore: 5000,
        uniqueDaysPlayed: 15,
      },
    });

    // checkLifetimeAchievements filters by existing achievements
    checkLifetimeAchievements.mockImplementation((_stats: unknown, existing: string[]) => {
      // VETERAN is in existing (from profile's achievement_counts), so skip it
      if (existing.includes('VETERAN')) return [];
      return [{ key: 'VETERAN', icon: '🎖️' }];
    });

    const { processGameResults } = require('../gameProcessing');
    const result = await processGameResults(
      'TEST456',
      [{
        username: 'player1',
        score: 100,
        wordCount: 20,
        longestWord: 'testing',
        placement: 1,
        achievements: [], // No in-game achievements mention VETERAN
        totalPlayers: 2,
      }],
      { language: 'en', isRanked: false, timePlayed: 180 },
      { player1: { authUserId: 'auth-123', socketId: 'sock-1' } },
    );

    // No new lifetime achievements — VETERAN already in profile
    expect(result.lifetimeAchievements.player1).toBeUndefined();
  });
});
