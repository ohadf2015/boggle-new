'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import {
  getLessons,
  getLesson,
  createLesson as createLessonAPI,
  updateLesson as updateLessonAPI,
  deleteLesson as deleteLessonAPI,
  type VocabularyLesson,
  type VocabularyWord,
  type Language,
} from '@/lib/supabase/education';
import logger from '@/utils/logger';

interface UseLessonsState {
  lessons: VocabularyLesson[];
  isLoading: boolean;
  error: string | null;
}

interface UseLessonsActions {
  refresh: () => Promise<void>;
  createLesson: (data: {
    name: string;
    description?: string;
    language: Language;
    words: VocabularyWord[];
    classroomId?: string;
    isPublic?: boolean;
    sourceGameCode?: string;
  }) => Promise<{ success: boolean; data?: VocabularyLesson; error?: string }>;
  updateLesson: (id: string, updates: Partial<{
    name: string;
    description: string | null;
    words: VocabularyWord[];
    classroomId: string | null;
    isPublic: boolean;
  }>) => Promise<{ success: boolean; error?: string }>;
  deleteLesson: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export type UseLessonsReturn = UseLessonsState & UseLessonsActions;

/**
 * Hook for managing vocabulary lessons
 *
 * Provides:
 * - List of lessons for a teacher (optionally filtered by classroom)
 * - Create/update/delete operations
 * - Automatic refresh on auth state change
 */
export function useLessons(classroomId?: string): UseLessonsReturn {
  const { isAuthenticated, user } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UseLessonsState>({
    lessons: [],
    isLoading: true,
    error: null,
  });

  // Fetch all lessons for the current teacher
  const fetchLessons = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        lessons: [],
        isLoading: false,
      }));
      return;
    }

    try {
      const { data, error } = await getLessons(user.id, classroomId);

      if (isMounted.current) {
        setState({
          lessons: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching lessons:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load lessons',
        }));
      }
    }
  }, [isAuthenticated, user, classroomId, isMounted]);

  // Refresh lesson list
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchLessons();
  }, [fetchLessons]);

  // Create new lesson
  const createLesson = useCallback(async (data: {
    name: string;
    description?: string;
    language: Language;
    words: VocabularyWord[];
    classroomId?: string;
    isPublic?: boolean;
    sourceGameCode?: string;
  }): Promise<{ success: boolean; data?: VocabularyLesson; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data: lesson, error } = await createLessonAPI({
        teacher_id: user.id,
        classroom_id: data.classroomId || null,
        name: data.name,
        description: data.description || null,
        language: data.language,
        words: data.words,
        is_public: data.isPublic || false,
        source_game_code: data.sourceGameCode || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current && lesson) {
        setState(prev => ({
          ...prev,
          lessons: [lesson, ...prev.lessons],
        }));
      }

      return { success: true, data: lesson || undefined };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create lesson';
      logger.error('Exception in createLesson:', error);
      return { success: false, error };
    }
  }, [user, isMounted]);

  // Update lesson
  const updateLesson = useCallback(async (
    id: string,
    updates: Partial<{
      name: string;
      description: string | null;
      words: VocabularyWord[];
      classroomId: string | null;
      isPublic: boolean;
    }>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Map friendly names to database column names
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.words !== undefined) dbUpdates.words = updates.words;
      if (updates.classroomId !== undefined) dbUpdates.classroom_id = updates.classroomId;
      if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;

      const { error } = await updateLessonAPI(id, dbUpdates);

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          lessons: prev.lessons.map(l =>
            l.id === id
              ? {
                  ...l,
                  ...(updates.name !== undefined && { name: updates.name }),
                  ...(updates.description !== undefined && { description: updates.description }),
                  ...(updates.words !== undefined && { words: updates.words }),
                  ...(updates.classroomId !== undefined && { classroom_id: updates.classroomId }),
                  ...(updates.isPublic !== undefined && { is_public: updates.isPublic }),
                }
              : l
          ),
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update lesson';
      logger.error('Exception in updateLesson:', error);
      return { success: false, error };
    }
  }, [isMounted]);

  // Delete lesson
  const deleteLesson = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await deleteLessonAPI(id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          lessons: prev.lessons.filter(l => l.id !== id),
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete lesson';
      logger.error('Exception in deleteLesson:', error);
      return { success: false, error };
    }
  }, [isMounted]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchLessons();
    } else {
      setState({
        lessons: [],
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, fetchLessons]);

  return {
    ...state,
    refresh,
    createLesson,
    updateLesson,
    deleteLesson,
  };
}

// =============================================
// SINGLE LESSON HOOK
// =============================================

interface UseLessonState {
  lesson: VocabularyLesson | null;
  isLoading: boolean;
  error: string | null;
}

interface UseLessonActions {
  refresh: () => Promise<void>;
  update: (updates: Partial<{
    name: string;
    description: string | null;
    words: VocabularyWord[];
    classroomId: string | null;
    isPublic: boolean;
  }>) => Promise<{ success: boolean; error?: string }>;
  addWords: (words: VocabularyWord[]) => Promise<{ success: boolean; error?: string }>;
  deleteLesson: () => Promise<{ success: boolean; error?: string }>;
}

export type UseLessonReturn = UseLessonState & UseLessonActions;

/**
 * Hook for managing a single vocabulary lesson
 *
 * Provides:
 * - Lesson details
 * - Update/delete operations
 * - Add words operation (for post-game word selection)
 * - Auto-refresh on mount
 */
export function useLesson(lessonId: string | undefined): UseLessonReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<UseLessonState>({
    lesson: null,
    isLoading: true,
    error: null,
  });

  // Fetch lesson details
  const fetchLesson = useCallback(async () => {
    if (!lessonId) {
      setState({
        lesson: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await getLesson(lessonId);

      if (isMounted.current) {
        setState({
          lesson: data,
          isLoading: false,
          error: error ? error.message : null,
        });
      }
    } catch (err) {
      logger.error('Error fetching lesson:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load lesson',
        }));
      }
    }
  }, [lessonId, isMounted]);

  // Refresh lesson
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchLesson();
  }, [fetchLesson]);

  // Update lesson
  const update = useCallback(async (
    updates: Partial<{
      name: string;
      description: string | null;
      words: VocabularyWord[];
      classroomId: string | null;
      isPublic: boolean;
    }>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!lessonId) {
      return { success: false, error: 'No lesson ID' };
    }

    try {
      // Map friendly names to database column names
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.words !== undefined) dbUpdates.words = updates.words;
      if (updates.classroomId !== undefined) dbUpdates.classroom_id = updates.classroomId;
      if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;

      const { error } = await updateLessonAPI(lessonId, dbUpdates);

      if (error) {
        return { success: false, error: error.message };
      }

      // Optimistically update state
      if (isMounted.current && state.lesson) {
        setState(prev => ({
          ...prev,
          lesson: prev.lesson
            ? {
                ...prev.lesson,
                ...(updates.name !== undefined && { name: updates.name }),
                ...(updates.description !== undefined && { description: updates.description }),
                ...(updates.words !== undefined && { words: updates.words }),
                ...(updates.classroomId !== undefined && { classroom_id: updates.classroomId }),
                ...(updates.isPublic !== undefined && { is_public: updates.isPublic }),
              }
            : null,
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update lesson';
      logger.error('Exception in update:', error);
      return { success: false, error };
    }
  }, [lessonId, isMounted, state.lesson]);

  // Add words to lesson (for post-game word selection)
  const addWords = useCallback(async (
    newWords: VocabularyWord[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!lessonId || !state.lesson) {
      return { success: false, error: 'No lesson loaded' };
    }

    // Merge new words with existing, avoiding duplicates
    const existingWords = state.lesson.words || [];
    const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));
    const uniqueNewWords = newWords.filter(w => !existingWordSet.has(w.word.toLowerCase()));
    const updatedWords = [...existingWords, ...uniqueNewWords];

    return update({ words: updatedWords });
  }, [lessonId, state.lesson, update]);

  // Delete lesson
  const deleteLesson = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!lessonId) {
      return { success: false, error: 'No lesson ID' };
    }

    try {
      const { error } = await deleteLessonAPI(lessonId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear state after deletion
      if (isMounted.current) {
        setState({
          lesson: null,
          isLoading: false,
          error: null,
        });
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete lesson';
      logger.error('Exception in deleteLesson:', error);
      return { success: false, error };
    }
  }, [lessonId, isMounted]);

  // Initial fetch
  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  return {
    ...state,
    refresh,
    update,
    addWords,
    deleteLesson,
  };
}
