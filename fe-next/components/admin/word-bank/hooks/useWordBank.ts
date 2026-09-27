'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';
import type { WordBankWord, WordBankStats, WordBankFilters, ValidationStatus, BulkActionResult } from '../types';

interface UseWordBankResult {
  words: WordBankWord[];
  stats: WordBankStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteWord: (word: string) => Promise<boolean>;
  approveWord: (wordId: string) => Promise<boolean>;
  rejectWord: (wordId: string) => Promise<boolean>;
  bulkApprove: (wordIds: string[]) => Promise<BulkActionResult>;
  bulkReject: (wordIds: string[]) => Promise<BulkActionResult>;
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
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const supabaseRef = useRef(createClient());

  const limit = filters.limit || 50;

  /**
   * Get authorization headers with Bearer token
   * Required for admin API authentication
   */
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabaseRef.current.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, []);

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

        if (filters.validation_status) {
          params.append('validation_status', filters.validation_status);
        }

        if (filters.source) {
          params.append('source', filters.source);
        }

        if (filters.search) {
          params.append('search', filters.search);
        }

        const headers = await getAuthHeaders();
        const response = await fetch(`/api/admin/daily-word/word-bank?${params.toString()}`, {
          headers,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'No error details');
          throw new Error(`Failed to fetch word bank (${response.status}): ${errorBody}`);
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
        // Don't log generic "Failed to fetch" errors - they're likely network issues
        if (!errorMessage.includes('Failed to fetch')) {
          console.error('Word bank fetch error:', errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters, offset, limit, getAuthHeaders]
  );

  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams({
        language: filters.language,
        action: 'stats',
      });

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/daily-word/word-bank?${params.toString()}`, {
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'No error details');
        throw new Error(`Failed to fetch stats (${response.status}): ${errorBody}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      // Don't log generic "Failed to fetch" errors - they're likely network issues
      if (!errorMessage.includes('Failed to fetch')) {
        console.error('Stats fetch error:', errorMessage);
      }
    }
  }, [filters.language, getAuthHeaders]);

  const refresh = useCallback(async (): Promise<void> => {
    setOffset(0);
    await Promise.all([fetchWords(true), fetchStats()]);
  }, [fetchWords, fetchStats]);

  const deleteWord = useCallback(
    async (word: string): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/daily-word/word-bank', {
          method: 'POST',
          headers,
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
        console.error('Delete error:', errorMessage, err);
        return false;
      }
    },
    [filters.language, fetchStats, getAuthHeaders]
  );

  const loadMore = useCallback(async (): Promise<void> => {
    if (!loading && hasMore) {
      await fetchWords(false);
    }
  }, [loading, hasMore, fetchWords]);

  const approveWord = useCallback(
    async (wordId: string): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/daily-word/word-bank', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'approve',
            wordId,
            language: filters.language,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to approve word');
        }

        const data = await response.json();

        if (data.success) {
          // Update word in local state
          setWords(prev =>
            prev.map(w => (w.id === wordId ? { ...w, validation_status: 'approved' as ValidationStatus } : w))
          );
          await fetchStats(); // Refresh stats
          return true;
        } else {
          throw new Error(data.error || 'Approve failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to approve word';
        setError(errorMessage);
        console.error('Approve error:', errorMessage, err);
        return false;
      }
    },
    [filters.language, fetchStats, getAuthHeaders]
  );

  const rejectWord = useCallback(
    async (wordId: string): Promise<boolean> => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/daily-word/word-bank', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'reject',
            wordId,
            language: filters.language,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reject word');
        }

        const data = await response.json();

        if (data.success) {
          // Update word in local state
          setWords(prev =>
            prev.map(w => (w.id === wordId ? { ...w, validation_status: 'rejected' as ValidationStatus } : w))
          );
          await fetchStats(); // Refresh stats
          return true;
        } else {
          throw new Error(data.error || 'Reject failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reject word';
        setError(errorMessage);
        console.error('Reject error:', errorMessage, err);
        return false;
      }
    },
    [filters.language, fetchStats, getAuthHeaders]
  );

  /**
   * Execute a bulk validation action (approve or reject) with timeout handling
   */
  const executeBulkAction = useCallback(
    async (
      wordIds: string[],
      action: 'bulk-approve' | 'bulk-reject',
      newStatus: ValidationStatus
    ): Promise<BulkActionResult> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const actionName = action === 'bulk-approve' ? 'approve' : 'reject';

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/daily-word/word-bank', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action, wordIds, language: filters.language }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'No details');
          throw new Error(`Failed to bulk ${actionName} (${response.status}): ${errorBody}`);
        }

        const data = await response.json();

        if (data.success) {
          setWords(prev =>
            prev.map(w => (wordIds.includes(w.id) ? { ...w, validation_status: newStatus } : w))
          );
          await fetchStats();
        }

        return data.result || { success: data.success, affected: wordIds.length, errors: [] };
      } catch (err) {
        clearTimeout(timeoutId);
        let errorMessage = `Failed to bulk ${actionName}`;
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Request timed out after 60 seconds. Please try with fewer words.';
          } else {
            errorMessage = err.message;
          }
        }
        setError(errorMessage);
        const errorDetails = err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : String(err);
        console.error(`Bulk ${actionName} error:`, errorMessage, errorDetails);
        return { success: false, affected: 0, errors: [] };
      }
    },
    [filters.language, fetchStats, getAuthHeaders]
  );

  const bulkApprove = useCallback(
    (wordIds: string[]): Promise<BulkActionResult> =>
      executeBulkAction(wordIds, 'bulk-approve', 'approved'),
    [executeBulkAction]
  );

  const bulkReject = useCallback(
    (wordIds: string[]): Promise<BulkActionResult> =>
      executeBulkAction(wordIds, 'bulk-reject', 'rejected'),
    [executeBulkAction]
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Initial load and filter changes
  // Don't include refresh in deps - it would cause infinite loop since refresh depends on fetchWords/fetchStats
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.language, filters.status, filters.validation_status, filters.source, filters.search]);

  return {
    words,
    stats,
    loading,
    error,
    refresh,
    deleteWord,
    approveWord,
    rejectWord,
    bulkApprove,
    bulkReject,
    clearError,
    hasMore,
    loadMore,
  };
}
