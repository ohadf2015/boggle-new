'use client';

import { useEffect, useState } from 'react';
import { classifyClassRoundMood, type ClassRoundMoodResult } from '@/lib/education/classRoundMood';
import { loadClassRoundRatings } from '@/lib/education/classRoundRatingsRead';

export interface UseClassRoundMoodArgs {
  classroomId: string;
  gameCode?: string | null;
}

const EMPTY: ClassRoundMoodResult = { count: 0, mood: null };

/**
 * Mood of one class game. Starts empty and stays empty on a failed read,
 * so the digest never shows a mood that was not stored.
 */
export function useClassRoundMood({ classroomId, gameCode }: UseClassRoundMoodArgs): ClassRoundMoodResult {
  const [result, setResult] = useState<ClassRoundMoodResult>(EMPTY);

  useEffect(() => {
    if (!classroomId || !gameCode) {
      setResult(EMPTY);
      return;
    }
    // Drop the previous game's mood before the next read lands.
    setResult(EMPTY);
    let cancelled = false;
    loadClassRoundRatings(classroomId, gameCode)
      .then((ratings) => {
        if (cancelled) return;
        setResult(ratings ? classifyClassRoundMood(ratings) : EMPTY);
      })
      .catch(() => {
        if (!cancelled) setResult(EMPTY);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, gameCode]);

  return result;
}
