import { renderHook, waitFor } from '@testing-library/react';
import { useClassroomLeaderboard } from '../useClassroomLeaderboard';
import * as teacherLib from '@/lib/supabase/teacher';

// Mock the teacher library
jest.mock('@/lib/supabase/teacher');

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('useClassroomLeaderboard', () => {
  const mockClassroomId = 'classroom-123';
  const mockCurrentUserId = 'student-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== BASIC FUNCTIONALITY ====================

  describe('Basic Functionality', () => {
    it('returns loading state initially', () => {
      // GIVEN: Mock returns pending promise
      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockImplementation(
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
      expect(result.current.topThree).toEqual([]);
      expect(result.current.currentUserRank).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches and returns top 3 students sorted by XP descending', async () => {
      // GIVEN: Mock data with 5 students
      const mockData = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: 'https://example.com/alice.jpg',
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-2',
            displayName: 'Bob',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: 'https://example.com/carol.jpg',
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: {
          userId: mockCurrentUserId,
          displayName: 'Current User',
          avatarUrl: null,
          totalXp: 150,
          currentLevel: 2,
          rank: 4,
          isCurrentUser: true,
          isInactive: false,
        },
        totalStudents: 5,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return top 3 students in descending XP order
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.topThree).toHaveLength(3);
      expect(result.current.topThree[0].totalXp).toBe(500);
      expect(result.current.topThree[1].totalXp).toBe(350);
      expect(result.current.topThree[2].totalXp).toBe(200);
      expect(result.current.totalStudents).toBe(5);
    });

    it('returns current user rank when not in top 3', async () => {
      // GIVEN: Current user is 4th place
      const mockData = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-2',
            displayName: 'Bob',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: {
          userId: mockCurrentUserId,
          displayName: 'Current User',
          avatarUrl: null,
          totalXp: 150,
          currentLevel: 2,
          rank: 4,
          isCurrentUser: true,
          isInactive: false,
        },
        totalStudents: 5,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return current user as separate rank
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
      const mockData = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: mockCurrentUserId,
            displayName: 'Current User',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: true,
            isInactive: false,
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null, // Not needed when in top 3
        totalStudents: 3,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Current user should be in top 3 with isCurrentUser = true
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
      const mockData = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-2',
            displayName: 'Bob (Inactive)',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: false,
            isInactive: true, // Marked as inactive
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 3,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
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

      expect(result.current.topThree[1].isInactive).toBe(true);
      expect(result.current.topThree[0].isInactive).toBe(false);
      expect(result.current.topThree[2].isInactive).toBe(false);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('handles empty classroom gracefully', async () => {
      // GIVEN: Empty classroom
      const mockData = {
        topThree: [],
        currentUserRank: null,
        totalStudents: 0,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
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

      expect(result.current.topThree).toEqual([]);
      expect(result.current.currentUserRank).toBeNull();
      expect(result.current.totalStudents).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('handles classroom with only 1 student', async () => {
      // GIVEN: Only current user in classroom
      const mockData = {
        topThree: [
          {
            userId: mockCurrentUserId,
            displayName: 'Current User',
            avatarUrl: null,
            totalXp: 100,
            currentLevel: 2,
            rank: 1,
            isCurrentUser: true,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 1,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
        error: null,
      });

      // WHEN: Hook is rendered
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should return single student
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.topThree).toHaveLength(1);
      expect(result.current.topThree[0].isCurrentUser).toBe(true);
      expect(result.current.currentUserRank).toBeNull();
    });

    it('handles classroom with exactly 2 students', async () => {
      // GIVEN: 2 students
      const mockData = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: mockCurrentUserId,
            displayName: 'Current User',
            avatarUrl: null,
            totalXp: 100,
            currentLevel: 2,
            rank: 2,
            isCurrentUser: true,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 2,
      };

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: mockData,
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

      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockReturnValue(promise as any);

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
      resolvePromise!({
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: null,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles error state', async () => {
      // GIVEN: API returns error
      const mockError = { message: 'Failed to fetch leaderboard' };
      jest.spyOn(teacherLib, 'getClassroomLeaderboard').mockResolvedValue({
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
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
      // GIVEN: Initial data
      const mockData1 = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 1,
      };

      const mockData2 = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 600,
            currentLevel: 6,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: mockCurrentUserId,
            displayName: 'Current User',
            avatarUrl: null,
            totalXp: 100,
            currentLevel: 2,
            rank: 2,
            isCurrentUser: true,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 2,
      };

      const mockFetch = jest
        .spyOn(teacherLib, 'getClassroomLeaderboard')
        .mockResolvedValueOnce({ data: mockData1, error: null })
        .mockResolvedValueOnce({ data: mockData2, error: null });

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

      expect(result.current.topThree).toHaveLength(1);
      expect(result.current.totalStudents).toBe(1);

      // Refresh
      await result.current.refresh();

      // THEN: Should fetch new data
      await waitFor(() => {
        expect(result.current.topThree).toHaveLength(2);
      });

      expect(result.current.totalStudents).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== TIME SCOPE (WEEKLY) ====================

  describe('Time Scope - Weekly', () => {
    it('supports weekly time scope filtering', async () => {
      // GIVEN: Weekly leaderboard data
      const mockData = {
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 150, // XP earned this week
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 1,
      };

      const mockFetch = jest
        .spyOn(teacherLib, 'getClassroomLeaderboard')
        .mockResolvedValue({ data: mockData, error: null });

      // WHEN: Hook is rendered with weekly scope
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
          timeScope: 'weekly',
        })
      );

      // THEN: Should pass weekly scope to API
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(mockClassroomId, mockCurrentUserId, 'weekly');
      expect(result.current.topThree).toHaveLength(1);
    });

    it('defaults to all-time scope when not specified', async () => {
      // GIVEN: All-time leaderboard data
      const mockData = {
        topThree: [],
        currentUserRank: null,
        totalStudents: 0,
      };

      const mockFetch = jest
        .spyOn(teacherLib, 'getClassroomLeaderboard')
        .mockResolvedValue({ data: mockData, error: null });

      // WHEN: Hook is rendered without timeScope
      const { result } = renderHook(() =>
        useClassroomLeaderboard({
          classroomId: mockClassroomId,
          currentUserId: mockCurrentUserId,
        })
      );

      // THEN: Should default to 'all-time'
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(mockClassroomId, mockCurrentUserId, 'all-time');
    });
  });
});
