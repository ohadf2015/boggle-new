'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import { getStudentClassroom, type Classroom } from '@/lib/supabase/education';
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

const INITIAL_STATE: UseStudentClassroomState = {
  classroom: null,
  classroomId: null,
  isLoading: true,
  error: null,
};

const EMPTY_STATE: UseStudentClassroomState = {
  classroom: null,
  classroomId: null,
  isLoading: false,
  error: null,
};

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

  const [state, setState] = useState<UseStudentClassroomState>(INITIAL_STATE);

  const fetchClassroom = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState(EMPTY_STATE);
      return;
    }

    try {
      const { data, error } = await getStudentClassroom(user.id);

      if (isMounted.current) {
        if (error) {
          setState({ ...EMPTY_STATE, error: error.message });
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
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to load classroom' }));
      }
    }
  }, [isAuthenticated, user, isMounted]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchClassroom();
  }, [fetchClassroom]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClassroom();
    } else {
      setState(EMPTY_STATE);
    }
  }, [isAuthenticated, fetchClassroom]);

  return {
    ...state,
    refresh,
  };
}
