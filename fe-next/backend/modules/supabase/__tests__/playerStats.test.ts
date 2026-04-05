/**
 * Tests for Player Stats Module
 * Validates XP calculation and profile updates
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { updatePlayerStats, ensureProfileExists } from '../playerStats';
// Mock dependencies
vi.mock('../client', () => ({
  getSupabase: vi.fn(),
}));

vi.mock('../../xpManager', () => ({
  calculateGameXp: vi.fn(),
  getLevelFromXp: vi.fn(),
  checkLevelUp: vi.fn(),
  getTitleForLevel: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
} }));

import { getSupabase, type GameStats } from '../client';
import { calculateGameXp, getLevelFromXp, checkLevelUp } from '../../xpManager';
import logger from '../../../utils/logger';
describe('updatePlayerStats', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    calculateGameXp.mockReturnValue({
      totalXp: 100,
      breakdown: {
        gameCompletion: 50,
        scoreXp: 30,
        winBonus: 20,
        achievementXp: 0,
      },
    });

    getLevelFromXp.mockImplementation((xp: number) => Math.floor(xp / 100) + 1);
    checkLevelUp.mockReturnValue({ leveledUp: false, levelsGained: 0, newTitles: [] });

    // Setup mock Supabase client
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: [{ new_total_xp: 600, new_level: 7, xp_granted: 100 }], error: null }),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      },
    };

    getSupabase.mockReturnValue(mockClient);
  });

  describe('CRITICAL BUG: Phantom XP on Database Failure', () => {
    test('should NOT return xpInfo when database update fails', async () => {
      // GIVEN: Player exists with current XP
      const playerId = 'user-123';
      const currentProfile = {
        id: playerId,
        username: 'TestPlayer',
        total_games: 10,
        total_score: 5000,
        total_words: 100,
        total_xp: 500,
        current_level: 5,
        ranked_games: 5,
        casual_games: 5,
        ranked_wins: 2,
        casual_wins: 3,
        achievement_counts: {},
      };

      // Mock successful profile fetch
      mockClient.single.mockResolvedValueOnce({
        data: currentProfile,
        error: null,
      });

      // WHEN: Atomic stats+XP RPC FAILS (simulating RLS policy violation, connection error, etc.)
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to update profile' }, // Database error
      });

      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
        placement: 1,
        isRanked: true,
        totalPlayers: 4,
      };

      const result = await updatePlayerStats(playerId, gameStats);

      // THEN: Should return error WITHOUT xpInfo or updatedStats
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Failed to update profile');

      // CRITICAL: These should NOT exist when there's an error
      expect(result.xpInfo).toBeUndefined();
      expect(result.updatedStats).toBeUndefined();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        'SUPABASE',
        `Failed to update profile stats for ${playerId}`,
        'Failed to update profile'
      );
    });

    test('should return xpInfo when database update succeeds', async () => {
      // GIVEN: Player exists
      const playerId = 'user-123';
      const currentProfile = {
        id: playerId,
        username: 'TestPlayer',
        total_games: 10,
        total_score: 5000,
        total_words: 100,
        total_xp: 500,
        current_level: 5,
        ranked_games: 5,
        casual_games: 5,
        ranked_wins: 2,
        casual_wins: 3,
        achievement_counts: {},
      };

      // Mock successful profile fetch
      mockClient.single.mockResolvedValueOnce({
        data: currentProfile,
        error: null,
      });

      // WHEN: Database update SUCCEEDS
      const updatedProfile = {
        ...currentProfile,
        total_games: 11,
        total_score: 6000,
        total_xp: 600,
      };

      mockClient.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null, // Success
      });

      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
        placement: 1,
        isRanked: true,
        totalPlayers: 4,
      };

      const result = await updatePlayerStats(playerId, gameStats);

      // THEN: Should return xpInfo and updatedStats WITHOUT error
      expect(result.error).toBeNull();
      expect(result.xpInfo).toBeDefined();
      expect(result.xpInfo?.xpEarned).toBe(100);
      expect(result.xpInfo?.newTotalXp).toBe(600);
      expect(result.updatedStats).toBeDefined();
    });
  });

  describe('Profile creation for new users', () => {
    test('should create minimal profile when user not found', async () => {
      // GIVEN: User doesn't exist (PGRST116 error)
      const playerId = 'new-user-123';

      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Mock profile creation
      const newProfile = {
        id: playerId,
        username: 'NewPlayer',
        total_games: 0,
        total_score: 0,
        total_xp: 0,
        current_level: 1,
      };

      mockClient.single.mockResolvedValueOnce({
        data: newProfile,
        error: null,
      });

      // Mock successful stats update
      mockClient.single.mockResolvedValueOnce({
        data: { ...newProfile, total_games: 1, total_xp: 100 },
        error: null,
      });

      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
      };

      // WHEN: Update stats for new user
      const result = await updatePlayerStats(playerId, gameStats);

      // THEN: Should create profile and update stats
      expect(result.error).toBeNull();
      expect(result.xpInfo).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'SUPABASE',
        expect.stringContaining('Profile not found')
      );
    });
  });

  describe('XP calculation', () => {
    test('should calculate XP correctly for winning player', async () => {
      // GIVEN: Player exists
      const playerId = 'user-123';
      const currentProfile = {
        id: playerId,
        username: 'TestPlayer',
        total_xp: 500,
        current_level: 5,
        total_games: 10,
        total_score: 5000,
        total_words: 100,
        ranked_games: 5,
        casual_games: 5,
        ranked_wins: 2,
        casual_wins: 3,
        achievement_counts: {},
      };

      mockClient.single.mockResolvedValueOnce({
        data: currentProfile,
        error: null,
      });

      mockClient.single.mockResolvedValueOnce({
        data: currentProfile,
        error: null,
      });

      // WHEN: Player wins with achievements
      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
        placement: 1, // Winner
        totalPlayers: 4,
        achievements: ['SPEED_DEMON', 'WORD_MASTER'],
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: Should pass correct parameters to calculateGameXp
      expect(calculateGameXp).toHaveBeenCalledWith({
        score: 1000,
        isWinner: true,
        achievementCount: 2,
        playerCount: 4,
      });
    });

    test('should NOT count solo game as win', async () => {
      // GIVEN: Player exists
      const playerId = 'user-123';
      const currentProfile = {
        id: playerId,
        username: 'TestPlayer',
        total_xp: 500,
        current_level: 5,
        total_games: 10,
        total_score: 5000,
        total_words: 100,
        ranked_games: 5,
        casual_games: 5,
        ranked_wins: 2,
        casual_wins: 3,
        achievement_counts: {},
      };

      mockClient.single.mockResolvedValueOnce({
        data: currentProfile,
        error: null,
      });

      mockClient.single.mockResolvedValueOnce({
        data: currentProfile,
        error: null,
      });

      // WHEN: Player places 1st but in solo game (totalPlayers = 1)
      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
        placement: 1,
        totalPlayers: 1, // Solo game
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: Should NOT count as win
      expect(calculateGameXp).toHaveBeenCalledWith({
        score: 1000,
        isWinner: false, // NOT a winner (solo game)
        achievementCount: 0,
        playerCount: 1,
      });
    });
  });
});

describe('ensureProfileExists', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock Supabase client
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      },
    };

    getSupabase.mockReturnValue(mockClient);
  });

  test('should return true if profile already exists', async () => {
    // GIVEN: Profile exists
    const playerId = 'existing-user-123';
    mockClient.single.mockResolvedValueOnce({
      data: { id: playerId },
      error: null,
    });

    // WHEN: Check if profile exists
    const result = await ensureProfileExists(playerId);

    // THEN: Should return true without creating a new profile
    expect(result).toBe(true);
    expect(mockClient.insert).not.toHaveBeenCalled();
  });

  test('should create profile and return true if profile not found', async () => {
    // GIVEN: Profile doesn't exist (PGRST116 error)
    const playerId = 'new-user-123';
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    });

    // Mock successful profile creation
    mockClient.insert.mockReturnValueOnce({
      data: null,
      error: null,
    });

    // WHEN: Ensure profile exists
    const result = await ensureProfileExists(playerId);

    // THEN: Should create profile and return true
    expect(result).toBe(true);
    expect(mockClient.insert).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'SUPABASE',
      expect.stringContaining('Profile not found')
    );
    expect(logger.info).toHaveBeenCalledWith(
      'SUPABASE',
      expect.stringContaining('Created minimal profile')
    );
  });

  test('should retry with suffix on username collision', async () => {
    // GIVEN: Profile doesn't exist
    const playerId = 'new-user-456';
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    });

    // First insert fails with unique constraint violation on username
    mockClient.insert.mockReturnValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' },
    });

    // Second insert succeeds with suffixed username
    mockClient.insert.mockReturnValueOnce({
      data: null,
      error: null,
    });

    // WHEN: Ensure profile exists
    const result = await ensureProfileExists(playerId);

    // THEN: Should retry and succeed
    expect(result).toBe(true);
    expect(mockClient.insert).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'SUPABASE',
      expect.stringContaining('Username collision')
    );
  });

  test('should return false on database error', async () => {
    // GIVEN: Database error
    const playerId = 'error-user-123';
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'DB_ERROR', message: 'Connection failed' },
    });

    // WHEN: Ensure profile exists
    const result = await ensureProfileExists(playerId);

    // THEN: Should return false
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'SUPABASE',
      expect.stringContaining('Error checking profile'),
      'Connection failed'
    );
  });

  test('should return false if Supabase not configured', async () => {
    // GIVEN: Supabase not configured
    getSupabase.mockReturnValue(null);

    // WHEN: Ensure profile exists
    const result = await ensureProfileExists('any-user-123');

    // THEN: Should return false
    expect(result).toBe(false);
  });
});
