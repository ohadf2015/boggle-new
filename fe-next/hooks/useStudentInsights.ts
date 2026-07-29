'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import { getStudentProgress } from '@/lib/supabase/education';
import { getPracticeSessions } from '@/lib/supabase/education/practice';
import type { WordAttempt } from '@/lib/supabase/education/types';
import logger from '@/utils/logger';

// ============================================
// TYPES
// ============================================

export interface TrainingInsight {
  /** Words with <40% accuracy across all attempts */
  weakWords: string[];
  /** Words that are mastered AND have >80% accuracy */
  strongWords: string[];
  /** Days in a row with at least one practice session */
  practiceStreakDays: number;
  /** Practice mode with highest average accuracy */
  bestPracticeMode: string;
  /** Average session duration in seconds */
  avgSessionDuration: number;
  /** Total number of completed practice sessions */
  totalPracticeSessions: number;
  /** XP awarded from sessions in the last 7 days */
  xpThisWeek: number;
  /** Direction of accuracy trend comparing first vs second half of sessions */
  improvementTrend: 'improving' | 'steady' | 'declining';
}

interface UseStudentInsightsState {
  insights: TrainingInsight | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseStudentInsightsReturn extends UseStudentInsightsState {
  refresh: () => Promise<void>;
}

// ============================================
// HELPERS
// ============================================

/** Minimum improvement delta (percentage points) to be classified as improving/declining */
const TREND_THRESHOLD = 5;
/** Minimum sessions needed to determine trend */
const MIN_SESSIONS_FOR_TREND = 4;

function calculateWeakWords(
  wordsAttempted: Record<string, WordAttempt>
): string[] {
  return Object.entries(wordsAttempted)
    .filter(([, attempt]) => {
      if (attempt.attempts === 0) return false;
      return (attempt.correct / attempt.attempts) < 0.4;
    })
    .map(([word]) => word);
}

function calculateStrongWords(
  wordsMastered: string[],
  wordsAttempted: Record<string, WordAttempt>
): string[] {
  return wordsMastered.filter(word => {
    const attempt = wordsAttempted[word];
    if (!attempt || attempt.attempts === 0) return true; // mastered but no recent data
    return (attempt.correct / attempt.attempts) > 0.8;
  });
}

function calculateBestPracticeMode(
  sessions: Array<{ mode: string; accuracy: number | null }>
): string {
  if (sessions.length === 0) return '';

  const modeStats: Record<string, { total: number; count: number }> = {};

  for (const session of sessions) {
    if (session.accuracy === null) continue;
    if (!modeStats[session.mode]) {
      modeStats[session.mode] = { total: 0, count: 0 };
    }
    modeStats[session.mode].total += session.accuracy;
    modeStats[session.mode].count += 1;
  }

  let bestMode = '';
  let bestAvg = -1;

  for (const [mode, stats] of Object.entries(modeStats)) {
    if (stats.count === 0) continue;
    const avg = stats.total / stats.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestMode = mode;
    }
  }

  return bestMode;
}

function calculateImprovementTrend(
  sessions: Array<{ accuracy: number | null; created_at: string }>
): 'improving' | 'steady' | 'declining' {
  // Filter sessions with accuracy values, sort chronologically
  const withAccuracy = sessions
    .filter(s => s.accuracy !== null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (withAccuracy.length < MIN_SESSIONS_FOR_TREND) return 'steady';

  const midpoint = Math.floor(withAccuracy.length / 2);
  const firstHalf = withAccuracy.slice(0, midpoint);
  const secondHalf = withAccuracy.slice(midpoint);

  const avgFirst = firstHalf.reduce((s, x) => s + (x.accuracy ?? 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, x) => s + (x.accuracy ?? 0), 0) / secondHalf.length;

  const delta = avgSecond - avgFirst;

  if (delta >= TREND_THRESHOLD) return 'improving';
  if (delta <= -TREND_THRESHOLD) return 'declining';
  return 'steady';
}

function calculateXpThisWeek(
  sessions: Array<{ xp_awarded: number; created_at: string }>
): number {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return sessions
    .filter(s => new Date(s.created_at).getTime() >= sevenDaysAgo)
    .reduce((sum, s) => sum + s.xp_awarded, 0);
}

// ============================================
// HOOK
// ============================================

/**
 * useStudentInsights - Education analytics for a student's training patterns
 *
 * Surfaces:
 * - Weak/strong vocabulary words
 * - Best-performing practice mode
 * - XP earned this week
 * - Improvement trend from recent session history
 *
 * @param lessonId - Optional: filter to a specific lesson
 */
export function useStudentInsights(lessonId?: string): UseStudentInsightsReturn {
  const { isAuthenticated, user } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UseStudentInsightsState>({
    insights: null,
    isLoading: true,
    error: null,
  });

  const fetchInsights = useCallback(async () => {
    if (!isAuthenticated || !user) {
      if (isMounted.current) {
        setState({ insights: null, isLoading: false, error: null });
      }
      return;
    }

    try {
      const [sessionsResult, progressResult] = await Promise.all([
        getPracticeSessions(user.id, lessonId),
        getStudentProgress(user.id, lessonId),
      ]);

      if (sessionsResult.error) {
        if (isMounted.current) {
          setState({ insights: null, isLoading: false, error: sessionsResult.error.message });
        }
        return;
      }

      if (progressResult.error) {
        if (isMounted.current) {
          setState({ insights: null, isLoading: false, error: progressResult.error.message });
        }
        return;
      }

      const sessions = sessionsResult.data;
      const progressRecords = progressResult.data;

      // Merge words_attempted from all progress records
      const mergedAttempted: Record<string, WordAttempt> = {};
      const allMastered: string[] = [];

      for (const record of progressRecords) {
        for (const [word, attempt] of Object.entries(record.words_attempted || {})) {
          if (!mergedAttempted[word]) {
            mergedAttempted[word] = { attempts: 0, correct: 0, lastAttemptAt: attempt.lastAttemptAt };
          }
          mergedAttempted[word].attempts += attempt.attempts;
          mergedAttempted[word].correct += attempt.correct;
        }
        for (const w of record.words_mastered || []) {
          if (!allMastered.includes(w)) allMastered.push(w);
        }
      }

      // Calculate streak from progress records (use max current_streak)
      const practiceStreakDays = progressRecords.reduce(
        (max, r) => Math.max(max, r.current_streak || 0),
        0
      );

      // Average session duration from completed sessions with duration
      const sessionsWithDuration = sessions.filter(s => s.duration_seconds !== null);
      const avgSessionDuration =
        sessionsWithDuration.length > 0
          ? sessionsWithDuration.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) /
            sessionsWithDuration.length
          : 0;

      const totalPracticeSessions = sessions.length;

      const insights: TrainingInsight = {
        weakWords: calculateWeakWords(mergedAttempted),
        strongWords: calculateStrongWords(allMastered, mergedAttempted),
        practiceStreakDays,
        bestPracticeMode: calculateBestPracticeMode(sessions),
        avgSessionDuration,
        totalPracticeSessions,
        xpThisWeek: calculateXpThisWeek(sessions),
        improvementTrend: calculateImprovementTrend(sessions),
      };

      if (isMounted.current) {
        setState({ insights, isLoading: false, error: null });
      }
    } catch (err) {
      logger.error('Error fetching student insights:', err);
      if (isMounted.current) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to load insights' }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, lessonId]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInsights();
    } else {
      setState({ insights: null, isLoading: false, error: null });
    }
  }, [isAuthenticated, fetchInsights]);

  return { ...state, refresh };
}
