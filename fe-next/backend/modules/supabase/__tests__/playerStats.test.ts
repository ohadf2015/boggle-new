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
  // Real behavior: a multiplayer game needs >= 2 real players to earn XP.
  hasRealOpponent: (n: number | null | undefined) => (n ?? 0) >= 2,
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

    test('should mark practice_graduated_at when crossing 20 total words for the first time', async () => {
      // GIVEN: Player has 10 total words, not yet graduated
      const playerId = 'grad-user-1';
      const currentProfile = {
        id: playerId,
        username: 'GradPlayer',
        total_xp: 100,
        current_level: 2,
        total_games: 2,
        total_score: 500,
        total_words: 10,
        ranked_games: 0,
        casual_games: 2,
        ranked_wins: 0,
        casual_wins: 0,
        achievement_counts: {},
        practice_graduated_at: null,
      };

      mockClient.single.mockResolvedValueOnce({ data: currentProfile, error: null });

      // WHEN: This game adds 15 words, pushing total to 25
      const gameStats: GameStats = {
        score: 500,
        wordCount: 15,
        placement: 2,
        totalPlayers: 4,
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: RPC must be called with updates containing practice_graduated_at
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'update_player_stats_and_xp',
        expect.objectContaining({
          p_stats: expect.objectContaining({
            practice_graduated_at: expect.any(String),
          }),
        })
      );
    });

    test('should NOT re-mark practice_graduated_at if already graduated', async () => {
      // GIVEN: Player is already graduated
      const playerId = 'grad-user-2';
      const currentProfile = {
        id: playerId,
        username: 'Veteran',
        total_xp: 5000,
        current_level: 15,
        total_games: 50,
        total_score: 50000,
        total_words: 500,
        ranked_games: 25,
        casual_games: 25,
        ranked_wins: 10,
        casual_wins: 10,
        achievement_counts: {},
        practice_graduated_at: '2026-01-01T00:00:00.000Z',
      };

      mockClient.single.mockResolvedValueOnce({ data: currentProfile, error: null });

      const gameStats: GameStats = {
        score: 1000,
        wordCount: 20,
        placement: 1,
        totalPlayers: 4,
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: p_stats should NOT contain practice_graduated_at
      const rpcCall = mockClient.rpc.mock.calls[0];
      expect(rpcCall[0]).toBe('update_player_stats_and_xp');
      expect(rpcCall[1].p_stats.practice_graduated_at).toBeUndefined();
    });

    test('should NOT graduate when staying under 20 total words', async () => {
      // GIVEN: Player has 5 total words
      const playerId = 'grad-user-3';
      const currentProfile = {
        id: playerId,
        username: 'Newbie',
        total_xp: 50,
        current_level: 1,
        total_games: 1,
        total_score: 100,
        total_words: 5,
        ranked_games: 0,
        casual_games: 1,
        ranked_wins: 0,
        casual_wins: 0,
        achievement_counts: {},
        practice_graduated_at: null,
      };

      mockClient.single.mockResolvedValueOnce({ data: currentProfile, error: null });

      // WHEN: Adds 10 words → total 15 (still under 20)
      const gameStats: GameStats = {
        score: 200,
        wordCount: 10,
        placement: 3,
        totalPlayers: 4,
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: No graduation timestamp
      const rpcCall = mockClient.rpc.mock.calls[0];
      expect(rpcCall[1].p_stats.practice_graduated_at).toBeUndefined();
    });

    test('should graduate at exactly 20 total words', async () => {
      // GIVEN: Player has 15 total words
      const playerId = 'grad-user-4';
      const currentProfile = {
        id: playerId,
        username: 'EdgeCase',
        total_xp: 80,
        current_level: 1,
        total_games: 1,
        total_score: 150,
        total_words: 15,
        ranked_games: 0,
        casual_games: 1,
        ranked_wins: 0,
        casual_wins: 0,
        achievement_counts: {},
        practice_graduated_at: null,
      };

      mockClient.single.mockResolvedValueOnce({ data: currentProfile, error: null });

      // WHEN: Adds exactly 5 words → total 20
      const gameStats: GameStats = {
        score: 250,
        wordCount: 5,
        placement: 2,
        totalPlayers: 4,
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: Graduates
      const rpcCall = mockClient.rpc.mock.calls[0];
      expect(rpcCall[1].p_stats.practice_graduated_at).toEqual(expect.any(String));
    });

    test('should award NO XP when there was no real opponent (only bots)', async () => {
      // GIVEN: Player exists. This path is multiplayer-only and totalPlayers is
      // the real (non-bot) player count, so totalPlayers=1 means the human played
      // only against bots.
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

      // WHEN: Player places 1st but only bots were present (totalPlayers = 1)
      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
        placement: 1,
        totalPlayers: 1, // lone human, rest were bots
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: XP is not even computed, and the stats RPC is told to grant 0 XP.
      expect(calculateGameXp).not.toHaveBeenCalled();
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'update_player_stats_and_xp',
        expect.objectContaining({ p_xp_amount: 0 })
      );
    });

    test('should award XP when at least one real opponent was present', async () => {
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

      // WHEN: Two real players (totalPlayers = 2), this player wins
      const gameStats: GameStats = {
        score: 1000,
        wordCount: 15,
        placement: 1,
        totalPlayers: 2,
      };

      await updatePlayerStats(playerId, gameStats);

      // THEN: XP is computed (real opponent present) and the win counts.
      expect(calculateGameXp).toHaveBeenCalledWith({
        score: 1000,
        isWinner: true,
        achievementCount: 0,
        playerCount: 2,
      });
      expect(mockClient.rpc).toHaveBeenCalledWith(
        'update_player_stats_and_xp',
        expect.objectContaining({ p_xp_amount: 100 })
      );
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

  test('should use UUID-derived username slug (not display name)', async () => {
    // GIVEN: Profile doesn't exist, OAuth user has a name
    const playerId = 'abc12345-def6-7890-abcd-ef1234567890';
    mockClient.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    });

    // Insert succeeds
    mockClient.insert.mockReturnValueOnce({
      data: null,
      error: null,
    });

    // WHEN: Ensure profile exists
    const result = await ensureProfileExists(playerId);

    // THEN: Username should be a UUID-derived slug, not a display name
    expect(result).toBe(true);
    expect(mockClient.insert).toHaveBeenCalledTimes(1);
    const insertedData = mockClient.insert.mock.calls[0][0];
    expect(insertedData.username).toMatch(/^user_[a-f0-9]{12}$/);
    expect(insertedData.username).not.toBe(insertedData.display_name);
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
