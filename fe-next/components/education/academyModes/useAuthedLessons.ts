'use client';

/**
 * The signed-in student's practisable lessons, fetched only once auth is FULLY
 * ready (session + profile). `usePracticeLessons` settles to an empty list
 * while the profile is still loading and does not flip back to loading when it
 * lands, so a screen that reads it can flash "nothing here" (Pitfalls Class 1).
 * Here `lessons` stays null until a real authed response arrives.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PracticeLesson } from '@/hooks/usePracticeLessons';
import { useTeacherStudentModeLessons } from '@/hooks/useTeacherStudentModeLessons';
import { studentLessonsToPracticeLessons } from '@/lib/education/teacherStudentView';

export function useAuthedLessons(): {
  lessons: PracticeLesson[] | null;
  error: boolean;
  signedOut: boolean;
  retry: () => void;
} {
  const { user, loading, isAuthenticated } = useAuth();
  const ready = !loading && !!user && isAuthenticated;
  const [lessons, setLessons] = useState<PracticeLesson[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mode = useTeacherStudentModeLessons();
  const modeLessons = useMemo(() => (mode.lessons ? studentLessonsToPracticeLessons(mode.lessons) : null), [mode.lessons]);

  useEffect(() => {
    if (!ready || mode.pending || mode.active) return;
    let cancelled = false;
    fetch('/api/education/practice/lessons')
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        if (!cancelled) {
          setLessons(Array.isArray(body?.lessons) ? body.lessons : []);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, attempt, mode.pending, mode.active]);

  const retry = useCallback(() => {
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  const signedOut = !loading && !user;
  if (mode.pending) return { lessons: null, error: false, signedOut, retry };
  if (mode.active) return { lessons: modeLessons, error: mode.error, signedOut, retry: mode.retry };
  return { lessons, error, signedOut, retry };
}
