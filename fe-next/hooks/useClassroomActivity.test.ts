import { renderHook, waitFor } from '@testing-library/react';
import { useClassroomActivity } from './useClassroomActivity';
import { createClient } from '@/utils/supabase/client';

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  error: jest.fn(),
}));

describe('useClassroomActivity', () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('returns empty activities when classroomId is null', () => {
    const { result } = renderHook(() => useClassroomActivity(null));

    expect(result.current.activities).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns loading=true initially, then false after fetch', async () => {
    // Mock empty results
    const mockDuelsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const mockAchievementsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
      in: jest.fn().mockReturnThis(),
    };

    const mockClassroomMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'student_duels') return mockDuelsQuery;
      if (table === 'student_achievements') return mockAchievementsQuery;
      if (table === 'classroom_memberships') return mockClassroomMembersQuery;
      return mockDuelsQuery;
    });

    const { result } = renderHook(() => useClassroomActivity('classroom-123'));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('merges duel and achievement data sorted by timestamp DESC', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Mock classroom members
    const mockClassroomMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ student_id: 'student-1' }, { student_id: 'student-2' }],
        error: null,
      }),
    };

    // Mock duels data (completed 1 hour ago)
    // Query chain: select -> eq -> eq -> order -> range
    const mockDuelsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn(function(this: any) {
        return this;
      }),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'duel-1',
            completed_at: oneHourAgo.toISOString(),
            winner_id: 'student-1',
            challenger_id: 'student-1',
            opponent_id: 'student-2',
            challenger: { display_name: 'Alice', avatar_emoji: '🎮' },
            opponent: { display_name: 'Bob', avatar_emoji: '🎯' },
          },
        ],
        error: null,
      }),
    };

    // Mock achievements data (unlocked now and 2 hours ago)
    // Query chain: select -> in -> order -> range
    const mockAchievementsQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'ach-1',
            unlocked_at: now.toISOString(),
            student_id: 'student-2',
            student: { display_name: 'Bob', avatar_emoji: '🎯' },
            achievement: { key: 'word_master', icon: '🎓' },
          },
          {
            id: 'ach-2',
            unlocked_at: twoHoursAgo.toISOString(),
            student_id: 'student-1',
            student: { display_name: 'Alice', avatar_emoji: '🎮' },
            achievement: { key: 'streak_starter', icon: '🔥' },
          },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'student_duels') return mockDuelsQuery;
      if (table === 'student_achievements') return mockAchievementsQuery;
      if (table === 'classroom_memberships') return mockClassroomMembersQuery;
      return mockDuelsQuery;
    });

    const { result } = renderHook(() => useClassroomActivity('classroom-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have 3 activities merged and sorted by timestamp DESC
    expect(result.current.activities).toHaveLength(3);

    // First: achievement unlocked now
    expect(result.current.activities[0].type).toBe('achievement_unlocked');
    expect(result.current.activities[0].actorName).toBe('Bob');

    // Second: duel completed 1 hour ago
    expect(result.current.activities[1].type).toBe('duel_completed');
    expect(result.current.activities[1].actorName).toBe('Alice');

    // Third: achievement unlocked 2 hours ago
    expect(result.current.activities[2].type).toBe('achievement_unlocked');
    expect(result.current.activities[2].actorName).toBe('Alice');
  });

  it('handles fetch errors gracefully', async () => {
    const mockClassroomMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const mockDuelsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    const mockAchievementsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'student_duels') return mockDuelsQuery;
      if (table === 'student_achievements') return mockAchievementsQuery;
      if (table === 'classroom_memberships') return mockClassroomMembersQuery;
      return mockDuelsQuery;
    });

    const { result } = renderHook(() => useClassroomActivity('classroom-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.activities).toEqual([]);
  });
});
