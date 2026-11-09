'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import type { Classroom } from '@/lib/supabase/education';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import logger from '@/utils/logger';

interface UseStudentClassroomState {
  classroom: Classroom | null;
  classroomId: string | null;
  /**
   * The student's differentiation tier in this classroom (their own membership row).
   * 'core' until loaded and whenever unknown — pessimistic default, never hides words.
   */
  level: VocabularyLevel;
  isLoading: boolean;
  error: string | null;
  /** Every class the student is in, newest first. Empty when unknown or on a failed read. */
  classrooms: { id: string; name: string }[];
}

interface UseStudentClassroomActions {
  refresh: () => Promise<void>;
  /** Switch the active class; the choice is remembered on this device. */
  selectClassroom: (id: string) => Promise<void>;
}

const storageKey = (userId: string) => `lc.student.classroom.${userId}`;

function readPreferred(userId: string): string | null {
  try { return localStorage.getItem(storageKey(userId)); } catch { return null; }
}

export type UseStudentClassroomReturn = UseStudentClassroomState & UseStudentClassroomActions;

const INITIAL_STATE: UseStudentClassroomState = {
  classroom: null,
  classroomId: null,
  level: 'core',
  isLoading: true,
  error: null,
  classrooms: [],
};

const EMPTY_STATE: UseStudentClassroomState = {
  classroom: null,
  classroomId: null,
  level: 'core',
  isLoading: false,
  error: null,
  classrooms: [],
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
  const userId = user?.id ?? null;

  const [state, setState] = useState<UseStudentClassroomState>(INITIAL_STATE);
  const preferredRef = useRef<string | null>(null);

  const fetchClassroom = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setState(EMPTY_STATE);
      return;
    }

    try {
      const edu = await import('@/lib/supabase/education');
      if (preferredRef.current === null) preferredRef.current = readPreferred(userId) ?? '';
      const [{ data, level, error }, classrooms] = await Promise.all([
        edu.getStudentClassroom(userId, ...(preferredRef.current ? [preferredRef.current] : [])),
        // The switcher is optional: a failed list must not break the single-class flow.
        Promise.resolve()
          .then(() => edu.getStudentClassrooms(userId))
          .then((r) => (r.error ? [] : r.data))
          .catch(() => []),
      ]);

      if (isMounted.current) {
        if (error) {
          setState({ ...EMPTY_STATE, error: error.message });
        } else {
          setState({
            classroom: data,
            classroomId: data?.id || null,
            level: level ?? 'core',
            isLoading: false,
            error: null,
            classrooms,
          });
        }
      }
    } catch (err) {
      logger.error('Error in useStudentClassroom:', err);
      if (isMounted.current) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to load classroom' }));
      }
    }
  }, [isAuthenticated, userId, isMounted]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchClassroom();
  }, [fetchClassroom]);

  const selectClassroom = useCallback(async (id: string) => {
    if (userId) {
      try { localStorage.setItem(storageKey(userId), id); } catch { /* storage blocked: choice lasts this session */ }
    }
    preferredRef.current = id;
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchClassroom();
  }, [userId, fetchClassroom]);

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
    selectClassroom,
  };
}
