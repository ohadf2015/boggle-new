'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import {
  getStudentProgress,
  getStudentAssignedLessons,
  getClassProgress,
  updateProgress as updateProgressAPI,
  type StudentLessonProgress,
  type LessonAssignment,
  type VocabularyLesson,
} from '@/lib/supabase/education';
import logger from '@/utils/logger';

export { useLessonStats, type UseLessonStatsReturn } from './useLessonStats';

// Student lesson with status
export interface StudentLesson {
  lessonId: string;
  status: 'assigned' | 'started' | 'completed';
  progress?: StudentLessonProgress;
  assignment?: LessonAssignment;
  lesson?: VocabularyLesson;
  classroomId?: string;
  assignedAt?: string;
  dueDate?: string | null;
}

interface UseStudentProgressState {
  progress: StudentLessonProgress[]; // Legacy - keep for backward compat
  lessons: StudentLesson[];
  isLoading: boolean;
  error: string | null;
}

interface UseStudentProgressActions {
  refresh: () => Promise<void>;
  recordAttempt: (lessonId: string, word: string, correct: boolean) => Promise<{ success: boolean; error?: string }>;
}

export type UseStudentProgressReturn = UseStudentProgressState & UseStudentProgressActions;

/**
 * Hook for tracking student's lesson progress (enhanced with assignments)
 *
 * Provides:
 * - Combined list of assigned and started lessons
 * - Status for each lesson: assigned | started | completed
 * - Record word attempt operation
 * - Automatic refresh on auth state change
 */
export function useStudentProgress(lessonId?: string): UseStudentProgressReturn {
  const { isAuthenticated, user } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UseStudentProgressState>({
    progress: [],
    lessons: [],
    isLoading: true,
    error: null,
  });

  // Fetch student progress and assignments
  const fetchProgress = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        progress: [],
        lessons: [],
        isLoading: false,
      }));
      return;
    }

    try {
      // Fetch both progress and assignments in parallel
      const [progressResult, assignmentsResult] = await Promise.all([
        getStudentProgress(user.id, lessonId),
        getStudentAssignedLessons(user.id)
      ]);

      if (progressResult.error || assignmentsResult.error) {
        const errorMsg = progressResult.error?.message || assignmentsResult.error?.message;
        if (isMounted.current) {
          setState({
            progress: [],
            lessons: [],
            isLoading: false,
            error: errorMsg || 'Failed to load lessons',
          });
        }
        return;
      }

      // Combine progress and assignments
      const progressData = progressResult.data || [];
      const assignmentsData = assignmentsResult.data || [];

      // Create a map of lesson_id -> progress
      const progressMap = new Map<string, StudentLessonProgress>();
      progressData.forEach(p => {
        progressMap.set(p.lesson_id, p);
      });

      // Create a map of lesson_id -> assignment
      const assignmentMap = new Map<string, LessonAssignment>();
      assignmentsData.forEach(a => {
        if (a.lesson_id) {
          assignmentMap.set(a.lesson_id, a);
        }
      });

      // Combine into StudentLesson array
      const combinedLessons: StudentLesson[] = [];

      // Add all progress records (started or completed)
      progressData.forEach(progress => {
        const assignment = assignmentMap.get(progress.lesson_id);
        const status: 'started' | 'completed' = progress.completed_at ? 'completed' : 'started';

        combinedLessons.push({
          lessonId: progress.lesson_id,
          status,
          progress,
          assignment,
          lesson: assignment?.vocabulary_lessons,
          classroomId: assignment?.classroom_id,
          assignedAt: assignment?.created_at,
          dueDate: assignment?.due_date
        });

        // Remove from assignment map to avoid duplication
        assignmentMap.delete(progress.lesson_id);
      });

      // Add remaining assignments (assigned but not started)
      assignmentMap.forEach(assignment => {
        combinedLessons.push({
          lessonId: assignment.lesson_id,
          status: 'assigned',
          assignment,
          lesson: assignment.vocabulary_lessons,
          classroomId: assignment.classroom_id,
          assignedAt: assignment.created_at,
          dueDate: assignment.due_date
        });
      });

      // Sort: assigned first, then started, then completed
      const statusOrder = { assigned: 0, started: 1, completed: 2 };
      combinedLessons.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

      if (isMounted.current) {
        setState({
          progress: progressData,
          lessons: combinedLessons,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      logger.error('Error fetching student progress:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load progress',
        }));
      }
    }
  }, [isAuthenticated, user, lessonId, isMounted]);

  // Refresh progress
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchProgress();
  }, [fetchProgress]);

  // Record word attempt
  const recordAttempt = useCallback(async (
    targetLessonId: string,
    word: string,
    correct: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await updateProgressAPI(user.id, targetLessonId, { word, correct });

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current && data) {
        setState(prev => {
          const existingIndex = prev.progress.findIndex(
            p => p.lesson_id === targetLessonId
          );

          if (existingIndex >= 0) {
            // Update existing progress
            const updated = [...prev.progress];
            updated[existingIndex] = data;
            return { ...prev, progress: updated };
          } else {
            // Add new progress
            return { ...prev, progress: [data, ...prev.progress] };
          }
        });
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to record attempt';
      logger.error('Exception in recordAttempt:', error);
      return { success: false, error };
    }
  }, [user, isMounted]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchProgress();
    } else {
      setState({
        progress: [],
        lessons: [],
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, fetchProgress]);

  return {
    ...state,
    refresh,
    recordAttempt,
  };
}

// =============================================
// CLASS PROGRESS HOOK (FOR TEACHERS)
// =============================================

interface UseClassProgressState {
  progress: StudentLessonProgress[];
  isLoading: boolean;
  error: string | null;
}

interface UseClassProgressActions {
  refresh: () => Promise<void>;
}

export type UseClassProgressReturn = UseClassProgressState & UseClassProgressActions;

/**
 * Hook for viewing progress of all students in a classroom for a specific lesson
 *
 * Provides:
 * - List of progress records for all students in classroom
 * - Automatic refresh on mount
 */
export function useClassProgress(
  classroomId: string | undefined,
  lessonId: string
): UseClassProgressReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<UseClassProgressState>({
    progress: [],
    isLoading: true,
    error: null,
  });

  // Fetch class progress
  const fetchProgress = useCallback(async () => {
    if (!classroomId) {
      setState({
        progress: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await getClassProgress(classroomId, lessonId);

      if (isMounted.current) {
        setState({
          progress: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching class progress:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load class progress',
        }));
      }
    }
  }, [classroomId, lessonId, isMounted]);

  // Refresh progress
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchProgress();
  }, [fetchProgress]);

  // Initial fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    ...state,
    refresh,
  };
}
