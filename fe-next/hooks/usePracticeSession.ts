'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import logger from '@/utils/logger';
import { wordsForLevel } from '@/lib/education/differentiation';
import {
  readGuestPractice,
  recordGuestPracticeStart,
  guestPracticeCounts,
  guestPracticeMastery,
  type GuestPracticeRecord,
} from '@/lib/education/practiceGuestProgress';
import type { VocabularyLevel, VocabularyWord } from '@/lib/supabase/education/types';
import type { VocabFocus } from '@/lib/education/vocabFocus';

// =============================================
// PRACTICE WORDS (per-student differentiation)
// =============================================

const NO_WORDS: VocabularyWord[] = [];

/**
 * The lesson words THIS student should practise, filtered by their classroom
 * differentiation level (support/core → no challenge-tier words; challenge → all).
 *
 * This is the single choke point for solo practice word selection: every practice
 * mode (flashcards, solo board, matching, spelling, blitz, word list) should take
 * `words` from here rather than `lesson.words`, so a support student is never
 * quizzed on a word the teacher tagged as challenge.
 *
 * Referentially stable for unchanged inputs so consumers can key effects on it.
 */
export function usePracticeWords<W extends Pick<VocabularyWord, 'level'>>(
  words: readonly W[] | null | undefined
): { words: W[]; level: VocabularyLevel; isLevelLoading: boolean } {
  const { level, isLoading } = useStudentClassroom();
  const filtered = useMemo(
    () => (words && words.length > 0 ? wordsForLevel(words, level) : (NO_WORDS as unknown as W[])),
    [words, level]
  );
  return { words: filtered, level, isLevelLoading: isLoading };
}

// Types
export type PracticeType = 'flashcard' | 'solo_board' | 'warmup' | 'word_list' | 'matching' | 'spelling' | 'blitz' | 'vocab_focus';
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
  /** vocab_focus only: which skill this session drills (stored in session results). */
  focus?: VocabFocus;
}


// API functions


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


// =============================================
// PRACTICE PROGRESS HOOK
// =============================================

interface UsePracticeProgressState {
  progress: PracticeProgress | null;
  mastery: MasteryLevel;
  isLoading: boolean;
  error: string | null;
}

interface UsePracticeProgressActions {
  refresh: () => Promise<void>;
  startSession: (
    practiceType: PracticeType,
    options?: { focus?: VocabFocus }
  ) => Promise<{ success: boolean; error?: string }>;
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
/**
 * Shapes a device-local guest record as the same `PracticeProgress` row the
 * server returns, so the picker and the header read one type either way.
 */
function guestProgressRow(lessonId: string, record: GuestPracticeRecord): PracticeProgress {
  return {
    student_id: 'guest',
    lesson_id: lessonId,
    total_flashcards_reviewed: record.cardsReviewed,
    total_flashcards_correct: record.cardsCorrect,
    total_practice_score: 0,
    total_vocabulary_words_found: record.wordsFound.length,
    ...guestPracticeCounts(record),
    total_practice_time_seconds: 0,
    last_practice_at: record.lastPracticeAt,
  };
}

export function usePracticeProgress(
  lessonId: string | undefined,
  studentId?: string, // Optional: for teachers viewing student progress
  /** `totalWords` is the mastery denominator for a guest, whose progress has no
   *  server row to compute it from. */
  options?: { totalWords?: number }
): UsePracticeProgressReturn {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const isMounted = useMounted();
  // Resolved-and-anonymous, not merely "not authenticated yet". `isAuthenticated`
  // starts false on every first paint, so branching on it alone would run the
  // guest path for one frame on a signed-in student's device and write a local
  // session count that belongs to nobody.
  const isGuest = !authLoading && !isAuthenticated;
  const totalWords = options?.totalWords ?? 0;

  const [state, setState] = useState<UsePracticeProgressState>({
    progress: null,
    mastery: 'not_started',
    isLoading: true,
    error: null,
  });

  // Fetch the aggregated progress row
  const fetchData = useCallback(async () => {
    if (!lessonId) {
      setState(prev => ({ ...prev, progress: null, mastery: 'not_started', isLoading: false }));
      return;
    }

    // No account: read the device. Calling the server here would 401 and the
    // student would be shown "Failed to fetch progress" about practice that
    // worked perfectly well.
    if (isGuest) {
      const record = readGuestPractice(lessonId);
      setState({
        progress: guestProgressRow(lessonId, record),
        mastery: guestPracticeMastery(record, totalWords),
        isLoading: false,
        error: null,
      });
      return;
    }

    if (!isAuthenticated) {
      setState(prev => ({ ...prev, progress: null, mastery: 'not_started', isLoading: false }));
      return;
    }

    try {
      const progressResult = await fetchProgressAPI(lessonId, studentId);

      if (isMounted.current) {
        setState({
          progress: progressResult.progress,
          mastery: progressResult.mastery,
          isLoading: false,
          error: progressResult.error || null,
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
  }, [isAuthenticated, isGuest, totalWords, lessonId, studentId, isMounted]);

  // Refresh data
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchData();
  }, [fetchData]);

  // Start new practice session
  const startSession = useCallback(async (
    practiceType: PracticeType,
    options?: { focus?: VocabFocus }
  ): Promise<{ success: boolean; session?: PracticeSession; error?: string }> => {
    if (!lessonId) {
      return { success: false, error: 'No lesson ID' };
    }

    // No account: the round is real, it just has no server row. Reporting
    // failure here would leave the practice screen refusing to open.
    if (isGuest) {
      const record = recordGuestPracticeStart(lessonId, practiceType);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          progress: guestProgressRow(lessonId, record),
          mastery: guestPracticeMastery(record, totalWords),
        }));
      }
      return { success: true };
    }

    try {
      const { session, error } = await startSessionAPI({
        lessonId,
        practiceType,
        ...(options?.focus ? { focus: options.focus } : {}),
      });

      if (error || !session) {
        return { success: false, error: error || 'Failed to start session' };
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start session';
      logger.error('Exception in startSession:', error);
      return { success: false, error };
    }
  }, [lessonId, isGuest, totalWords, isMounted]);

  // Initial fetch
  useEffect(() => {
    // `fetchData` already owns every branch (guest, signed in, no lesson);
    // duplicating that decision here is how the two drifted apart.
    void fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh,
    startSession,
  };
}
