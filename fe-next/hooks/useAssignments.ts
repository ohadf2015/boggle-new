'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getClassroomAssignments,
  createAssignment as createAssignmentAPI,
  deleteAssignment as deleteAssignmentAPI,
} from '@/lib/supabase/education/assignments';
import type { TeacherAssignment, AssignmentStatus, AssignmentType } from '@/lib/supabase/education/types';
import type { PracticeFocusSetting } from '@/lib/education/vocabFocus';
import logger from '@/utils/logger';

interface UseAssignmentsState {
  assignments: TeacherAssignment[];
  isLoading: boolean;
  error: string | null;
}

interface UseAssignmentsActions {
  createAssignment: (data: {
    classroom_id: string;
    lesson_id: string;
    teacher_id: string;
    assignment_type?: AssignmentType;
    due_date?: string | null;
    title?: string | null;
    instructions?: string | null;
    practice_focus?: PracticeFocusSetting | null;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  refresh: () => Promise<void>;
  getAssignmentStatus: (assignment: TeacherAssignment) => AssignmentStatus;
}

export type UseAssignmentsReturn = UseAssignmentsState & UseAssignmentsActions;

/**
 * Hook for managing teacher assignments
 *
 * Provides:
 * - Reactive assignment list with completion stats
 * - Optimistic updates for create/delete operations
 * - Assignment status computation (active/overdue/completed)
 * - Manual refresh capability
 */
export function useAssignments(classroomId: string | null): UseAssignmentsReturn {
  const [state, setState] = useState<UseAssignmentsState>({
    assignments: [],
    isLoading: false,
    error: null,
  });

  const fetchAssignments = useCallback(async () => {
    if (!classroomId) {
      setState({ assignments: [], isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await getClassroomAssignments(classroomId);

      if (error) {
        setState({ assignments: [], isLoading: false, error: error.message });
        return;
      }

      setState({ assignments: data, isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch assignments';
      logger.error('Exception in fetchAssignments:', error);
      setState({ assignments: [], isLoading: false, error });
    }
  }, [classroomId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = useCallback(
    async (data: {
      classroom_id: string;
      lesson_id: string;
      teacher_id: string;
      assignment_type?: AssignmentType;
      due_date?: string | null;
      title?: string | null;
      instructions?: string | null;
      practice_focus?: PracticeFocusSetting | null;
    }): Promise<{ success: boolean; error?: string }> => {
      // Optimistic update: add temporary assignment
      const tempId = `temp-${Date.now()}`;
      const optimisticAssignment: TeacherAssignment = {
        id: tempId,
        classroom_id: data.classroom_id,
        lesson_id: data.lesson_id,
        teacher_id: data.teacher_id,
        assignment_type: data.assignment_type || 'practice',
        due_date: data.due_date || null,
        title: data.title || null,
        instructions: data.instructions || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completion_count: 0,
        student_count: 0,
      };

      setState(prev => ({
        ...prev,
        assignments: [optimisticAssignment, ...prev.assignments],
      }));

      try {
        const { data: newAssignment, error } = await createAssignmentAPI(data);

        if (error) {
          // Rollback optimistic update
          setState(prev => ({
            ...prev,
            assignments: prev.assignments.filter(a => a.id !== tempId),
          }));
          return { success: false, error: error.message };
        }

        // Replace temp with real assignment
        setState(prev => ({
          ...prev,
          assignments: prev.assignments.map(a =>
            a.id === tempId
              ? ({ ...newAssignment, completion_count: 0, student_count: 0 } as TeacherAssignment)
              : a
          ),
        }));

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to create assignment';
        logger.error('Exception in createAssignment:', error);

        // Rollback optimistic update
        setState(prev => ({
          ...prev,
          assignments: prev.assignments.filter(a => a.id !== tempId),
        }));

        return { success: false, error };
      }
    },
    []
  );

  const deleteAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    // Optimistic update: remove immediately
    setState(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== assignmentId),
    }));

    try {
      const { error } = await deleteAssignmentAPI(assignmentId);

      if (error) {
        logger.error('Error deleting assignment:', error.message);
        // Optionally: rollback by refetching
        // For now, we keep the optimistic update even on error
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete assignment';
      logger.error('Exception in deleteAssignment:', error);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchAssignments();
  }, [fetchAssignments]);

  const getAssignmentStatus = useCallback(
    (assignment: TeacherAssignment): AssignmentStatus => {
      // Check if all students have completed
      if (
        assignment.completion_count !== undefined &&
        assignment.student_count !== undefined &&
        assignment.completion_count >= assignment.student_count &&
        assignment.student_count > 0
      ) {
        return 'completed';
      }

      // Check if overdue
      if (assignment.due_date) {
        const now = new Date();
        const dueDate = new Date(assignment.due_date);
        if (dueDate < now) {
          return 'overdue';
        }
      }

      // Default to active
      return 'active';
    },
    []
  );

  return {
    ...state,
    createAssignment,
    deleteAssignment,
    refresh,
    getAssignmentStatus,
  };
}
