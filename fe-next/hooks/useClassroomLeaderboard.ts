'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import {
  getClassroomLeaderboard,
  type LeaderboardEntry,
  type ClassroomLeaderboardData,
} from '@/lib/supabase/teacher';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UseClassroomLeaderboardOptions {
  /** Classroom ID to fetch leaderboard for */
  classroomId: string;
  /** Current student's user ID (for isCurrentUser marking) */
  currentUserId: string;
  /** Time scope: 'all-time' (default) or 'weekly' */
  timeScope?: 'weekly' | 'all-time';
}

interface UseClassroomLeaderboardState {
  /** Top 3 students by XP */
  topThree: LeaderboardEntry[];
  /** Current user's rank (if not in top 3) */
  currentUserRank: LeaderboardEntry | null;
  /** Total number of students in classroom */
  totalStudents: number;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

interface UseClassroomLeaderboardActions {
  /** Re-fetch leaderboard data */
  refresh: () => Promise<void>;
}

export type UseClassroomLeaderboardReturn = UseClassroomLeaderboardState &
  UseClassroomLeaderboardActions;

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Classroom leaderboard hook
 *
 * Fetches and manages classroom leaderboard data (top 3 + current user rank).
 * Scoped to a single classroom for privacy-conscious ranking.
 *
 * @param options - Configuration options
 * @returns Leaderboard state and actions
 *
 * @example
 * const { topThree, currentUserRank, totalStudents } = useClassroomLeaderboard({
 *   classroomId: 'classroom-123',
 *   currentUserId: 'student-456',
 *   timeScope: 'all-time',
 * });
 *
 * // Render top 3
 * topThree.map(entry => (
 *   <div key={entry.userId}>
 *     {entry.rank}. {entry.displayName} - {entry.totalXp} XP
 *   </div>
 * ));
 *
 * // Render current user rank if not in top 3
 * {currentUserRank && (
 *   <div>You're #{currentUserRank.rank}</div>
 * )}
 */
export function useClassroomLeaderboard(
  options: UseClassroomLeaderboardOptions
): UseClassroomLeaderboardReturn {
  const { classroomId, currentUserId, timeScope = 'all-time' } = options;
  const isMounted = useMounted();

  const [state, setState] = useState<UseClassroomLeaderboardState>({
    topThree: [],
    currentUserRank: null,
    totalStudents: 0,
    isLoading: true,
    error: null,
  });

  // ==================== FETCH LEADERBOARD ====================

  const fetchLeaderboard = useCallback(async () => {
    if (!classroomId || !currentUserId) {
      setState({
        topThree: [],
        currentUserRank: null,
        totalStudents: 0,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await getClassroomLeaderboard(
        classroomId,
        currentUserId,
        timeScope
      );

      if (isMounted.current) {
        if (error) {
          setState({
            topThree: [],
            currentUserRank: null,
            totalStudents: 0,
            isLoading: false,
            error: new Error(error.message),
          });
        } else {
          setState({
            topThree: data.topThree,
            currentUserRank: data.currentUserRank,
            totalStudents: data.totalStudents,
            isLoading: false,
            error: null,
          });
        }
      }
    } catch (err) {
      logger.error('Error fetching classroom leaderboard:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load leaderboard'),
        }));
      }
    }
  }, [classroomId, currentUserId, timeScope, isMounted]);

  // ==================== REFRESH ====================

  const refresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ==================== INITIAL FETCH ====================

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ==================== RETURN ====================

  return {
    ...state,
    refresh,
  };
}

// ==================== EXPORTS ====================

export type { LeaderboardEntry, ClassroomLeaderboardData };
export default useClassroomLeaderboard;
