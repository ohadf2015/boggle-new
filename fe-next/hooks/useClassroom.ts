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
import { createClient } from '@/utils/supabase/client';
import { signInAsGuestStudent, waitForProfile } from '@/lib/education/guestStudent';
import logger from '@/utils/logger';

interface UseClassroomsState {
  classrooms: ClassroomWithMembers[];
  isLoading: boolean;
  error: string | null;
}

interface UseClassroomsActions {
  refresh: () => Promise<void>;
  createClassroom: (name: string, language: Language) => Promise<{ success: boolean; data?: Classroom; error?: string; code?: string; currentCount?: number; limit?: number | null }>;
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

  // Create new classroom (calls server-side API route for enforcement)
  const createClassroom = useCallback(async (
    name: string,
    language: Language
  ): Promise<{ success: boolean; data?: Classroom; error?: string; code?: string; currentCount?: number; limit?: number | null }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Call server-side API route which enforces subscription limits
      const response = await fetch('/api/education/classroom/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, language }),
      });

      if (response.status === 403) {
        const data = await response.json();
        return {
          success: false,
          error: data.message || 'Classroom limit reached. Upgrade to Pro for unlimited classrooms.',
          code: data.error,
          currentCount: data.currentCount,
          limit: data.limit,
        };
      }

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to create classroom' };
      }

      const { data: classroom } = await response.json();

      // Optimistically update state
      if (isMounted.current && classroom) {
        setState(prev => ({
          ...prev,
          classrooms: [{ ...classroom, member_count: 0 }, ...prev.classrooms],
        }));
      }

      return { success: true, data: classroom };
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
    joinCode: string,
    options?: { guestName?: string }
  ): Promise<{ success: boolean; classroomId?: string; error?: string }> => {
    try {
      // Account-less path: a logged-out student who supplied a name joins as an
      // anonymous guest. We mint the anon identity and await the trigger-created
      // profile (race-safe) BEFORE joining, so the server route sees an
      // authenticated session. Without a name we keep the not-authenticated guard.
      if (!user?.id) {
        const guestName = options?.guestName?.trim();
        if (!guestName) {
          return { success: false, error: 'Not authenticated' };
        }
        const supabase = createClient();
        const guest = await signInAsGuestStudent(supabase, guestName);
        if (guest.error || !guest.user) {
          return { success: false, error: guest.error || 'Failed to start guest session' };
        }
        await waitForProfile(supabase, guest.user.id);
      }

      // Server-side API route enforces the free-tier student cap and reads the
      // (now authenticated, possibly guest) session to identify the student.
      const response = await fetch('/api/education/classroom/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode,
          guestName: options?.guestName,
        }),
      });

      if (response.status === 403) {
        const data = await response.json();
        // Don't show upgrade message to students joining - it's not in their control
        return {
          success: false,
          error: data.message || 'This classroom has reached its capacity. Please contact your teacher.',
        };
      }

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to join classroom' };
      }

      const { classroomId } = await response.json();

      return { success: true, classroomId };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to join classroom';
      logger.error('Exception in joinClassroom:', error);
      return { success: false, error };
    }
  }, [user]);

  return { joinClassroom };
}
