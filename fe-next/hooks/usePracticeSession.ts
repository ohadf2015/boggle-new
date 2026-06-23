'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import { getWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';

// Types
export type PracticeType = 'flashcard' | 'solo_board' | 'warmup' | 'word_list' | 'matching' | 'spelling' | 'blitz';
export type MasteryLevel = 'not_started' | 'started' | 'practicing' | 'mastered';

export interface PracticeSession {
  id: string;
  student_id: string;
  lesson_id: string;
  practice_type: PracticeType;
  cards_reviewed: number;
  cards_correct: number;
  words_found: string[];
  vocabulary_words_found: string[];
  total_score: number;
  time_spent_seconds: number;
  started_at: string;
  completed_at: string | null;
}

export interface PracticeProgress {
  student_id: string;
  lesson_id: string;
  total_flashcards_reviewed: number;
  total_flashcards_correct: number;
  total_practice_score: number;
  total_vocabulary_words_found: number;
  flashcard_sessions: number;
  solo_board_sessions: number;
  warmup_sessions: number;
  word_list_views: number;
  matching_sessions: number;
  spelling_sessions: number;
  blitz_sessions: number;
  total_practice_time_seconds: number;
  last_practice_at: string | null;
}

export interface StartSessionData {
  lessonId: string;
  practiceType: PracticeType;
}

export interface UpdateSessionData {
  cardsReviewed?: number;
  cardsCorrect?: number;
  wordsFound?: string[];
  vocabularyWordsFound?: string[];
  totalScore?: number;
  timeSpentSeconds?: number;
  completed?: boolean;
}

// API functions
async function fetchSessionsAPI(
  lessonId: string,
  studentId?: string
): Promise<{ sessions: PracticeSession[]; error?: string }> {
  try {
    let url = `/api/education/practice?lessonId=${lessonId}`;
    if (studentId) {
      url += `&studentId=${studentId}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return { sessions: [], error: data.error || 'Failed to fetch sessions' };
    }

    return { sessions: data.sessions || [] };
  } catch (err) {
    logger.error('Error fetching sessions:', err);
    return { sessions: [], error: 'Failed to fetch sessions' };
  }
}

async function fetchSessionAPI(sessionId: string): Promise<{ session: PracticeSession | null; error?: string }> {
  try {
    const response = await getWithAuth(`/api/education/practice?sessionId=${sessionId}`);
    const data = await response.json();

    if (!response.ok) {
      return { session: null, error: data.error || 'Session not found' };
    }

    return { session: data.session };
  } catch (err) {
    logger.error('Error fetching session:', err);
    return { session: null, error: 'Failed to fetch session' };
  }
}

async function fetchProgressAPI(
  lessonId: string,
  studentId?: string
): Promise<{ progress: PracticeProgress | null; mastery: MasteryLevel; error?: string }> {
  try {
    let url = `/api/education/practice?lessonId=${lessonId}&progress=true`;
    if (studentId) {
      url += `&studentId=${studentId}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return { progress: null, mastery: 'not_started', error: data.error || 'Failed to fetch progress' };
    }

    return {
      progress: data.progress,
      mastery: data.mastery || 'not_started',
    };
  } catch (err) {
    logger.error('Error fetching progress:', err);
    return { progress: null, mastery: 'not_started', error: 'Failed to fetch progress' };
  }
}

async function startSessionAPI(data: StartSessionData): Promise<{ session: PracticeSession | null; error?: string }> {
  try {
    const response = await fetch('/api/education/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
      return { session: null, error: result.error || 'Failed to start session' };
    }

    return { session: result.session };
  } catch (err) {
    logger.error('Error starting session:', err);
    return { session: null, error: 'Failed to start session' };
  }
}

async function updateSessionAPI(
  sessionId: string,
  data: UpdateSessionData
): Promise<{ session: PracticeSession | null; error?: string }> {
  try {
    const response = await fetch('/api/education/practice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...data }),
    });
    const result = await response.json();

    if (!response.ok) {
      return { session: null, error: result.error || 'Failed to update session' };
    }

    return { session: result.session };
  } catch (err) {
    logger.error('Error updating session:', err);
    return { session: null, error: 'Failed to update session' };
  }
}

// =============================================
// PRACTICE PROGRESS HOOK
// =============================================

interface UsePracticeProgressState {
  progress: PracticeProgress | null;
  mastery: MasteryLevel;
  sessions: PracticeSession[];
  isLoading: boolean;
  error: string | null;
}

interface UsePracticeProgressActions {
  refresh: () => Promise<void>;
  startSession: (practiceType: PracticeType) => Promise<{ success: boolean; session?: PracticeSession; error?: string }>;
}

export type UsePracticeProgressReturn = UsePracticeProgressState & UsePracticeProgressActions;

/**
 * Hook for managing practice progress for a lesson
 *
 * Provides:
 * - Aggregated progress stats
 * - Mastery level
 * - Session history
 * - Start new session
 */
export function usePracticeProgress(
  lessonId: string | undefined,
  studentId?: string // Optional: for teachers viewing student progress
): UsePracticeProgressReturn {
  const { isAuthenticated } = useAuth();
  const isMounted = useMounted();

  const [state, setState] = useState<UsePracticeProgressState>({
    progress: null,
    mastery: 'not_started',
    sessions: [],
    isLoading: true,
    error: null,
  });

  // Fetch progress and sessions
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !lessonId) {
      setState(prev => ({
        ...prev,
        progress: null,
        mastery: 'not_started',
        sessions: [],
        isLoading: false,
      }));
      return;
    }

    try {
      // Fetch both progress and sessions in parallel
      const [progressResult, sessionsResult] = await Promise.all([
        fetchProgressAPI(lessonId, studentId),
        fetchSessionsAPI(lessonId, studentId),
      ]);

      if (isMounted.current) {
        setState({
          progress: progressResult.progress,
          mastery: progressResult.mastery,
          sessions: sessionsResult.sessions,
          isLoading: false,
          error: progressResult.error || sessionsResult.error || null,
        });
      }
    } catch (err) {
      logger.error('Error fetching practice data:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load practice data',
        }));
      }
    }
  }, [isAuthenticated, lessonId, studentId, isMounted]);

  // Refresh data
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchData();
  }, [fetchData]);

  // Start new practice session
  const startSession = useCallback(async (
    practiceType: PracticeType
  ): Promise<{ success: boolean; session?: PracticeSession; error?: string }> => {
    if (!lessonId) {
      return { success: false, error: 'No lesson ID' };
    }

    try {
      const { session, error } = await startSessionAPI({ lessonId, practiceType });

      if (error || !session) {
        return { success: false, error: error || 'Failed to start session' };
      }

      // Optimistically add session to list
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          sessions: [session, ...prev.sessions],
        }));
      }

      return { success: true, session };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start session';
      logger.error('Exception in startSession:', error);
      return { success: false, error };
    }
  }, [lessonId, isMounted]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated && lessonId) {
      fetchData();
    } else {
      setState({
        progress: null,
        mastery: 'not_started',
        sessions: [],
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated, lessonId, fetchData]);

  return {
    ...state,
    refresh,
    startSession,
  };
}

// =============================================
// ACTIVE SESSION HOOK
// =============================================

interface UseActiveSessionState {
  session: PracticeSession | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface UseActiveSessionActions {
  updateProgress: (data: UpdateSessionData) => Promise<{ success: boolean; error?: string }>;
  completeSession: (finalData?: UpdateSessionData) => Promise<{ success: boolean; error?: string }>;
  incrementCards: (correct: boolean) => Promise<{ success: boolean; error?: string }>;
  addFoundWord: (word: string, isVocabularyWord?: boolean) => Promise<{ success: boolean; error?: string }>;
  updateTimeSpent: (seconds: number) => Promise<{ success: boolean; error?: string }>;
}

export type UseActiveSessionReturn = UseActiveSessionState & UseActiveSessionActions;

/**
 * Hook for managing an active practice session
 *
 * Provides:
 * - Session state
 * - Update progress operations
 * - Complete session operation
 * - Convenience methods for common updates
 */
export function useActiveSession(sessionId: string | undefined): UseActiveSessionReturn {
  const isMounted = useMounted();

  const [state, setState] = useState<UseActiveSessionState>({
    session: null,
    isLoading: true,
    isSaving: false,
    error: null,
  });

  // Fetch session details
  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setState({
        session: null,
        isLoading: false,
        isSaving: false,
        error: null,
      });
      return;
    }

    try {
      const { session, error } = await fetchSessionAPI(sessionId);

      if (isMounted.current) {
        setState({
          session,
          isLoading: false,
          isSaving: false,
          error: error || null,
        });
      }
    } catch (err) {
      logger.error('Error fetching session:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load session',
        }));
      }
    }
  }, [sessionId, isMounted]);

  // Update progress
  const updateProgress = useCallback(async (
    data: UpdateSessionData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!sessionId) {
      return { success: false, error: 'No session ID' };
    }

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      const { session, error } = await updateSessionAPI(sessionId, data);

      if (error) {
        if (isMounted.current) {
          setState(prev => ({ ...prev, isSaving: false }));
        }
        return { success: false, error };
      }

      // Update state with new session data
      if (isMounted.current && session) {
        setState(prev => ({
          ...prev,
          session,
          isSaving: false,
        }));
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update progress';
      logger.error('Exception in updateProgress:', error);
      if (isMounted.current) {
        setState(prev => ({ ...prev, isSaving: false }));
      }
      return { success: false, error };
    }
  }, [sessionId, isMounted]);

  // Complete session
  const completeSession = useCallback(async (
    finalData?: UpdateSessionData
  ): Promise<{ success: boolean; error?: string }> => {
    return updateProgress({ ...finalData, completed: true });
  }, [updateProgress]);

  // Convenience: Increment card count
  const incrementCards = useCallback(async (
    correct: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!state.session) {
      return { success: false, error: 'No active session' };
    }

    const newCardsReviewed = state.session.cards_reviewed + 1;
    const newCardsCorrect = correct ? state.session.cards_correct + 1 : state.session.cards_correct;

    return updateProgress({
      cardsReviewed: newCardsReviewed,
      cardsCorrect: newCardsCorrect,
    });
  }, [state.session, updateProgress]);

  // Convenience: Add found word
  const addFoundWord = useCallback(async (
    word: string,
    isVocabularyWord = false
  ): Promise<{ success: boolean; error?: string }> => {
    if (!state.session) {
      return { success: false, error: 'No active session' };
    }

    const newWordsFound = [...state.session.words_found, word];
    const newVocabularyWordsFound = isVocabularyWord
      ? [...state.session.vocabulary_words_found, word]
      : state.session.vocabulary_words_found;

    return updateProgress({
      wordsFound: newWordsFound,
      vocabularyWordsFound: newVocabularyWordsFound,
    });
  }, [state.session, updateProgress]);

  // Convenience: Update time spent
  const updateTimeSpent = useCallback(async (
    seconds: number
  ): Promise<{ success: boolean; error?: string }> => {
    return updateProgress({ timeSpentSeconds: seconds });
  }, [updateProgress]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    ...state,
    updateProgress,
    completeSession,
    incrementCards,
    addFoundWord,
    updateTimeSpent,
  };
}
