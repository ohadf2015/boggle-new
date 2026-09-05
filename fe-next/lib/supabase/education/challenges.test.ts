import { vi, type Mock, } from 'vitest';
/**
 * Tests for challenges module (daily challenges + weekly quests)
 * TDD: RED phase - these tests MUST fail before implementation
 */

import { supabase as _supabase } from '@/lib/supabase';

const supabase = _supabase!;
import {
  getDailyChallenges,
  getWeeklyQuests,
  assignDailyChallenges,
  assignWeeklyQuests,
  claimChallengeReward,
  claimQuestReward,
  getCurrentWeekStart,
  updateEducationChallengeProgress,
} from './challenges';

// Helper: builds a mock select chain shaped like .select().eq().eq().eq() resolving to `rows`
function buildSelectChain(rows: unknown[]) {
  const eq3 = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  return vi.fn().mockReturnValue({ eq: eq1 });
}

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// `challenges.ts` writes through `getWriteClient()` and `challengeProgress.ts`
// reads AND writes through the service-role client, because daily_challenges /
// weekly_quests grant writes only TO service_role. Point the admin client at the
// same `from` mock so one set of chains drives both.
vi.mock('@/utils/supabase/admin', async () => {
  const { supabase } = await import('@/lib/supabase');
  return { createAdminClient: () => supabase };
});

describe('challenges module', () => {
  const mockPlayerId = 'test-player-123';
  const mockDate = '2026-02-14';
  const mockWeekStart = '2026-02-10'; // Monday

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // getDailyChallenges
  // ==========================================
  describe('getDailyChallenges', () => {
    it('should return today\'s challenges for a player', async () => {
      const mockChallenges = [
        {
          id: 'challenge-1',
          player_id: mockPlayerId,
          challenge_date: mockDate,
          challenge_type: 'practice_sessions',
          challenge_tier: 'easy',
          title: 'challenges.daily.practiceSessions',
          description: 'challenges.daily.practiceSessionsDesc',
          target_value: 3,
          current_value: 1,
          xp_reward: 50,
          bonus_reward: { coins: 10 },
          completed: false,
          claimed: false,
          created_at: '2026-02-14T00:00:00Z',
        },
      ];

      const mockEq2 = vi.fn().mockResolvedValue({ data: mockChallenges, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await getDailyChallenges(mockPlayerId, mockDate);

      expect(result.data).toEqual(mockChallenges);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('daily_challenges');
    });

    it.skip('should handle Supabase not configured', async () => {
      // Skip: Cannot easily mock supabase as null with current setup
      // This case is tested through integration tests
    });
  });

  // ==========================================
  // getWeeklyQuests
  // ==========================================
  describe('getWeeklyQuests', () => {
    it('should return current week\'s quests for a player', async () => {
      const mockQuests = [
        {
          id: 'quest-1',
          player_id: mockPlayerId,
          week_start: mockWeekStart,
          quest_type: 'weekly_mastery',
          title: 'challenges.weekly.masterWords',
          description: 'challenges.weekly.masterWordsDesc',
          requirements: { words_mastered: 15 },
          current_progress: { words_mastered: 5 },
          xp_reward: 300,
          bonus_rewards: { coins: 100 },
          completed: false,
          claimed: false,
          created_at: '2026-02-10T00:00:00Z',
        },
      ];

      const mockEq2 = vi.fn().mockResolvedValue({ data: mockQuests, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await getWeeklyQuests(mockPlayerId, mockWeekStart);

      expect(result.data).toEqual(mockQuests);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('weekly_quests');
    });
  });

  // ==========================================
  // assignDailyChallenges
  // ==========================================
  describe('assignDailyChallenges', () => {
    it('should create 3 challenges (easy, medium, hard)', async () => {
      const mockCreatedChallenges = [
        { id: 'c1', challenge_tier: 'easy', xp_reward: 50, bonus_reward: { coins: 10 } },
        { id: 'c2', challenge_tier: 'medium', xp_reward: 100, bonus_reward: { coins: 25 } },
        { id: 'c3', challenge_tier: 'hard', xp_reward: 200, bonus_reward: { coins: 50 } },
      ];

      // Mock check for existing challenges (none found)
      const mockCheckEq2 = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockCheckEq1 = vi.fn().mockReturnValue({ eq: mockCheckEq2 });
      const mockCheckSelect = vi.fn().mockReturnValue({ eq: mockCheckEq1 });

      // Mock getStudentLevel query
      const mockLevelMaybeSingle = vi.fn().mockResolvedValue({ data: { current_level: 1 }, error: null });
      const mockLevelLimit = vi.fn().mockReturnValue({ maybeSingle: mockLevelMaybeSingle });
      const mockLevelOrder = vi.fn().mockReturnValue({ limit: mockLevelLimit });
      const mockLevelEq2 = vi.fn().mockReturnValue({ order: mockLevelOrder });
      const mockLevelEq1 = vi.fn().mockReturnValue({ eq: mockLevelEq2 });
      const mockLevelSelect = vi.fn().mockReturnValue({ eq: mockLevelEq1 });

      // Mock insert chain
      const mockInsertSelect = vi.fn().mockResolvedValue({ data: mockCreatedChallenges, error: null });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: mockCheckSelect }) // First call: check existing
        .mockReturnValueOnce({ select: mockLevelSelect }) // Second call: getStudentLevel
        .mockReturnValueOnce({ insert: mockInsert }); // Third call: insert

      const result = await assignDailyChallenges(mockPlayerId);

      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].challenge_tier).toBe('easy');
      expect(result.data?.[1].challenge_tier).toBe('medium');
      expect(result.data?.[2].challenge_tier).toBe('hard');
    });

    it('should not create duplicates if challenges already exist today', async () => {
      const mockExisting = [
        { id: 'existing-1', challenge_tier: 'easy' },
        { id: 'existing-2', challenge_tier: 'medium' },
        { id: 'existing-3', challenge_tier: 'hard' },
      ];

      const mockEq2 = vi.fn().mockResolvedValue({ data: mockExisting, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as Mock).mockReturnValue({ select: mockSelect });

      const result = await assignDailyChallenges(mockPlayerId);

      expect(result.data).toEqual(mockExisting);
      // Should NOT call insert
    });
  });

  // ==========================================
  // claimChallengeReward
  // ==========================================
  describe('claimChallengeReward', () => {
    it('should mark challenge as claimed and return reward', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        player_id: mockPlayerId,
        completed: true,
        claimed: false,
        xp_reward: 50,
        bonus_reward: { coins: 10 },
      };

      // Mock fetch challenge
      const mockSelectQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockChallenge, error: null }),
      };

      // Mock update
      const mockUpdateQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockChallenge, claimed: true, claimed_at: '2026-02-14T12:00:00Z' },
          error: null
        }),
      };

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockSelectQuery) })
        .mockReturnValueOnce({ update: vi.fn().mockReturnValue(mockUpdateQuery) });

      const result = await claimChallengeReward('challenge-1', mockPlayerId);

      expect(result.data).toEqual({ xpReward: 50, bonusReward: { coins: 10 } });
      expect(result.error).toBeNull();
    });

    it('should fail if challenge not completed', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        player_id: mockPlayerId,
        completed: false,
        claimed: false,
      };

      const mockSelectQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockChallenge, error: null }),
      };

      (supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectQuery)
      });

      const result = await claimChallengeReward('challenge-1', mockPlayerId);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Challenge not completed');
    });

    it('should fail if already claimed', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        player_id: mockPlayerId,
        completed: true,
        claimed: true,
      };

      const mockSelectQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockChallenge, error: null }),
      };

      (supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectQuery)
      });

      const result = await claimChallengeReward('challenge-1', mockPlayerId);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Challenge already claimed');
    });

    it('should fail if player_id does not match', async () => {
      const mockChallenge = {
        id: 'challenge-1',
        player_id: 'different-player',
        completed: true,
        claimed: false,
      };

      const mockSelectQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockChallenge, error: null }),
      };

      (supabase.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelectQuery)
      });

      const result = await claimChallengeReward('challenge-1', mockPlayerId);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Player ID mismatch');
    });
  });

  // ==========================================
  // claimQuestReward
  // ==========================================
  describe('claimQuestReward', () => {
    it('should mark quest as claimed and return reward', async () => {
      const mockQuest = {
        id: 'quest-1',
        player_id: mockPlayerId,
        completed: true,
        claimed: false,
        xp_reward: 300,
        bonus_rewards: { coins: 100 },
      };

      const mockSelectQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockQuest, error: null }),
      };

      const mockUpdateQuery = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockQuest, claimed: true },
          error: null
        }),
      };

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockSelectQuery) })
        .mockReturnValueOnce({ update: vi.fn().mockReturnValue(mockUpdateQuery) });

      const result = await claimQuestReward('quest-1', mockPlayerId);

      expect(result.data).toEqual({ xpReward: 300, bonusReward: { coins: 100 } });
      expect(result.error).toBeNull();
    });
  });

  // ==========================================
  // updateEducationChallengeProgress
  // ==========================================
  describe('updateEducationChallengeProgress', () => {
    const today = new Date().toISOString().split('T')[0];

    it('increments current_value for matching challenge type', async () => {
      // GIVEN: one incomplete practice_sessions challenge
      const mockChallenges = [
        {
          id: 'ch-1',
          player_id: mockPlayerId,
          challenge_date: today,
          challenge_type: 'practice_sessions',
          target_value: 3,
          current_value: 1,
          completed: false,
          claimed: false,
        },
      ];

      // Mock select (fetch today's incomplete challenges)
      const mockEqDate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockChallenges, error: null }) });
      const mockEqPlayer = vi.fn().mockReturnValue({ eq: mockEqDate });
      const mockSelectChain = vi.fn().mockReturnValue({ eq: mockEqPlayer });

      // Mock the batched upsert for increments (one call for all matching rows)
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

      // Weekly path: empty fetch — practice_session has no matching weekly quest_type
      const weeklyEmpty = buildSelectChain([]);

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: mockSelectChain })
        .mockReturnValueOnce({ upsert: mockUpsert })
        .mockReturnValueOnce({ select: weeklyEmpty });

      // WHEN
      const result = await updateEducationChallengeProgress(mockPlayerId, 'practice_session', 1);

      // THEN
      expect(result.updated).toBe(1);
      expect(supabase.from).toHaveBeenCalledWith('daily_challenges');
    });

    it('marks challenge as completed when current_value reaches target', async () => {
      // GIVEN: challenge one away from completion
      const mockChallenges = [
        {
          id: 'ch-1',
          player_id: mockPlayerId,
          challenge_date: today,
          challenge_type: 'words_mastered',
          target_value: 5,
          current_value: 4,
          completed: false,
          claimed: false,
        },
      ];

      const mockEqDate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockChallenges, error: null }) });
      const mockEqPlayer = vi.fn().mockReturnValue({ eq: mockEqDate });
      const mockSelectChain = vi.fn().mockReturnValue({ eq: mockEqPlayer });

      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

      // Weekly path: empty fetch
      const weeklySelect = buildSelectChain([]);

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: mockSelectChain })
        .mockReturnValueOnce({ upsert: mockUpsert })
        .mockReturnValueOnce({ select: weeklySelect });

      // WHEN
      const result = await updateEducationChallengeProgress(mockPlayerId, 'word_mastered', 1);

      // THEN
      expect(result.updated).toBe(1);
      // Verify the batched row carries completed = true and completed_at
      expect(mockUpsert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 'ch-1',
            current_value: 5,
            completed: true,
            completed_at: expect.any(String),
          }),
        ],
        { onConflict: 'id' }
      );
    });

    it('ignores challenges with non-matching challenge_type', async () => {
      // GIVEN: practice_sessions challenge but eventType is duel_played
      const mockChallenges = [
        {
          id: 'ch-1',
          player_id: mockPlayerId,
          challenge_date: today,
          challenge_type: 'practice_sessions',
          target_value: 3,
          current_value: 0,
          completed: false,
          claimed: false,
        },
      ];

      const mockEqDate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockChallenges, error: null }) });
      const mockEqPlayer = vi.fn().mockReturnValue({ eq: mockEqDate });
      const mockSelectChain = vi.fn().mockReturnValue({ eq: mockEqPlayer });

      // Both daily and weekly fetches return the same (non-matching) row;
      // the function filters by challenge_type/quest_type so neither updates.
      (supabase.from as Mock).mockReturnValue({ select: mockSelectChain });

      // WHEN: fire duel_played event
      const result = await updateEducationChallengeProgress(mockPlayerId, 'duel_played', 1);

      // THEN: no challenges updated for non-matching type
      expect(result.updated).toBe(0);
    });

    it('returns 0 when player has no challenges today', async () => {
      // GIVEN: empty challenges
      const mockEqDate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) });
      const mockEqPlayer = vi.fn().mockReturnValue({ eq: mockEqDate });
      const mockSelectChain = vi.fn().mockReturnValue({ eq: mockEqPlayer });

      (supabase.from as Mock).mockReturnValue({ select: mockSelectChain });

      // WHEN
      const result = await updateEducationChallengeProgress(mockPlayerId, 'xp_earned', 50);

      // THEN
      expect(result.updated).toBe(0);
    });

    // ----- Weekly quest progress -----

    it('increments weekly quest current_progress when event matches quest_type', async () => {
      // GIVEN: no daily challenges + one incomplete weekly quest of matching type
      const dailySelect = buildSelectChain([]);

      const weeklyQuests = [
        {
          id: 'wq-1',
          player_id: mockPlayerId,
          week_start: '2026-04-06',
          quest_type: 'words_mastered',
          requirements: { words_mastered: 20 },
          current_progress: { words_mastered: 5 },
          completed: false,
          claimed: false,
        },
      ];
      const weeklySelect = buildSelectChain(weeklyQuests);

      // Batched upsert for weekly increments
      const weeklyUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: dailySelect }) // daily fetch
        .mockReturnValueOnce({ select: weeklySelect }) // weekly fetch
        .mockReturnValueOnce({ upsert: weeklyUpsert }); // weekly batched write

      // WHEN
      const result = await updateEducationChallengeProgress(mockPlayerId, 'word_mastered', 1);

      // THEN: counted as updated, weekly_quests was the target table for the update
      expect(result.updated).toBe(1);
      expect(supabase.from).toHaveBeenCalledWith('weekly_quests');
      expect(weeklyUpsert).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'wq-1', current_progress: { words_mastered: 6 } })],
        { onConflict: 'id' }
      );
    });

    it('marks weekly quest completed when target reached', async () => {
      const dailySelect = buildSelectChain([]);

      const weeklyQuests = [
        {
          id: 'wq-2',
          player_id: mockPlayerId,
          week_start: '2026-04-06',
          quest_type: 'words_mastered',
          requirements: { words_mastered: 20 },
          current_progress: { words_mastered: 19 },
          completed: false,
          claimed: false,
        },
      ];
      const weeklySelect = buildSelectChain(weeklyQuests);

      const weeklyUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: dailySelect })
        .mockReturnValueOnce({ select: weeklySelect })
        .mockReturnValueOnce({ upsert: weeklyUpsert });

      const result = await updateEducationChallengeProgress(mockPlayerId, 'word_mastered', 1);

      expect(result.updated).toBe(1);
      expect(weeklyUpsert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 'wq-2',
            current_progress: { words_mastered: 20 },
            completed: true,
            completed_at: expect.any(String),
          }),
        ],
        { onConflict: 'id' }
      );
    });
  });

  // ==========================================
  // assignWeeklyQuests
  // ==========================================
  describe('assignWeeklyQuests', () => {
    it('writes requirements + current_progress keyed by quest_type (canonical shape)', async () => {
      // GIVEN: no existing weekly quest
      const checkEq2 = vi.fn().mockResolvedValue({ data: [], error: null });
      const checkEq1 = vi.fn().mockReturnValue({ eq: checkEq2 });
      const checkSelect = vi.fn().mockReturnValue({ eq: checkEq1 });

      // Insert chain captures payload
      const insertSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'new-wq', quest_type: 'words_mastered' }],
        error: null,
      });
      const insertFn = vi.fn().mockReturnValue({ select: insertSelect });

      (supabase.from as Mock)
        .mockReturnValueOnce({ select: checkSelect })
        .mockReturnValueOnce({ insert: insertFn });

      // WHEN
      const result = await assignWeeklyQuests(mockPlayerId);

      // THEN: insert payload uses canonical { [quest_type]: target } shape — NOT { target } / { count }
      expect(result.error).toBeNull();
      expect(insertFn).toHaveBeenCalledWith([
        expect.objectContaining({
          quest_type: 'words_mastered',
          requirements: { words_mastered: 20 },
          current_progress: { words_mastered: 0 },
        }),
      ]);
    });
  });

  // ==========================================
  // getCurrentWeekStart helper
  // ==========================================
  describe('getCurrentWeekStart', () => {
    it('should return Monday of current week', () => {
      // Mock Date to Feb 14, 2026 (Saturday)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));

      const result = getCurrentWeekStart();

      // Should return Monday Feb 9, 2026
      expect(result).toBe('2026-02-09');

      vi.useRealTimers();
    });
  });
});
