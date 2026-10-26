'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { getClassProgress, type StudentLessonProgress, type WordAttempt } from '@/lib/supabase/education';
import logger from '@/utils/logger';

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
