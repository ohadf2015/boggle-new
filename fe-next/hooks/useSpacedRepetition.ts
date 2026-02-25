'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  createWordReviewData,
  calculateNextReview,
  isWordDueForReview,
  type WordReviewData,
} from '@/lib/utils/spacedRepetition';
import logger from '@/utils/logger';

export interface UseSpacedRepetitionReturn {
  reviewSchedule: Record<string, WordReviewData>; // word -> review data
  wordsForToday: string[];                         // words due today
  recordReview: (word: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  isLoading: boolean;
}

function storageKey(lessonId: string): string {
  return `sr_schedule_${lessonId}`;
}

function loadSchedule(lessonId: string): Record<string, WordReviewData> {
  try {
    const raw = localStorage.getItem(storageKey(lessonId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, WordReviewData>;
  } catch (err) {
    logger.error('useSpacedRepetition: failed to load schedule from localStorage', err);
    return {};
  }
}

function saveSchedule(lessonId: string, schedule: Record<string, WordReviewData>): void {
  try {
    localStorage.setItem(storageKey(lessonId), JSON.stringify(schedule));
  } catch (err) {
    logger.error('useSpacedRepetition: failed to save schedule to localStorage', err);
  }
}

function buildSchedule(
  words: string[],
  stored: Record<string, WordReviewData>
): Record<string, WordReviewData> {
  const schedule: Record<string, WordReviewData> = {};
  for (const word of words) {
    schedule[word] = stored[word] ?? createWordReviewData(word);
  }
  return schedule;
}

function computeWordsForToday(schedule: Record<string, WordReviewData>): string[] {
  return Object.values(schedule)
    .filter(data => isWordDueForReview(data))
    .map(data => data.word);
}

/**
 * Hook for managing spaced repetition schedule for a set of words.
 *
 * - Initializes review data for words not yet seen
 * - Persists schedule to localStorage (key: `sr_schedule_${lessonId}`)
 * - recordReview updates the schedule and persists it
 * - wordsForToday: words whose nextReviewDate <= today
 */
export function useSpacedRepetition(
  words: string[],
  lessonId: string
): UseSpacedRepetitionReturn {
  const [reviewSchedule, setReviewSchedule] = useState<Record<string, WordReviewData>>(() => {
    const stored = loadSchedule(lessonId);
    return buildSchedule(words, stored);
  });

  const [wordsForToday, setWordsForToday] = useState<string[]>(() =>
    computeWordsForToday(buildSchedule(words, loadSchedule(lessonId)))
  );

  // Re-initialize when words or lessonId changes
  useEffect(() => {
    const stored = loadSchedule(lessonId);
    const schedule = buildSchedule(words, stored);
    setReviewSchedule(schedule);
    setWordsForToday(computeWordsForToday(schedule));
  }, [lessonId, words.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordReview = useCallback(
    (word: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
      setReviewSchedule(prev => {
        const current = prev[word];
        if (!current) return prev;

        const updated = calculateNextReview(current, { quality });
        const newSchedule = { ...prev, [word]: updated };

        saveSchedule(lessonId, newSchedule);
        setWordsForToday(computeWordsForToday(newSchedule));

        return newSchedule;
      });
    },
    [lessonId]
  );

  return {
    reviewSchedule,
    wordsForToday,
    recordReview,
    isLoading: false,
  };
}
