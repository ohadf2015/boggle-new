'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import {
  getClassroomLeaderboard,
  getLeaderboardWithRankDelta,
  type LeaderboardEntry,
  type LeaderboardEntryWithDelta,
  type ClassroomLeaderboardData,
  type LeaderboardTimeScope,
} from '@/lib/supabase/education';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UseClassroomLeaderboardOptions {
  /** Classroom ID to fetch leaderboard for */
  classroomId: string;
  /** Current student's user ID (for isCurrentUser marking) */
  currentUserId: string;
  /** Initial time scope: 'weekly' (default), 'monthly', or 'all-time' */
  initialTimeScope?: LeaderboardTimeScope;
}

interface UseClassroomLeaderboardState {
  /** Top 3 students by XP (deprecated - use fullList instead) */
  topThree: LeaderboardEntry[];
  /** Current user's rank (if not in top 3) (deprecated - use fullList instead) */
  currentUserRank: LeaderboardEntry | null;
  /** Full list of all students with rank delta */
  fullList: LeaderboardEntryWithDelta[];
  /** Total number of students in classroom */
  totalStudents: number;
  /** Current time scope */
  timeScope: LeaderboardTimeScope;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

interface UseClassroomLeaderboardActions {
  /** Re-fetch leaderboard data */
  refresh: () => Promise<void>;
  /** Change time scope (weekly, monthly, all-time) */
  setTimeScope: (scope: LeaderboardTimeScope) => void;
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
  const { classroomId, currentUserId, initialTimeScope = 'weekly' } = options;
  const isMounted = useMounted();

  const [timeScope, setTimeScope] = useState<LeaderboardTimeScope>(initialTimeScope);

  const [state, setState] = useState<UseClassroomLeaderboardState>({
    topThree: [],
    currentUserRank: null,
    fullList: [],
    totalStudents: 0,
    timeScope: initialTimeScope,
    isLoading: true,
    error: null,
  });

  // ==================== FETCH LEADERBOARD ====================

  const fetchLeaderboard = useCallback(async () => {
    if (!classroomId || !currentUserId) {
      setState({
        topThree: [],
        currentUserRank: null,
        fullList: [],
        totalStudents: 0,
        timeScope,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch full leaderboard with rank delta
      const { data: fullList, error } = await getLeaderboardWithRankDelta(
        classroomId,
        currentUserId,
        timeScope
      );

      if (isMounted.current) {
        if (error) {
          setState({
            topThree: [],
            currentUserRank: null,
            fullList: [],
            totalStudents: 0,
            timeScope,
            isLoading: false,
            error: new Error(error.message),
          });
        } else {
          // Extract top 3 and current user rank for backward compatibility
          const topThree = fullList.slice(0, 3);
          const currentUserInTopThree = topThree.some(e => e.isCurrentUser);
          const currentUserRank = currentUserInTopThree
            ? null
            : fullList.find(e => e.isCurrentUser) || null;

          setState({
            topThree,
            currentUserRank,
            fullList,
            totalStudents: fullList.length,
            timeScope,
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
    setTimeScope,
  };
}

// ==================== EXPORTS ====================

export type { LeaderboardEntry, ClassroomLeaderboardData };
export default useClassroomLeaderboard;
