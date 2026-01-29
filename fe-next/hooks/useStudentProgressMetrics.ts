import { useState, useEffect, useCallback, useRef } from 'react';
import { getStudentsProgressSummary, type StudentProgressSummary } from '@/lib/supabase/analytics';

export interface UseStudentProgressMetricsOptions {
  classroomId: string;
}

export interface UseStudentProgressMetricsReturn {
  students: StudentProgressSummary[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage student progress metrics for a classroom
 *
 * @param options - Hook options with classroomId
 * @returns Student progress metrics state
 */
export function useStudentProgressMetrics(
  options: UseStudentProgressMetricsOptions
): UseStudentProgressMetricsReturn {
  const { classroomId } = options;

  const [students, setStudents] = useState<StudentProgressSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchStudentProgress = useCallback(async () => {
    if (!classroomId) {
      setIsLoading(false);
      setStudents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getStudentsProgressSummary(classroomId);

    if (!isMountedRef.current) return;

    if (fetchError) {
      setError(new Error(fetchError.message));
      setStudents([]);
    } else {
      setStudents(data);
    }

    setIsLoading(false);
  }, [classroomId]);

  const refresh = useCallback(async () => {
    await fetchStudentProgress();
  }, [fetchStudentProgress]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStudentProgress();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStudentProgress]);

  return {
    students,
    isLoading,
    error,
    refresh,
  };
}
