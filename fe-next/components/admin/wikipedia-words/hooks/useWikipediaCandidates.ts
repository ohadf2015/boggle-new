'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';
import {
  getDefaultDateRange,
  type WikipediaWordCandidate,
  type WikipediaWordsStats,
  type ValidationStatus,
} from '../types';

interface UseWikipediaCandidatesOptions {
  language: Language;
  status: 'all' | ValidationStatus;
  dateRange: { start: string; end: string };
  searchQuery: string;
}

export interface SyncResult {
  success: boolean;
  wordCount?: number;
  languageBreakdown?: Record<string, number>;
  syncDate?: string;
}

export interface BulkApproveResult {
  success: boolean;
  approved: number;
  skipped: number;
  failed: number;
  errors: Array<{ word: string; error: string }>;
}

interface UseWikipediaCandidatesResult {
  candidates: WikipediaWordCandidate[];
  stats: WikipediaWordsStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (id: string, status: ValidationStatus) => Promise<boolean>;
  deleteCandidate: (id: string) => Promise<boolean>;
  bulkUpdateStatus: (ids: string[], status: ValidationStatus) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
  bulkApproveToDict: (ids: string[]) => Promise<BulkApproveResult>;
  triggerPopulation: () => Promise<boolean>;
  syncFromJSON: () => Promise<SyncResult>;
  clearError: () => void;
}

export function useWikipediaCandidates({
  language,
  status,
  dateRange,
  searchQuery,
}: UseWikipediaCandidatesOptions): UseWikipediaCandidatesResult {
  const [candidates, setCandidates] = useState<WikipediaWordCandidate[]>([]);
  const [stats, setStats] = useState<WikipediaWordsStats>({
    total: 0,
    pending: 0,
    valid: 0,
    invalid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCandidates = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('wikipedia_word_candidates')
        .select('*')
        .eq('language', language)
        .gte('fetch_date', dateRange.start)
        .lte('fetch_date', dateRange.end)
        .order('interestingness_score', { ascending: false });

      if (status !== 'all') {
        query = query.eq('validation_status', status);
      }

      if (searchQuery.trim()) {
        query = query.ilike('word', `%${searchQuery.trim()}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCandidates(data || []);

      // Calculate stats
      const allData = data || [];
      const statsData: WikipediaWordsStats = {
        total: allData.length,
        pending: allData.filter((c) => c.validation_status === 'pending').length,
        valid: allData.filter((c) => c.validation_status === 'valid').length,
        invalid: allData.filter((c) => c.validation_status === 'invalid').length,
      };
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, [supabase, language, status, dateRange.start, dateRange.end, searchQuery]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const updateStatus = useCallback(
    async (id: string, newStatus: ValidationStatus): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('wikipedia_word_candidates')
          .update({ validation_status: newStatus })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setCandidates((prev) =>
          prev.map((c) => (c.id === id ? { ...c, validation_status: newStatus } : c))
        );

        // Update stats
        setStats((prev) => {
          const candidate = candidates.find((c) => c.id === id);
          if (!candidate) return prev;

          const oldStatus = candidate.validation_status;
          return {
            ...prev,
            [oldStatus]: prev[oldStatus] - 1,
            [newStatus]: prev[newStatus] + 1,
          };
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
        return false;
      }
    },
    [supabase, candidates]
  );

  const deleteCandidate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('wikipedia_word_candidates')
          .delete()
          .eq('id', id);

        if (deleteError) {
          throw deleteError;
        }

        // Update local state
        const deletedCandidate = candidates.find((c) => c.id === id);
        setCandidates((prev) => prev.filter((c) => c.id !== id));

        // Update stats
        if (deletedCandidate) {
          setStats((prev) => ({
            ...prev,
            total: prev.total - 1,
            [deletedCandidate.validation_status]:
              prev[deletedCandidate.validation_status] - 1,
          }));
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete candidate');
        return false;
      }
    },
    [supabase, candidates]
  );

  const bulkUpdateStatus = useCallback(
    async (ids: string[], newStatus: ValidationStatus): Promise<boolean> => {
      if (ids.length === 0) return true;

      try {
        const { error: updateError } = await supabase
          .from('wikipedia_word_candidates')
          .update({ validation_status: newStatus })
          .in('id', ids);

        if (updateError) {
          throw updateError;
        }

        // Refresh to get accurate data
        await fetchCandidates();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to bulk update');
        return false;
      }
    },
    [supabase, fetchCandidates]
  );

  const bulkDelete = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return true;

      try {
        const { error: deleteError } = await supabase
          .from('wikipedia_word_candidates')
          .delete()
          .in('id', ids);

        if (deleteError) {
          throw deleteError;
        }

        // Refresh to get accurate data
        await fetchCandidates();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to bulk delete');
        return false;
      }
    },
    [supabase, fetchCandidates]
  );

  const triggerPopulation = useCallback(async (): Promise<boolean> => {
    // Client-side timeout (90s) - gives server enough time for Wikipedia API retries
    // Server maxDuration is 60s, but we allow extra buffer for processing
    // Wikipedia API can be slow (30s timeout + retries per language)
    const CLIENT_TIMEOUT_MS = 90000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        return false;
      }

      console.log('[Wikipedia] Triggering population for', language);

      const response = await fetch('/api/admin/wikipedia-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'populate',
          language,
          date: new Date().toISOString().split('T')[0],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger population');
      }

      console.log('[Wikipedia] Population completed successfully');

      // Refresh after population
      await fetchCandidates();
      return true;
    } catch (err) {
      // Handle abort (timeout) specifically
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The Wikipedia API may be slow or unreachable. Check server logs for details.');
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to trigger population');
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [supabase, language, fetchCandidates]);

  const syncFromJSON = useCallback(async (): Promise<SyncResult> => {
    // Match server maxDuration of 90s - large JSON files (2687 words for en.json)
    // are now processed in batches, but still need adequate time
    const CLIENT_TIMEOUT_MS = 95000; // 95 seconds (slightly more than server's 90s maxDuration)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        return { success: false };
      }

      console.log('[Wikipedia] Syncing from JSON for', language);

      const response = await fetch('/api/admin/wikipedia-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'sync-json',
          language,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sync from JSON');
      }

      const responseData = await response.json();
      const today = new Date().toISOString().split('T')[0];

      // Calculate total word count from results
      // API returns: { success: boolean, results: Record<string, { synced: number, error?: string }> }
      let totalWordCount = 0;
      const languageBreakdown: Record<string, number> = {};

      if (responseData.results && typeof responseData.results === 'object') {
        for (const [lang, result] of Object.entries(responseData.results)) {
          const syncResult = result as { synced: number; error?: string };
          if (typeof syncResult.synced === 'number' && syncResult.synced > 0) {
            totalWordCount += syncResult.synced;
            languageBreakdown[lang] = syncResult.synced;
          }
        }
      }

      console.log(`[Wikipedia] JSON sync completed successfully - ${totalWordCount} words synced`);

      // Refresh after sync
      await fetchCandidates();

      return {
        success: true,
        wordCount: totalWordCount,
        languageBreakdown,
        syncDate: today
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out while syncing from JSON files.');
        return { success: false };
      }
      setError(err instanceof Error ? err.message : 'Failed to sync from JSON');
      return { success: false };
    } finally {
      clearTimeout(timeoutId);
    }
  }, [supabase, language, fetchCandidates]);

  const bulkApproveToDict = useCallback(
    async (ids: string[]): Promise<BulkApproveResult> => {
      if (ids.length === 0) {
        return { success: true, approved: 0, skipped: 0, failed: 0, errors: [] };
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError('Not authenticated');
          return { success: false, approved: 0, skipped: 0, failed: 0, errors: [] };
        }

        const response = await fetch('/api/admin/wikipedia-words/bulk-approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            candidateIds: ids,
            language,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Bulk approval failed');
        }

        const result = await response.json();

        // Refresh candidates list
        await fetchCandidates();

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bulk approval failed');
        return { success: false, approved: 0, skipped: 0, failed: 0, errors: [] };
      }
    },
    [supabase, language, fetchCandidates]
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    candidates,
    stats,
    loading,
    error,
    refresh: fetchCandidates,
    updateStatus,
    deleteCandidate,
    bulkUpdateStatus,
    bulkDelete,
    bulkApproveToDict,
    triggerPopulation,
    syncFromJSON,
    clearError,
  };
}

// Re-export for convenience
export { getDefaultDateRange };
