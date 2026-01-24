'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import {
  getStudentProgress,
  getClassProgress,
  updateProgress as updateProgressAPI,
  type StudentLessonProgress,
  type WordAttempt,
} from '@/lib/supabase/teacher';
import logger from '@/utils/logger';

interface UseStudentProgressState {
  progress: StudentLessonProgress[];
  isLoading: boolean;
  error: string | null;
}

interface UseStudentProgressActions {
  refresh: () => Promise<void>;
  recordAttempt: (lessonId: string, word: string, correct: boolean) => Promise<{ success: boolean; error?: string }>;
}

export type UseStudentProgressReturn = UseStudentProgressState & UseStudentProgressActions;

/**
 * Hook for tracking student's lesson progress
 *
 * Provides:
 * - List of progress records for a student (optionally filtered by lesson)
 * - Record word attempt operation
 * - Automatic refresh on auth state change
 */
export function useStudentProgress(lessonId?: string): UseStudentProgressReturn {
  const { isAuthenticated, user } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UseStudentProgressState>({
    progress: [],
    isLoading: true,
    error: null,
  });

  // Fetch student progress
  const fetchProgress = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        progress: [],
        isLoading: false,
      }));
      return;
    }

    try {
      const { data, error } = await getStudentProgress(user.id, lessonId);

      if (isMounted.current) {
        setState({
          progress: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching student progress:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load progress',
        }));
      }
    }
  }, [isAuthenticated, user, lessonId, isMounted]);

  // Refresh progress
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchProgress();
  }, [fetchProgress]);

  // Record word attempt
  const recordAttempt = useCallback(async (
    targetLessonId: string,
    word: string,
    correct: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await updateProgressAPI(user.id, targetLessonId, { word, correct });

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current && data) {
        setState(prev => {
          const existingIndex = prev.progress.findIndex(
            p => p.lesson_id === targetLessonId
          );

          if (existingIndex >= 0) {
            // Update existing progress
            const updated = [...prev.progress];
            updated[existingIndex] = data;
            return { ...prev, progress: updated };
          } else {
            // Add new progress
            return { ...prev, progress: [data, ...prev.progress] };
          }
        });
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to record attempt';
      logger.error('Exception in recordAttempt:', error);
      return { success: false, error };
    }
  }, [user, isMounted]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchProgress();
    } else {
      setState({
        progress: [],
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, fetchProgress]);

  return {
    ...state,
    refresh,
    recordAttempt,
  };
}

// =============================================
// CLASS PROGRESS HOOK (FOR TEACHERS)
// =============================================

interface UseClassProgressState {
  progress: StudentLessonProgress[];
  isLoading: boolean;
  error: string | null;
}

interface UseClassProgressActions {
  refresh: () => Promise<void>;
}

export type UseClassProgressReturn = UseClassProgressState & UseClassProgressActions;

/**
 * Hook for viewing progress of all students in a classroom for a specific lesson
 *
 * Provides:
 * - List of progress records for all students in classroom
 * - Automatic refresh on mount
 */
export function useClassProgress(
  classroomId: string | undefined,
  lessonId: string
): UseClassProgressReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<UseClassProgressState>({
    progress: [],
    isLoading: true,
    error: null,
  });

  // Fetch class progress
  const fetchProgress = useCallback(async () => {
    if (!classroomId) {
      setState({
        progress: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await getClassProgress(classroomId, lessonId);

      if (isMounted.current) {
        setState({
          progress: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching class progress:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load class progress',
        }));
      }
    }
  }, [classroomId, lessonId, isMounted]);

  // Refresh progress
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchProgress();
  }, [fetchProgress]);

  // Initial fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    ...state,
    refresh,
  };
}

// =============================================
// LESSON STATS HOOK (AGGREGATE STATISTICS)
// =============================================

interface LessonStats {
  totalStudents: number;
  studentsStarted: number;
  studentsCompleted: number;
  averageWordsAttempted: number;
  averageWordsMastered: number;
  completionRate: number;
  wordStats: Record<string, {
    totalAttempts: number;
    totalCorrect: number;
    studentsMastered: number;
    accuracyRate: number;
  }>;
}

interface UseLessonStatsState {
  stats: LessonStats | null;
  isLoading: boolean;
  error: string | null;
}

interface UseLessonStatsActions {
  refresh: () => Promise<void>;
}

export type UseLessonStatsReturn = UseLessonStatsState & UseLessonStatsActions;

/**
 * Hook for aggregated lesson statistics
 *
 * Provides:
 * - Overall lesson completion and mastery stats
 * - Per-word difficulty metrics
 * - Student engagement metrics
 */
export function useLessonStats(
  classroomId: string | undefined,
  lessonId: string | undefined
): UseLessonStatsReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<UseLessonStatsState>({
    stats: null,
    isLoading: true,
    error: null,
  });

  // Calculate stats from progress data
  const calculateStats = useCallback((progressData: StudentLessonProgress[]): LessonStats => {
    if (progressData.length === 0) {
      return {
        totalStudents: 0,
        studentsStarted: 0,
        studentsCompleted: 0,
        averageWordsAttempted: 0,
        averageWordsMastered: 0,
        completionRate: 0,
        wordStats: {},
      };
    }

    const studentsCompleted = progressData.filter(p => p.completed_at !== null).length;
    const totalWordsAttempted = progressData.reduce(
      (sum, p) => sum + Object.keys(p.words_attempted || {}).length,
      0
    );
    const totalWordsMastered = progressData.reduce(
      (sum, p) => sum + (p.words_mastered || []).length,
      0
    );

    // Aggregate word-level statistics
    const wordStats: Record<string, {
      totalAttempts: number;
      totalCorrect: number;
      studentsMastered: number;
      accuracyRate: number;
    }> = {};

    progressData.forEach(progress => {
      const wordsAttempted = progress.words_attempted || {};
      const wordsMastered = progress.words_mastered || [];

      Object.entries(wordsAttempted).forEach(([word, attempt]) => {
        const attemptData = attempt as WordAttempt;
        if (!wordStats[word]) {
          wordStats[word] = {
            totalAttempts: 0,
            totalCorrect: 0,
            studentsMastered: 0,
            accuracyRate: 0,
          };
        }

        wordStats[word].totalAttempts += attemptData.attempts;
        wordStats[word].totalCorrect += attemptData.correct;
        if (wordsMastered.includes(word)) {
          wordStats[word].studentsMastered += 1;
        }
      });
    });

    // Calculate accuracy rates
    Object.keys(wordStats).forEach(word => {
      const stats = wordStats[word];
      stats.accuracyRate = stats.totalAttempts > 0
        ? (stats.totalCorrect / stats.totalAttempts) * 100
        : 0;
    });

    return {
      totalStudents: progressData.length,
      studentsStarted: progressData.length,
      studentsCompleted,
      averageWordsAttempted: totalWordsAttempted / progressData.length,
      averageWordsMastered: totalWordsMastered / progressData.length,
      completionRate: progressData.length > 0 ? (studentsCompleted / progressData.length) * 100 : 0,
      wordStats,
    };
  }, []);

  // Fetch and calculate stats
  const fetchStats = useCallback(async () => {
    if (!classroomId || !lessonId) {
      setState({
        stats: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await getClassProgress(classroomId, lessonId);

      if (error) {
        if (isMounted.current) {
          setState({
            stats: null,
            isLoading: false,
            error: error.message,
          });
        }
        return;
      }

      const stats = calculateStats(data);

      if (isMounted.current) {
        setState({
          stats,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      logger.error('Error fetching lesson stats:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load lesson stats',
        }));
      }
    }
  }, [classroomId, lessonId, calculateStats, isMounted]);

  // Refresh stats
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    ...state,
    refresh,
  };
}
