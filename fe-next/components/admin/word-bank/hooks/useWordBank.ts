'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Language } from '@/types';
import type { WordBankWord, WordBankStats, WordBankFilters } from '../types';

interface UseWordBankResult {
  words: WordBankWord[];
  stats: WordBankStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteWord: (word: string) => Promise<boolean>;
  clearError: () => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useWordBank(filters: WordBankFilters): UseWordBankResult {
  const [words, setWords] = useState<WordBankWord[]>([]);
  const [stats, setStats] = useState<WordBankStats>({
    total: 0,
    active: 0,
    blocked: 0,
    bySource: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = filters.limit || 50;

  const fetchWords = useCallback(
    async (resetOffset = false): Promise<void> => {
      setLoading(true);
      setError(null);

      const currentOffset = resetOffset ? 0 : offset;

      try {
        // Build query params
        const params = new URLSearchParams({
          language: filters.language,
          limit: limit.toString(),
          offset: currentOffset.toString(),
        });

        if (filters.status) {
          params.append('status', filters.status);
        }

        if (filters.source) {
          params.append('source', filters.source);
        }

        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await fetch(`/api/admin/daily-word/word-bank?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch word bank');
        }

        const data = await response.json();

        if (data.success) {
          if (resetOffset) {
            setWords(data.words);
            setOffset(data.words.length);
          } else {
            setWords(prev => [...prev, ...data.words]);
            setOffset(prev => prev + data.words.length);
          }

          setHasMore(data.pagination?.hasMore || false);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch words';
        setError(errorMessage);
        console.error('Word bank fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [filters, offset, limit]
  );

  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams({
        language: filters.language,
        action: 'stats',
      });

      const response = await fetch(`/api/admin/daily-word/word-bank?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, [filters.language]);

  const refresh = useCallback(async (): Promise<void> => {
    setOffset(0);
    await Promise.all([fetchWords(true), fetchStats()]);
  }, [fetchWords, fetchStats]);

  const deleteWord = useCallback(
    async (word: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/admin/daily-word/word-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            word,
            language: filters.language,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete word');
        }

        const data = await response.json();

        if (data.success) {
          // Remove word from local state
          setWords(prev => prev.filter(w => w.word !== word));
          await fetchStats(); // Refresh stats
          return true;
        } else {
          throw new Error(data.error || 'Delete failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete word';
        setError(errorMessage);
        console.error('Delete error:', err);
        return false;
      }
    },
    [filters.language, fetchStats]
  );

  const loadMore = useCallback(async (): Promise<void> => {
    if (!loading && hasMore) {
      await fetchWords(false);
    }
  }, [loading, hasMore, fetchWords]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [filters.language, filters.status, filters.source, filters.search, refresh]);

  return {
    words,
    stats,
    loading,
    error,
    refresh,
    deleteWord,
    clearError,
    hasMore,
    loadMore,
  };
}
