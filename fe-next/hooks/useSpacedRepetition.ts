'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getWithAuth } from '@/utils/authFetch';
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
 * Merge DB reviews into a local schedule. DB wins on conflict when
 * its lastReviewDate is newer than the local copy.
 */
function mergeDbIntoLocal(
  local: Record<string, WordReviewData>,
  dbReviews: WordReviewData[]
): Record<string, WordReviewData> {
  const merged = { ...local };
  for (const dbEntry of dbReviews) {
    const localEntry = merged[dbEntry.word];
    if (!localEntry || dbEntry.lastReviewDate > localEntry.lastReviewDate) {
      merged[dbEntry.word] = dbEntry;
    }
  }
  return merged;
}

/**
 * Fetch review schedule from the API. Returns empty array on failure.
 */
async function fetchDbSchedule(lessonId: string): Promise<WordReviewData[]> {
  const res = await getWithAuth(`/api/education/spaced-repetition?lessonId=${encodeURIComponent(lessonId)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.reviews ?? []) as WordReviewData[];
}

/**
 * Hook for managing spaced repetition schedule for a set of words.
 *
 * - Initializes review data for words not yet seen
 * - Persists schedule to localStorage (key: `sr_schedule_${lessonId}`)
 * - Fetches from DB and merges (DB wins on conflict by lastReviewDate)
 * - recordReview updates localStorage and syncs to DB in background
 * - wordsForToday: words whose nextReviewDate <= today
 */
export function useSpacedRepetition(
  words: string[],
  lessonId: string
): UseSpacedRepetitionReturn {
  const wordsKey = words.join(',');

  const [reviewSchedule, setReviewSchedule] = useState<Record<string, WordReviewData>>(() => {
    const stored = loadSchedule(lessonId);
    return buildSchedule(words, stored);
  });

  const [wordsForToday, setWordsForToday] = useState<string[]>(() =>
    computeWordsForToday(buildSchedule(words, loadSchedule(lessonId)))
  );

  // Fetch DB schedule via useQuery
  const dbQuery = useQuery({
    queryKey: queryKeys.spacedRepetition.byLesson(lessonId, wordsKey),
    queryFn: () => fetchDbSchedule(lessonId),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = dbQuery.isLoading;

  // Re-initialize when words or lessonId changes
  useEffect(() => {
    const stored = loadSchedule(lessonId);
    const localSchedule = buildSchedule(words, stored);
    setReviewSchedule(localSchedule);
    setWordsForToday(computeWordsForToday(localSchedule));
  }, [lessonId, wordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge DB results into local state when query resolves
  useEffect(() => {
    const dbReviews = dbQuery.data;
    if (dbReviews && dbReviews.length > 0) {
      const freshLocal = loadSchedule(lessonId);
      const freshSchedule = buildSchedule(words, freshLocal);
      const merged = mergeDbIntoLocal(freshSchedule, dbReviews);
      saveSchedule(lessonId, merged);
      setReviewSchedule(merged);
      setWordsForToday(computeWordsForToday(merged));
    }
  }, [dbQuery.data, lessonId, wordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mutation for syncing a review to DB (fire-and-forget)
  const syncReviewMutation = useMutation({
    mutationFn: async (params: { lessonId: string; word: string; quality: number }) => {
      await fetch('/api/education/spaced-repetition', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    },
    onError: (err) => {
      logger.error('useSpacedRepetition: failed to sync review to DB', err);
    },
  });

  // No manual useCallback — React Compiler auto-memoizes this
  const recordReview = (word: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    setReviewSchedule(prev => {
      const current = prev[word];
      if (!current) return prev;

      const updated = calculateNextReview(current, { quality });
      const newSchedule = { ...prev, [word]: updated };

      saveSchedule(lessonId, newSchedule);
      setWordsForToday(computeWordsForToday(newSchedule));

      // Sync to DB in background
      syncReviewMutation.mutate({ lessonId, word, quality });

      return newSchedule;
    });
  };

  return {
    reviewSchedule,
    wordsForToday,
    recordReview,
    isLoading,
  };
}
