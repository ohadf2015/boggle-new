import { vi, type Mock, } from 'vitest';
/**
 * Tests for classroom leaderboard backend functions
 * Tests getFullClassroomLeaderboard, getLeaderboardWithRankDelta, saveLeaderboardSnapshot, getLeaderboardTier
 */

import { supabase as _supabase } from '@/lib/supabase';

const supabase = _supabase!;
import {
  getFullClassroomLeaderboard,
  getLeaderboardWithRankDelta,
  saveLeaderboardSnapshot,
  getLeaderboardTier,
} from './leaderboard';
import type { LeaderboardEntryWithDelta } from './types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

describe('leaderboard backend', () => {
  const mockClassroomId = 'classroom-123';
  const mockCurrentUserId = 'student-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFullClassroomLeaderboard', () => {
    it('should return all students with all-time scope', async () => {
      const mockMemberships = [
        { student_id: 'student-1' },
        { student_id: 'student-2' },
        { student_id: 'student-3' },
      ];

      const mockProfiles = [
        { id: 'student-1', display_name: 'Alice', avatar_emoji: '😀', avatar_color: '#FF0000' },
        { id: 'student-2', display_name: 'Bob', avatar_emoji: '😎', avatar_color: '#00FF00' },
        { id: 'student-3', display_name: 'Charlie', avatar_emoji: '🤓', avatar_color: '#0000FF' },
      ];

      const mockProgress = [
        { student_id: 'student-1', total_xp: 1000, current_level: 5, current_streak: 3, last_practice_date: '2026-02-13' },
        { student_id: 'student-2', total_xp: 800, current_level: 4, current_streak: 0, last_practice_date: '2026-02-12' },
        { student_id: 'student-3', total_xp: 1200, current_level: 6, current_streak: 5, last_practice_date: '2026-02-13' },
      ];

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            }),
          };
        }
        if (table === 'student_lesson_progress') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockProgress, error: null }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await getFullClassroomLeaderboard(mockClassroomId, mockCurrentUserId, 'all-time');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      expect(result.data[0].userId).toBe('student-3'); // Charlie - highest XP
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].totalXp).toBe(1200);
      expect(result.data[0].currentStreak).toBe(5);
      expect(result.data[1].userId).toBe('student-1'); // Alice
      expect(result.data[1].rank).toBe(2);
      expect(result.data[2].userId).toBe('student-2'); // Bob - lowest XP
      expect(result.data[2].rank).toBe(3);
    });

    it('should filter by last 7 days for weekly scope', async () => {
      const mockMemberships = [{ student_id: 'student-1' }, { student_id: 'student-2' }];
      const mockProfiles = [
        { id: 'student-1', display_name: 'Alice', avatar_emoji: '😀', avatar_color: '#FF0000' },
        { id: 'student-2', display_name: 'Bob', avatar_emoji: '😎', avatar_color: '#00FF00' },
      ];

      const mockProgressWeekly = [
        { student_id: 'student-1', total_xp: 500, current_level: 3, current_streak: 2, last_practice_date: '2026-02-13' },
      ];

      let queryBuilder: any;
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            }),
          };
        }
        if (table === 'student_lesson_progress') {
          queryBuilder = {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue({ data: mockProgressWeekly, error: null }),
          };
          return queryBuilder;
        }
        return { select: vi.fn() };
      });

      const result = await getFullClassroomLeaderboard(mockClassroomId, mockCurrentUserId, 'weekly');

      expect(result.error).toBeNull();
      expect(queryBuilder.gte).toHaveBeenCalledWith('last_practice_date', expect.any(String));
      expect(result.data).toHaveLength(2); // Alice has progress, Bob has 0 XP
    });

    it('should filter by last 30 days for monthly scope', async () => {
      const mockMemberships = [{ student_id: 'student-1' }];
      const mockProfiles = [{ id: 'student-1', display_name: 'Alice', avatar_emoji: '😀', avatar_color: '#FF0000' }];
      const mockProgressMonthly = [
        { student_id: 'student-1', total_xp: 300, current_level: 2, current_streak: 1, last_practice_date: '2026-02-01' },
      ];

      let queryBuilder: any;
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            }),
          };
        }
        if (table === 'student_lesson_progress') {
          queryBuilder = {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue({ data: mockProgressMonthly, error: null }),
          };
          return queryBuilder;
        }
        return { select: vi.fn() };
      });

      const result = await getFullClassroomLeaderboard(mockClassroomId, mockCurrentUserId, 'monthly');

      expect(result.error).toBeNull();
      expect(queryBuilder.gte).toHaveBeenCalledWith('last_practice_date', expect.any(String));
    });
  });

  describe('getLeaderboardWithRankDelta', () => {
    it('should return entries with rank delta when previous snapshot exists', async () => {
      const mockSnapshots = [
        { student_id: 'student-1', rank_position: 2 }, // Alice was rank 2, now rank 1 (moved up +1)
        { student_id: 'student-2', rank_position: 1 }, // Bob was rank 1, now rank 2 (moved down -1)
      ];

      // Mock getFullClassroomLeaderboard with gte chain
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ student_id: 'student-1' }, { student_id: 'student-2' }], error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'student-1', display_name: 'Alice', avatar_emoji: '😀', avatar_color: '#FF0000' },
                  { id: 'student-2', display_name: 'Bob', avatar_emoji: '😎', avatar_color: '#00FF00' },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'student_lesson_progress') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnThis(),
              gte: vi.fn().mockResolvedValue({
                data: [
                  { student_id: 'student-1', total_xp: 1000, current_level: 5, current_streak: 3, last_practice_date: '2026-02-13' },
                  { student_id: 'student-2', total_xp: 800, current_level: 4, current_streak: 0, last_practice_date: '2026-02-13' },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'leaderboard_snapshots') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: mockSnapshots, error: null }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await getLeaderboardWithRankDelta(mockClassroomId, mockCurrentUserId, 'weekly');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);

      // Alice: was 2, now 1 -> delta = 2 - 1 = 1 (moved up)
      expect(result.data[0].userId).toBe('student-1');
      expect(result.data[0].previousRank).toBe(2);
      expect(result.data[0].rankDelta).toBe(1);
      expect(result.data[0].isNew).toBe(false);

      // Bob: was 1, now 2 -> delta = 1 - 2 = -1 (moved down)
      expect(result.data[1].userId).toBe('student-2');
      expect(result.data[1].previousRank).toBe(1);
      expect(result.data[1].rankDelta).toBe(-1);
      expect(result.data[1].isNew).toBe(false);
    });

    it('should mark entries as new when no previous snapshot exists', async () => {
      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'classroom_memberships') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ student_id: 'student-1' }], error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'student-1', display_name: 'Alice', avatar_emoji: '😀', avatar_color: '#FF0000' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'student_lesson_progress') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnThis(),
              gte: vi.fn().mockResolvedValue({
                data: [{ student_id: 'student-1', total_xp: 500, current_level: 3, current_streak: 2, last_practice_date: '2026-02-13' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'leaderboard_snapshots') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }), // No previous snapshot
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await getLeaderboardWithRankDelta(mockClassroomId, mockCurrentUserId, 'weekly');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].isNew).toBe(true);
      expect(result.data[0].previousRank).toBeNull();
      expect(result.data[0].rankDelta).toBeNull();
    });
  });

  describe('saveLeaderboardSnapshot', () => {
    it('should save snapshot with upsert', async () => {
      const mockEntries: LeaderboardEntryWithDelta[] = [
        {
          userId: 'student-1',
          displayName: 'Alice',
          avatarUrl: null,
          totalXp: 1000,
          currentLevel: 5,
          rank: 1,
          isCurrentUser: false,
          isInactive: false,
          currentStreak: 3,
          previousRank: null,
          rankDelta: null,
          isNew: true,
        },
      ];

      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as Mock).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await saveLeaderboardSnapshot(mockClassroomId, 'weekly', mockEntries);

      expect(result.error).toBeNull();
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            classroom_id: mockClassroomId,
            student_id: 'student-1',
            time_scope: 'weekly',
            total_xp: 1000,
            rank_position: 1,
          }),
        ]),
        { onConflict: 'classroom_id,student_id,time_scope,snapshot_date' }
      );
    });
  });

  describe('getLeaderboardTier', () => {
    it('should return top10 for top 10% in large class', () => {
      expect(getLeaderboardTier(1, 100)).toBe('top10');
      expect(getLeaderboardTier(10, 100)).toBe('top10');
      expect(getLeaderboardTier(11, 100)).toBe('top25');
    });

    it('should return top25 for top 25% in large class', () => {
      expect(getLeaderboardTier(15, 100)).toBe('top25');
      expect(getLeaderboardTier(25, 100)).toBe('top25');
      expect(getLeaderboardTier(26, 100)).toBe('top50');
    });

    it('should return top50 for top 50% in large class', () => {
      expect(getLeaderboardTier(30, 100)).toBe('top50');
      expect(getLeaderboardTier(50, 100)).toBe('top50');
      expect(getLeaderboardTier(51, 100)).toBeNull();
    });

    it('should use rank-based tiers for small classes', () => {
      // Small class (< 10 students)
      expect(getLeaderboardTier(1, 5)).toBe('top10'); // Rank 1
      expect(getLeaderboardTier(2, 5)).toBe('top25'); // Rank 2-3
      expect(getLeaderboardTier(3, 5)).toBe('top25');
      expect(getLeaderboardTier(4, 5)).toBe('top50'); // Rank 4-5
      expect(getLeaderboardTier(5, 5)).toBe('top50');
    });

    it('should return null for bottom 50%', () => {
      expect(getLeaderboardTier(60, 100)).toBeNull();
      expect(getLeaderboardTier(100, 100)).toBeNull();
    });
  });
});
