'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import {
  getClassroomMetrics,
  getCommonMistakes,
  type ClassroomMetrics as BaseClassroomMetrics,
  type CommonMistake,
} from '@/lib/supabase/analytics';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UseClassroomAnalyticsOptions {
  /** Classroom ID to fetch analytics for */
  classroomId: string;
}

export interface ClassroomMetrics extends BaseClassroomMetrics {
  /** Common mistakes (top 5 words with >50% error rate) */
  commonMistakes: CommonMistake[];
}

interface UseClassroomAnalyticsState {
  /** Classroom metrics */
  metrics: ClassroomMetrics | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

interface UseClassroomAnalyticsActions {
  /** Re-fetch analytics data */
  refresh: () => Promise<void>;
}

export type UseClassroomAnalyticsReturn = UseClassroomAnalyticsState &
  UseClassroomAnalyticsActions;

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Classroom analytics hook
 *
 * Fetches and manages classroom analytics data (students needing help, average XP, common mistakes).
 * Provides aggregated metrics for teacher-facing dashboards.
 *
 * @param options - Configuration options
 * @returns Analytics state and actions
 *
 * @example
 * const { metrics, isLoading, error } = useClassroomAnalytics({
 *   classroomId: 'classroom-123',
 * });
 *
 * // Render metrics
 * {metrics && (
 *   <>
 *     <div>Students needing help: {metrics.studentsNeedingHelp}</div>
 *     <div>Class average XP: {metrics.classAverageXp}</div>
 *     <div>Common mistakes: {metrics.commonMistakes.map(m => m.word).join(', ')}</div>
 *   </>
 * )}
 */
export function useClassroomAnalytics(
  options: UseClassroomAnalyticsOptions
): UseClassroomAnalyticsReturn {
  const { classroomId } = options;
  const isMounted = useMounted();

  const [state, setState] = useState<UseClassroomAnalyticsState>({
    metrics: null,
    isLoading: true,
    error: null,
  });

  // ==================== FETCH ANALYTICS ====================

  const fetchAnalytics = useCallback(async () => {
    if (!classroomId) {
      setState({
        metrics: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch metrics and common mistakes in parallel
      const [metricsResult, mistakesResult] = await Promise.all([
        getClassroomMetrics(classroomId),
        getCommonMistakes(classroomId, 5),
      ]);

      if (isMounted.current) {
        // Check for errors
        if (metricsResult.error) {
          setState({
            metrics: null,
            isLoading: false,
            error: new Error(metricsResult.error.message),
          });
          return;
        }

        if (mistakesResult.error) {
          setState({
            metrics: null,
            isLoading: false,
            error: new Error(mistakesResult.error.message),
          });
          return;
        }

        // Combine results
        const combinedMetrics: ClassroomMetrics = {
          ...metricsResult.data!,
          commonMistakes: mistakesResult.data || [],
        };

        setState({
          metrics: combinedMetrics,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      logger.error('Error fetching classroom analytics:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load analytics'),
        }));
      }
    }
  }, [classroomId, isMounted]);

  // ==================== REFRESH ====================

  const refresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // ==================== INITIAL FETCH ====================

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ==================== RETURN ====================

  return {
    ...state,
    refresh,
  };
}

// ==================== EXPORTS ====================

export type { CommonMistake };
export default useClassroomAnalytics;
