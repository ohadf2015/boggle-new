'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';
import { getDateRange, type ScheduledWord, type AttemptSummary } from '../types';

interface UseScheduledWordsOptions {
  language: Language;
  daysToShow: number;
  dateOffset: number;
}

interface UseScheduledWordsResult {
  scheduledWords: ScheduledWord[];
  loading: boolean;
  error: string | null;
  attemptSummaries: Record<string, AttemptSummary>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useScheduledWords({
  language,
  daysToShow,
  dateOffset,
}: UseScheduledWordsOptions): UseScheduledWordsResult {
  const [scheduledWords, setScheduledWords] = useState<ScheduledWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptSummaries, setAttemptSummaries] = useState<Record<string, AttemptSummary>>({});

  const supabase = createClient();

  const fetchAttemptSummaries = useCallback(
    async (dates: string[]): Promise<void> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('daily_word_hunt_attempts')
          .select('puzzle_date, solved')
          .eq('language', language)
          .in('puzzle_date', dates);

        if (fetchError) throw fetchError;

        const summaries: Record<string, AttemptSummary> = {};
        dates.forEach((date) => {
          summaries[date] = { total: 0, solved: 0, failed: 0 };
        });

        (data || []).forEach((attempt: { puzzle_date: string; solved: boolean }) => {
          if (summaries[attempt.puzzle_date]) {
            summaries[attempt.puzzle_date].total++;
            if (attempt.solved) {
              summaries[attempt.puzzle_date].solved++;
            } else {
              summaries[attempt.puzzle_date].failed++;
            }
          }
        });

        setAttemptSummaries(summaries);
      } catch (err) {
        console.error('Failed to fetch attempt summaries:', err);
      }
    },
    [supabase, language]
  );

  const fetchScheduledWords = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const dates = getDateRange(daysToShow, dateOffset);

      const { data, error: fetchError } = await supabase
        .from('daily_target_words')
        .select('*')
        .eq('language', language)
        .in('puzzle_date', dates)
        .order('puzzle_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setScheduledWords(data || []);
      await fetchAttemptSummaries(dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduled words');
    } finally {
      setLoading(false);
    }
  }, [language, supabase, daysToShow, dateOffset, fetchAttemptSummaries]);

  useEffect(() => {
    fetchScheduledWords();
  }, [fetchScheduledWords]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    scheduledWords,
    loading,
    error,
    attemptSummaries,
    refresh: fetchScheduledWords,
    clearError,
  };
}
