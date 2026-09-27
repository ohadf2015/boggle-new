'use client';

/**
 * The signed-in student's practisable lessons, fetched only once auth is FULLY
 * ready (session + profile). `usePracticeLessons` settles to an empty list
 * while the profile is still loading and does not flip back to loading when it
 * lands, so a screen that reads it can flash "nothing here" (Pitfalls Class 1).
 * Here `lessons` stays null until a real authed response arrives.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PracticeLesson } from '@/hooks/usePracticeLessons';

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

  useEffect(() => {
    if (!ready) return;
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
  }, [ready, attempt]);

  const retry = useCallback(() => {
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  return { lessons, error, signedOut: !loading && !user, retry };
}
