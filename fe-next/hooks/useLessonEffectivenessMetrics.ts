'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { getStudentProgressForLesson } from '@/lib/supabase/education/progress';
import { getPracticeSessionsForLesson } from '@/lib/supabase/education/practice';
import type { WordAttempt } from '@/lib/supabase/education/types';
import logger from '@/utils/logger';

// ============================================
// TYPES
// ============================================

export interface LessonEffectivenessMetrics {
  lessonId: string;
  /** Percentage of students who completed the lesson */
  completionRate: number;
  /** Average accuracy across all students and sessions */
  averageAccuracy: number;
  /** Average number of practice sessions before mastery */
  averageSessionsToMastery: number;
  /** Words sorted by lowest accuracy first */
  hardestWords: string[];
  /** Words sorted by highest accuracy first */
  easiestWords: string[];
  /** Composite engagement score 0–1 */
  engagementScore: number;
  /** Number of students with < 50% overall word accuracy */
  studentsFailing: number;
}

export interface UseLessonEffectivenessMetricsReturn {
  metrics: LessonEffectivenessMetrics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================
// HELPERS
// ============================================

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface WordAccuracyEntry {
  word: string;
  totalAttempts: number;
  totalCorrect: number;
}

function aggregateWordAccuracy(
  progressRecords: Array<{ words_attempted: Record<string, WordAttempt> }>
): WordAccuracyEntry[] {
  const map: Record<string, { totalAttempts: number; totalCorrect: number }> = {};

  for (const record of progressRecords) {
    for (const [word, attempt] of Object.entries(record.words_attempted || {})) {
      if (!map[word]) {
        map[word] = { totalAttempts: 0, totalCorrect: 0 };
      }
      map[word].totalAttempts += attempt.attempts;
      map[word].totalCorrect += attempt.correct;
    }
  }

  return Object.entries(map).map(([word, stats]) => ({
    word,
    ...stats,
  }));
}

function calculateStudentAccuracy(
  wordsAttempted: Record<string, WordAttempt>
): number {
  const entries = Object.values(wordsAttempted);
  if (entries.length === 0) return 0;
  const total = entries.reduce((s, a) => s + a.attempts, 0);
  const correct = entries.reduce((s, a) => s + a.correct, 0);
  return total === 0 ? 0 : correct / total;
}

// ============================================
// HOOK
// ============================================

/**
 * useLessonEffectivenessMetrics - Per-lesson teacher analytics
 *
 * Surfaces:
 * - Completion rate for the lesson
 * - Average accuracy across students
 * - Hardest/easiest words by accuracy
 * - Engagement composite score
 * - Count of struggling students
 *
 * @param lessonId - Lesson to analyse (undefined = no-op)
 * @param classroomId - Optional filter to a specific classroom
 */
export function useLessonEffectivenessMetrics(
  lessonId: string | undefined,
  classroomId?: string
): UseLessonEffectivenessMetricsReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<{
    metrics: LessonEffectivenessMetrics | null;
    isLoading: boolean;
    error: string | null;
  }>({
    metrics: null,
    isLoading: false,
    error: null,
  });

  const fetchMetrics = useCallback(async () => {
    if (!lessonId) {
      if (isMounted.current) {
        setState({ metrics: null, isLoading: false, error: null });
      }
      return;
    }

    if (isMounted.current) {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    try {
      const [progressResult, sessionsResult] = await Promise.all([
        getStudentProgressForLesson(lessonId),
        getPracticeSessionsForLesson(lessonId, classroomId),
      ]);

      if (progressResult.error) {
        if (isMounted.current) {
          setState({ metrics: null, isLoading: false, error: progressResult.error.message });
        }
        return;
      }

      const progressRecords = progressResult.data;
      const sessions = sessionsResult.error ? [] : sessionsResult.data;

      if (progressRecords.length === 0 && sessions.length === 0) {
        if (isMounted.current) {
          setState({
            metrics: {
              lessonId,
              completionRate: 0,
              averageAccuracy: 0,
              averageSessionsToMastery: 0,
              hardestWords: [],
              easiestWords: [],
              engagementScore: 0,
              studentsFailing: 0,
            },
            isLoading: false,
            error: null,
          });
        }
        return;
      }

      // Completion rate
      const totalStudents = progressRecords.length;
      const completed = progressRecords.filter(r => r.completed_at !== null).length;
      const completionRate = totalStudents > 0 ? (completed / totalStudents) * 100 : 0;

      // Average accuracy from sessions
      const sessionsWithAccuracy = sessions.filter(s => s.accuracy !== null);
      const averageAccuracy =
        sessionsWithAccuracy.length > 0
          ? sessionsWithAccuracy.reduce((s, x) => s + (x.accuracy ?? 0), 0) /
            sessionsWithAccuracy.length
          : 0;

      // Average sessions to mastery
      const avgSessionsToMastery =
        totalStudents > 0
          ? progressRecords.reduce((s, r) => s + (r.total_practice_sessions || 0), 0) /
            totalStudents
          : 0;

      // Word difficulty analysis
      const wordStats = aggregateWordAccuracy(progressRecords);
      const wordsSortedByAccuracy = wordStats
        .filter(w => w.totalAttempts > 0)
        .map(w => ({ word: w.word, accuracy: w.totalCorrect / w.totalAttempts }))
        .sort((a, b) => a.accuracy - b.accuracy);

      const hardestWords = wordsSortedByAccuracy.slice(0, 5).map(w => w.word);
      const easiestWords = wordsSortedByAccuracy.slice(-5).reverse().map(w => w.word);

      // Students failing: < 50% overall word accuracy
      const studentsFailing = progressRecords.filter(r => {
        const accuracy = calculateStudentAccuracy(r.words_attempted || {});
        return accuracy < 0.5;
      }).length;

      // Engagement score: composite of completion rate, accuracy, and session activity
      // Components: completionRate (0–1), accuracy (0–1), sessions normalised (cap at 10)
      const completionComponent = completionRate / 100;
      const accuracyComponent = averageAccuracy / 100;
      const sessionComponent = clamp(avgSessionsToMastery / 10, 0, 1);
      const engagementScore = clamp(
        (completionComponent + accuracyComponent + sessionComponent) / 3,
        0,
        1
      );

      if (isMounted.current) {
        setState({
          metrics: {
            lessonId,
            completionRate,
            averageAccuracy,
            averageSessionsToMastery: avgSessionsToMastery,
            hardestWords,
            easiestWords,
            engagementScore,
            studentsFailing,
          },
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      logger.error('Error fetching lesson effectiveness metrics:', err);
      if (isMounted.current) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to load lesson metrics' }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, classroomId]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { ...state, refresh };
}
