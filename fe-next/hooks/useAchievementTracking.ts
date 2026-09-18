'use client';

import { useState, useRef, useEffect } from 'react';

export interface AchievementTrackingState {
  perfectGames: number;
  morningPractices: number;
  modesTriedRef: React.MutableRefObject<Set<string>>;
  completedLessonsRef: React.MutableRefObject<Set<string>>;
  uniqueWordsRef: React.MutableRefObject<Set<string>>;
  practiceDaysThisMonth: number;
}

/**
 * useAchievementTracking - Initialize and manage achievement tracking state
 * Handles localStorage initialization and references for achievement metrics
 */
export function useAchievementTracking(studentId: string): AchievementTrackingState {
  const [perfectGames, setPerfectGames] = useState<number>(0);
  const [morningPractices, setMorningPractices] = useState<number>(0);
  const modesTriedRef = useRef<Set<string>>(new Set());
  const [, setModesTriedCount] = useState<number>(1);
  const completedLessonsRef = useRef<Set<string>>(new Set());
  const [, setCompletedLessonsCount] = useState<number>(0);
  const uniqueWordsRef = useRef<Set<string>>(new Set());
  const [, setUniqueWordsCount] = useState<number>(0);
  const [practiceDaysThisMonth, setPracticeDaysThisMonth] = useState<number>(0);

  // Initialize achievement trackers from localStorage on mount
  useEffect(() => {
    try {
      const storedPerfect = localStorage.getItem(`edu_perfect_games_${studentId}`);
      if (storedPerfect) setPerfectGames(parseInt(storedPerfect, 10) || 0);

      const storedMorning = localStorage.getItem(`edu_morning_practices_${studentId}`);
      if (storedMorning) setMorningPractices(parseInt(storedMorning, 10) || 0);

      const storedLessons = localStorage.getItem(`education_completed_lessons_${studentId}`);
      if (storedLessons) {
        const parsed: string[] = JSON.parse(storedLessons);
        completedLessonsRef.current = new Set(parsed);
        setCompletedLessonsCount(completedLessonsRef.current.size);
      }

      const storedModes = localStorage.getItem(`education_modes_tried_${studentId}`);
      if (storedModes) {
        const parsed: string[] = JSON.parse(storedModes);
        modesTriedRef.current = new Set(parsed);
        setModesTriedCount(modesTriedRef.current.size || 1);
      }

      const storedWords = localStorage.getItem(`education_unique_words_${studentId}`);
      if (storedWords) {
        const parsed: string[] = JSON.parse(storedWords);
        uniqueWordsRef.current = new Set(parsed);
        setUniqueWordsCount(uniqueWordsRef.current.size);
      }

      const storedDays = localStorage.getItem(`edu_practice_days_${studentId}`);
      if (storedDays) {
        const parsed: string[] = JSON.parse(storedDays);
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
        const daysThisMonth = parsed.filter((d: string) => d.startsWith(thisMonth)).length;
        setPracticeDaysThisMonth(daysThisMonth);
      }
    } catch {
      // localStorage unavailable or corrupt — use defaults
    }
  }, [studentId]);

  return {
    perfectGames,
    morningPractices,
    modesTriedRef,
    completedLessonsRef,
    uniqueWordsRef,
    practiceDaysThisMonth,
  };
}
