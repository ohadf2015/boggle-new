'use client';

/**
 * The client half of "any lesson I can see, I can practise".
 *
 * `useStudentProgress` answers a narrower question — which lessons were
 * ASSIGNED to me — and it is still the right source for homework state
 * (started / completed / due). These two hooks answer the wider one, through
 * `/api/education/practice/lessons`, which reads past the assignment-shaped RLS
 * policy on `vocabulary_lessons` (see that route for the full explanation).
 *
 * `usePracticeLesson` deliberately does NOT use `getLesson`: that is a browser
 * Supabase read, so RLS returns nothing at all for a visitor with no account
 * and a lesson link would dead-end on a blank screen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMounted } from '@/hooks/useMounted';
import logger from '@/utils/logger';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';

const LESSONS_ENDPOINT = '/api/education/practice/lessons';

/** Assignment metadata, when a teacher set any. Never a precondition for play. */
export interface PracticeAssignment {
  lesson_id?: string | null;
  classroom_id?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  practice_focus?: string | null;
}

export interface PracticeLesson {
  id: string;
  name: string;
  description: string | null;
  language: Language;
  words: VocabularyWord[];
  classroom_id: string | null;
  assignment: PracticeAssignment | null;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.error === 'string' ? body.error : 'Failed to load lessons';
  } catch {
    return 'Failed to load lessons';
  }
}

/** Every lesson the signed-in student may practise, assigned or not. */
export function usePracticeLessons(): {
  lessons: PracticeLesson[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { isAuthenticated, loading } = useAuth();
  const isMounted = useMounted();
  const [lessons, setLessons] = useState<PracticeLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // The list is personal, so an anonymous visitor has none — but that is a
    // resolved empty state, not a pending one. Settling here is what keeps the
    // lesson list from spinning forever for a guest.
    if (loading) return;
    if (!isAuthenticated) {
      if (isMounted.current) {
        setLessons([]);
        setError(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await fetch(LESSONS_ENDPOINT);
      if (!response.ok) {
        const message = await readError(response);
        if (isMounted.current) {
          setLessons([]);
          setError(message);
          setIsLoading(false);
        }
        return;
      }
      const body = await response.json();
      if (isMounted.current) {
        setLessons(Array.isArray(body?.lessons) ? body.lessons : []);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      logger.error('usePracticeLessons failed:', err);
      if (isMounted.current) {
        setLessons([]);
        setError('Failed to load lessons');
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, loading, isMounted]);

  useEffect(() => {
    void load();
  }, [load]);

  return { lessons, isLoading, error, refresh: load };
}

/** One lesson by id. Works with no account — a lesson link is a share link. */
export function usePracticeLesson(lessonId: string | undefined): {
  lesson: PracticeLesson | null;
  isLoading: boolean;
  error: string | null;
} {
  const isMounted = useMounted();
  const [lesson, setLesson] = useState<PracticeLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setLesson(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch(`${LESSONS_ENDPOINT}?lessonId=${encodeURIComponent(lessonId)}`);
        if (!response.ok) {
          const message = await readError(response);
          if (!cancelled && isMounted.current) {
            setLesson(null);
            setError(message);
            setIsLoading(false);
          }
          return;
        }
        const body = await response.json();
        if (!cancelled && isMounted.current) {
          setLesson(body?.lesson ?? null);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        logger.error('usePracticeLesson failed:', err);
        if (!cancelled && isMounted.current) {
          setLesson(null);
          setError('Failed to load lesson');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, isMounted]);

  return { lesson, isLoading, error };
}
