'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { assignLesson as assignLessonAPI } from '@/lib/supabase/education';
import logger from '@/utils/logger';

interface AssignLessonState {
  isAssigning: boolean;
  error: string | null;
}

interface AssignLessonActions {
  assignLesson: (
    lessonId: string,
    classroomId: string,
    dueDate?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export type UseAssignLessonReturn = AssignLessonState & AssignLessonActions;

/**
 * Hook for assigning lessons to classrooms
 *
 * Provides:
 * - Assignment operation with loading state
 * - Error handling for duplicate assignments
 */
export function useAssignLesson(): UseAssignLessonReturn {
  const { user } = useAuth();
  const [state, setState] = useState<AssignLessonState>({
    isAssigning: false,
    error: null,
  });

  const assignLesson = useCallback(
    async (
      lessonId: string,
      classroomId: string,
      dueDate?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      setState({ isAssigning: true, error: null });

      try {
        const { data, error } = await assignLessonAPI(
          lessonId,
          classroomId,
          dueDate
        );

        if (error) {
          setState({ isAssigning: false, error: error.message });
          // Check for duplicate assignment error
          if (error.message.includes('duplicate') || error.message.includes('already')) {
            return { success: false, error: 'already_assigned' };
          }
          return { success: false, error: error.message };
        }

        setState({ isAssigning: false, error: null });
        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to assign lesson';
        logger.error('Exception in assignLesson:', error);
        setState({ isAssigning: false, error });
        return { success: false, error };
      }
    },
    [user]
  );

  return {
    ...state,
    assignLesson,
  };
}
