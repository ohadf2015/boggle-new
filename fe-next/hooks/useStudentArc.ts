'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { getStudentMasterySeries, type StudentArcData } from '@/lib/supabase/wordMastery';
import logger from '@/utils/logger';

export interface UseStudentArcOptions {
  classroomId: string;
  studentId: string;
}

interface State {
  arc: StudentArcData | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseStudentArcReturn extends State {
  refresh: () => Promise<void>;
}

/**
 * One student's cross-session learning arc for the free reports drill-down.
 * Mirrors useWordMasteryTrend: loading -> arc | error, plus `refresh`.
 */
export function useStudentArc({ classroomId, studentId }: UseStudentArcOptions): UseStudentArcReturn {
  const isMounted = useMounted();
  const [state, setState] = useState<State>({ arc: null, isLoading: true, error: null });

  const fetchArc = useCallback(async () => {
    if (!classroomId || !studentId) {
      setState({ arc: null, isLoading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error } = await getStudentMasterySeries(classroomId, studentId);
      if (!isMounted.current) return;
      if (error) {
        setState({ arc: null, isLoading: false, error: new Error(error.message) });
        return;
      }
      setState({ arc: data, isLoading: false, error: null });
    } catch (err) {
      logger.error('Error fetching student arc:', err);
      if (isMounted.current) {
        setState({
          arc: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load student arc'),
        });
      }
    }
  }, [classroomId, studentId, isMounted]);

  useEffect(() => {
    fetchArc();
  }, [fetchArc]);

  const refresh = useCallback(async () => {
    await fetchArc();
  }, [fetchArc]);

  return { ...state, refresh };
}

export default useStudentArc;
