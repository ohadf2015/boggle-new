'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import {
  getClassrooms,
  getClassroom,
  createClassroom as createClassroomAPI,
  updateClassroom as updateClassroomAPI,
  deleteClassroom as deleteClassroomAPI,
  joinClassroom as joinClassroomAPI,
  type ClassroomWithMembers,
  type Classroom,
  type Language,
} from '@/lib/supabase/education';
import logger from '@/utils/logger';

interface UseClassroomsState {
  classrooms: ClassroomWithMembers[];
  isLoading: boolean;
  error: string | null;
}

interface UseClassroomsActions {
  refresh: () => Promise<void>;
  createClassroom: (name: string, language: Language) => Promise<{ success: boolean; data?: Classroom; error?: string }>;
  updateClassroom: (id: string, updates: { name?: string; language?: Language }) => Promise<{ success: boolean; error?: string }>;
  deleteClassroom: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export type UseClassroomsReturn = UseClassroomsState & UseClassroomsActions;

/**
 * Hook for managing teacher's classrooms
 *
 * Provides:
 * - List of classrooms with member counts
 * - Create/update/delete operations
 * - Automatic refresh on auth state change
 */
export function useClassrooms(): UseClassroomsReturn {
  const { isAuthenticated, user } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UseClassroomsState>({
    classrooms: [],
    isLoading: true,
    error: null,
  });

  // Fetch all classrooms for the current teacher
  const fetchClassrooms = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        classrooms: [],
        isLoading: false,
      }));
      return;
    }

    try {
      const { data, error } = await getClassrooms(user.id);

      if (isMounted.current) {
        setState({
          classrooms: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching classrooms:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load classrooms',
        }));
      }
    }
  }, [isAuthenticated, user, isMounted]);

  // Refresh classroom list
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchClassrooms();
  }, [fetchClassrooms]);

  // Create new classroom
  const createClassroom = useCallback(async (
    name: string,
    language: Language
  ): Promise<{ success: boolean; data?: Classroom; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await createClassroomAPI({
        teacher_id: user.id,
        name,
        language,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current && data) {
        setState(prev => ({
          ...prev,
          classrooms: [{ ...data, member_count: 0 }, ...prev.classrooms],
        }));
      }

      return { success: true, data: data || undefined };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create classroom';
      logger.error('Exception in createClassroom:', error);
      return { success: false, error };
    }
  }, [user, isMounted]);

  // Update classroom
  const updateClassroom = useCallback(async (
    id: string,
    updates: { name?: string; language?: Language }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await updateClassroomAPI(id, updates);

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          classrooms: prev.classrooms.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update classroom';
      logger.error('Exception in updateClassroom:', error);
      return { success: false, error };
    }
  }, [isMounted]);

  // Delete classroom
  const deleteClassroom = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await deleteClassroomAPI(id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          classrooms: prev.classrooms.filter(c => c.id !== id),
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete classroom';
      logger.error('Exception in deleteClassroom:', error);
      return { success: false, error };
    }
  }, [isMounted]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchClassrooms();
    } else {
      setState({
        classrooms: [],
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, fetchClassrooms]);

  return {
    ...state,
    refresh,
    createClassroom,
    updateClassroom,
    deleteClassroom,
  };
}

// =============================================
// SINGLE CLASSROOM HOOK
// =============================================

interface UseClassroomState {
  classroom: ClassroomWithMembers | null;
  isLoading: boolean;
  error: string | null;
}

interface UseClassroomActions {
  refresh: () => Promise<void>;
  update: (updates: { name?: string; language?: Language }) => Promise<{ success: boolean; error?: string }>;
  deleteClassroom: () => Promise<{ success: boolean; error?: string }>;
}

export type UseClassroomReturn = UseClassroomState & UseClassroomActions;

/**
 * Hook for managing a single classroom
 *
 * Provides:
 * - Classroom details with member count
 * - Update/delete operations
 * - Auto-refresh on mount
 */
export function useClassroom(classroomId: string | undefined): UseClassroomReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<UseClassroomState>({
    classroom: null,
    isLoading: true,
    error: null,
  });

  // Fetch classroom details
  const fetchClassroom = useCallback(async () => {
    if (!classroomId) {
      setState({
        classroom: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await getClassroom(classroomId);

      if (isMounted.current) {
        setState({
          classroom: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching classroom:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load classroom',
        }));
      }
    }
  }, [classroomId, isMounted]);

  // Refresh classroom
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchClassroom();
  }, [fetchClassroom]);

  // Update classroom
  const update = useCallback(async (
    updates: { name?: string; language?: Language }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!classroomId) {
      return { success: false, error: 'No classroom ID' };
    }

    try {
      const { error } = await updateClassroomAPI(classroomId, updates);

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current && state.classroom) {
        setState(prev => ({
          ...prev,
          classroom: prev.classroom ? { ...prev.classroom, ...updates } : null,
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update classroom';
      logger.error('Exception in update:', error);
      return { success: false, error };
    }
  }, [classroomId, isMounted, state.classroom]);

  // Delete classroom
  const deleteClassroom = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!classroomId) {
      return { success: false, error: 'No classroom ID' };
    }

    try {
      const { error } = await deleteClassroomAPI(classroomId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear state after deletion
      if (isMounted.current) {
        setState({
          classroom: null,
          isLoading: false,
          error: null,
        });
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete classroom';
      logger.error('Exception in deleteClassroom:', error);
      return { success: false, error };
    }
  }, [classroomId, isMounted]);

  // Initial fetch
  useEffect(() => {
    fetchClassroom();
  }, [fetchClassroom]);

  return {
    ...state,
    refresh,
    update,
    deleteClassroom,
  };
}

// =============================================
// JOIN CLASSROOM HOOK (FOR STUDENTS)
// =============================================

/**
 * Hook for students to join a classroom
 */
export function useJoinClassroom() {
  const { user } = useAuth();

  const joinClassroom = useCallback(async (
    joinCode: string
  ): Promise<{ success: boolean; classroomId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await joinClassroomAPI(joinCode, user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, classroomId: data?.classroom_id };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to join classroom';
      logger.error('Exception in joinClassroom:', error);
      return { success: false, error };
    }
  }, [user]);

  return { joinClassroom };
}
