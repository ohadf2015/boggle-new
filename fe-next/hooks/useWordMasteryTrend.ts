'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import type { ClassMastery } from '@/lib/education/wordMasteryTrend';
import logger from '@/utils/logger';

export interface UseWordMasteryTrendOptions {
  classroomId: string;
}

interface State {
  mastery: ClassMastery | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseWordMasteryTrendReturn extends State {
  refresh: () => Promise<void>;
}

/**
 * Word-mastery trends for the teacher's Pro "Word Mastery" card. Mirrors
 * useRecentClassroomGames: loading -> mastery | error, plus `refresh`.
 */
export function useWordMasteryTrend({
  classroomId,
}: UseWordMasteryTrendOptions): UseWordMasteryTrendReturn {
  const isMounted = useMounted();
  const [state, setState] = useState<State>({ mastery: null, isLoading: true, error: null });

  const fetchMastery = useCallback(async () => {
    if (!classroomId) {
      setState({ mastery: null, isLoading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error } = await getClassMastery(classroomId);
      if (!isMounted.current) return;
      if (error) {
        setState({ mastery: null, isLoading: false, error: new Error(error.message) });
        return;
      }
      setState({ mastery: data, isLoading: false, error: null });
    } catch (err) {
      logger.error('Error fetching word mastery trend:', err);
      if (isMounted.current) {
        setState({
          mastery: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load word mastery'),
        });
      }
    }
  }, [classroomId, isMounted]);

  useEffect(() => {
    fetchMastery();
  }, [fetchMastery]);

  const refresh = useCallback(async () => {
    await fetchMastery();
  }, [fetchMastery]);

  return { ...state, refresh };
}

export default useWordMasteryTrend;
