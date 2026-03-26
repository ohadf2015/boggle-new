import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClassroomLeaderboard } from '../useClassroomLeaderboard';
import * as educationLib from '@/lib/supabase/education';

// Mock the education library
vi.mock('@/lib/supabase/education');

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper to create a LeaderboardEntryWithDelta
const createEntry = (overrides: Record<string, any> = {}) => ({
  userId: 'student-1',
  displayName: 'Student',
  avatarUrl: null,
  totalXp: 100,
  currentLevel: 1,
  rank: 1,
  isCurrentUser: false,
  isInactive: false,
  currentStreak: 0,
  previousRank: null,
  rankDelta: null,
  isNew: false,
  ...overrides,
});

describe('useClassroomLeaderboard', () => {
  const mockClassroomId = 'classroom-123';
  const mockCurrentUserId = 'student-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC FUNCTIONALITY ====================

  describe('Basic Functionality', () => {
    it('returns loading state initially', () => {
      // GIVEN: Mock returns pending promise
      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should show loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.fullList).toEqual([]);
      expect(result.current.topThree).toEqual([]);
      expect(result.current.currentUserRank).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches and returns full list sorted by XP descending', async () => {
      // GIVEN: Mock data with 5 students
      const mockFullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, currentLevel: 5, rank: 1 }),
        createEntry({ userId: 'student-2', displayName: 'Bob', totalXp: 350, currentLevel: 4, rank: 2 }),
        createEntry({ userId: 'student-3', displayName: 'Carol', totalXp: 200, currentLevel: 3, rank: 3 }),
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 150, currentLevel: 2, rank: 4, isCurrentUser: true }),
        createEntry({ userId: 'student-5', displayName: 'Eve', totalXp: 50, currentLevel: 1, rank: 5 }),
      ];

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: mockFullList,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return full list and derived top 3
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fullList).toHaveLength(5);
      expect(result.current.topThree).toHaveLength(3);
      expect(result.current.topThree[0].totalXp).toBe(500);
      expect(result.current.topThree[1].totalXp).toBe(350);
      expect(result.current.topThree[2].totalXp).toBe(200);
      expect(result.current.totalStudents).toBe(5);
    });

    it('returns current user rank when not in top 3', async () => {
      // GIVEN: Current user is 4th place
      const mockFullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
        createEntry({ userId: 'student-2', displayName: 'Bob', totalXp: 350, rank: 2 }),
        createEntry({ userId: 'student-3', displayName: 'Carol', totalXp: 200, rank: 3 }),
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 150, rank: 4, isCurrentUser: true }),
        createEntry({ userId: 'student-5', displayName: 'Eve', totalXp: 50, rank: 5 }),
      ];

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: mockFullList,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return current user as separate rank (derived from fullList)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUserRank).not.toBeNull();
      expect(result.current.currentUserRank?.userId).toBe(mockCurrentUserId);
      expect(result.current.currentUserRank?.rank).toBe(4);
      expect(result.current.currentUserRank?.isCurrentUser).toBe(true);
    });

    it('handles current user in top 3 (isCurrentUser = true, no duplicate)', async () => {
      // GIVEN: Current user is 2nd place
      const mockFullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 350, rank: 2, isCurrentUser: true }),
        createEntry({ userId: 'student-3', displayName: 'Carol', totalXp: 200, rank: 3 }),
      ];

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: mockFullList,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Current user should be in top 3, currentUserRank should be null
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.topThree).toHaveLength(3);
      expect(result.current.topThree[1].userId).toBe(mockCurrentUserId);
      expect(result.current.topThree[1].isCurrentUser).toBe(true);
      expect(result.current.currentUserRank).toBeNull();
    });

    it('marks inactive students (7+ days no practice)', async () => {
      // GIVEN: Mock data with inactive student
      const mockFullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
        createEntry({ userId: 'student-2', displayName: 'Bob (Inactive)', totalXp: 350, rank: 2, isInactive: true }),
        createEntry({ userId: 'student-3', displayName: 'Carol', totalXp: 200, rank: 3 }),
      ];

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: mockFullList,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Inactive student should be marked
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fullList[1].isInactive).toBe(true);
      expect(result.current.fullList[0].isInactive).toBe(false);
      expect(result.current.fullList[2].isInactive).toBe(false);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('handles empty classroom gracefully', async () => {
      // GIVEN: Empty classroom
      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: [],
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return empty state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fullList).toEqual([]);
      expect(result.current.topThree).toEqual([]);
      expect(result.current.currentUserRank).toBeNull();
      expect(result.current.totalStudents).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('handles classroom with only 1 student', async () => {
      // GIVEN: Only current user in classroom
      const mockFullList = [
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 100, rank: 1, isCurrentUser: true }),
      ];

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: mockFullList,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return single student in top 3 and fullList
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fullList).toHaveLength(1);
      expect(result.current.topThree).toHaveLength(1);
      expect(result.current.topThree[0].isCurrentUser).toBe(true);
      expect(result.current.currentUserRank).toBeNull();
    });

    it('handles classroom with exactly 2 students', async () => {
      // GIVEN: 2 students
      const mockFullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 200, rank: 1 }),
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 100, rank: 2, isCurrentUser: true }),
      ];

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: mockFullList,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return both students
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fullList).toHaveLength(2);
      expect(result.current.topThree).toHaveLength(2);
      expect(result.current.currentUserRank).toBeNull();
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('handles loading state', async () => {
      // GIVEN: Slow API call
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockReturnValue(promise as any);

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should show loading
      expect(result.current.isLoading).toBe(true);

      // Complete the promise
      await act(async () => {
        resolvePromise!({ data: [], error: null });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles error state', async () => {
      // GIVEN: API returns error
      const mockError = { message: 'Failed to fetch leaderboard' };
      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta').mockResolvedValue({
        data: [],
        error: mockError,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should set error
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Failed to fetch leaderboard');
    });
  });

  // ==================== REFRESH FUNCTIONALITY ====================

  describe('Refresh Functionality', () => {
    it('refresh function re-fetches data', async () => {
      // GIVEN: Initial data (1 student) then updated data (2 students)
      const mockFullList1 = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
      ];
      const mockFullList2 = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 600, rank: 1 }),
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 100, rank: 2, isCurrentUser: true }),
      ];

      const mockFetch = jest
        .spyOn(educationLib, 'getLeaderboardWithRankDelta')
        .mockResolvedValueOnce({ data: mockFullList1, error: null })
        .mockResolvedValueOnce({ data: mockFullList2, error: null });

      // WHEN: Hook is rendered and refreshed
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fullList).toHaveLength(1);
      expect(result.current.totalStudents).toBe(1);

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      // THEN: Should fetch new data
      await waitFor(() => {
        expect(result.current.fullList).toHaveLength(2);
      });

      expect(result.current.totalStudents).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== TIME SCOPE ====================

  describe('Time Scope', () => {
    it('defaults to weekly scope', async () => {
      // GIVEN: Leaderboard data
      const mockFetch = jest
        .spyOn(educationLib, 'getLeaderboardWithRankDelta')
        .mockResolvedValue({ data: [], error: null });

      // WHEN: Hook is rendered without initialTimeScope
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should default to 'weekly'
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.timeScope).toBe('weekly');
      expect(mockFetch).toHaveBeenCalledWith(mockClassroomId, mockCurrentUserId, 'weekly');
    });

    it('supports custom initialTimeScope', async () => {
      // GIVEN: Monthly scope requested
      const mockFetch = jest
        .spyOn(educationLib, 'getLeaderboardWithRankDelta')
        .mockResolvedValue({ data: [], error: null });

      // WHEN: Hook is rendered with monthly scope
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
          initialTimeScope: 'monthly',
        })
      );

      // THEN: Should use monthly scope
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.timeScope).toBe('monthly');
      expect(mockFetch).toHaveBeenCalledWith(mockClassroomId, mockCurrentUserId, 'monthly');
    });

    it('exposes setTimeScope to change scope', async () => {
      // GIVEN: Hook with default scope
      vi.spyOn(educationLib, 'getLeaderboardWithRankDelta')
        .mockResolvedValue({ data: [], error: null });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN: setTimeScope should be available
      expect(typeof result.current.setTimeScope).toBe('function');
    });
  });
});
