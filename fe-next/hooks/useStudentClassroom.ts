'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import { getStudentClassroom, type Classroom } from '@/lib/supabase/teacher';
import logger from '@/utils/logger';

interface UseStudentClassroomState {
  classroom: Classroom | null;
  classroomId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseStudentClassroomActions {
  refresh: () => Promise<void>;
}

export type UseStudentClassroomReturn = UseStudentClassroomState & UseStudentClassroomActions;

/**
 * Hook for getting the student's classroom from their membership
 *
 * This fetches the classroom directly from classroom_memberships,
 * independent of whether any lessons have been assigned.
 *
 * Use this instead of relying on lessons[0].classroomId which only
 * works when lessons have been assigned to the student.
 */
export function useStudentClassroom(): UseStudentClassroomReturn {
  const { isAuthenticated, user } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UseStudentClassroomState>({
    classroom: null,
    classroomId: null,
    isLoading: true,
    error: null,
  });

  // Fetch student's classroom
  const fetchClassroom = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState({
        classroom: null,
        classroomId: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await getStudentClassroom(user.id);

      if (isMounted.current) {
        if (error) {
          setState({
            classroom: null,
            classroomId: null,
            isLoading: false,
            error: error.message,
          });
        } else {
          setState({
            classroom: data,
            classroomId: data?.id || null,
            isLoading: false,
            error: null,
          });
        }
      }
    } catch (err) {
      logger.error('Error in useStudentClassroom:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load classroom',
        }));
      }
    }
  }, [isAuthenticated, user, isMounted]);

  // Refresh function
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchClassroom();
  }, [fetchClassroom]);

  // Initial fetch on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchClassroom();
    } else {
      setState({
        classroom: null,
        classroomId: null,
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, fetchClassroom]);

  return {
    ...state,
    refresh,
  };
}
