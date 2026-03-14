/**
 * Tests for lifetime achievement persistence
 * Verifies that lifetime achievements are saved to achievement_counts in DB
 * and that already-earned achievements are not re-awarded
 */

// Tests use processGameResults via require() after mocks are set up

// Mock dependencies
jest.mock('../playerStats', () => ({
  updatePlayerStats: jest.fn(),
  ensureProfileExists: jest.fn().mockResolvedValue(true),
}));

jest.mock('../gameResults', () => ({
  recordGameResult: jest.fn().mockResolvedValue({ data: {}, error: null }),
}));

jest.mock('../leaderboard', () => ({
  updateLeaderboardEntry: jest.fn().mockResolvedValue({ data: {}, error: null }),
  updateRankedProgress: jest.fn().mockResolvedValue({ data: {}, error: null }),
}));

jest.mock('../guestTokens', () => ({
  updateGuestStats: jest.fn(),
}));

jest.mock('../../achievementManager', () => ({
  checkLifetimeAchievements: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../client', () => ({
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
  getSupabase: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

// Mock game session logger
jest.mock('../../gameSessionLogger', () => ({
  logGameSession: jest.fn().mockResolvedValue(null),
}));

// Mock Redis cache invalidation
jest.mock('../../../redisClient', () => ({
  invalidateUserLeaderboardCaches: jest.fn().mockResolvedValue(undefined),
}));

const { updatePlayerStats } = require('../playerStats') as { updatePlayerStats: jest.Mock };
const { checkLifetimeAchievements } = require('../../achievementManager') as { checkLifetimeAchievements: jest.Mock };
const { getSupabase } = require('../client') as { getSupabase: jest.Mock };

describe('Lifetime Achievement Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save lifetime achievements to achievement_counts when newly earned', async () => {
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

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
    });
    const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });
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

  it('should not re-award lifetime achievements already in profile achievement_counts', async () => {
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
