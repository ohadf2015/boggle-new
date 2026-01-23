'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { CommunityWord, CommunityStats } from '../types';
import {
  DEFAULT_LIMIT,
  DEFAULT_STATUS_FILTER,
  DEFAULT_LANG_FILTER,
  DEFAULT_SORT_BY,
  createWordKey,
} from '../constants';

interface UseCommunityWordsOptions {
  authToken: string;
}

interface UseCommunityWordsReturn {
  // Data
  words: CommunityWord[];
  stats: CommunityStats | null;

  // Loading states
  loading: boolean;
  processing: string | null;
  bulkProcessing: boolean;

  // Selection
  selectedWords: Set<string>;
  toggleWordSelection: (word: string, language: string) => void;
  toggleSelectAll: () => void;

  // Filters
  statusFilter: string;
  langFilter: string;
  searchQuery: string;
  sortBy: string;
  setStatusFilter: (value: string) => void;
  setLangFilter: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setSortBy: (value: string) => void;

  // Actions
  handleApprove: (word: string, language: string) => Promise<void>;
  handleReject: (word: string, language: string) => Promise<void>;
  handleBulkApprove: () => Promise<void>;
  handleBulkReject: () => Promise<void>;
  fetchWords: () => Promise<void>;
}

export function useCommunityWords({
  authToken,
}: UseCommunityWordsOptions): UseCommunityWordsReturn {
  // Data state
  const [words, setWords] = useState<CommunityWord[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Selection state
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER);
  const [langFilter, setLangFilter] = useState<string>(DEFAULT_LANG_FILTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);

  // Fetch words from API
  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (langFilter !== 'all') params.append('language', langFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('limit', DEFAULT_LIMIT.toString());

      const response = await fetch(`/api/admin/community-words?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to fetch words');

      const data = await response.json();
      setWords(data.words);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching words:', error);
      toast.error('Failed to load words');
    } finally {
      setLoading(false);
    }
  }, [authToken, statusFilter, langFilter, searchQuery, sortBy]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Approve a single word
  const handleApprove = useCallback(
    async (word: string, language: string) => {
      const key = createWordKey(word, language);
      try {
        setProcessing(key);
        const response = await fetch('/api/admin/community-words/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ word, language, addToDictionary: true }),
        });

        if (!response.ok) throw new Error('Failed to approve');

        toast.success(`Approved "${word}"`);

        // Optimistic UI update
        setWords((prev) => prev.filter((w) => createWordKey(w.word, w.language) !== key));
        if (stats) {
          setStats({
            ...stats,
            validated: stats.validated + 1,
            pendingReview: Math.max(0, stats.pendingReview - 1),
          });
        }
      } catch (error) {
        toast.error('Failed to approve word');
        fetchWords();
      } finally {
        setProcessing(null);
      }
    },
    [authToken, stats, fetchWords]
  );

  // Reject a single word
  const handleReject = useCallback(
    async (word: string, language: string) => {
      const key = createWordKey(word, language);
      try {
        setProcessing(key);
        const response = await fetch('/api/admin/community-words/disapprove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ word, language, blacklist: true }),
        });

        if (!response.ok) throw new Error('Failed to reject');

        toast.success(`Rejected "${word}"`);

        // Optimistic UI update
        setWords((prev) => prev.filter((w) => createWordKey(w.word, w.language) !== key));
        if (stats) {
          setStats({
            ...stats,
            rejected: stats.rejected + 1,
            pendingReview: Math.max(0, stats.pendingReview - 1),
          });
        }
      } catch (error) {
        toast.error('Failed to reject word');
        fetchWords();
      } finally {
        setProcessing(null);
      }
    },
    [authToken, stats, fetchWords]
  );

  // Shared bulk operation logic
  const executeBulkOperation = useCallback(
    async (
      endpoint: string,
      getBody: (word: CommunityWord) => Record<string, unknown>,
      updateStats: (stats: CommunityStats, count: number) => CommunityStats,
      actionName: string
    ) => {
      if (selectedWords.size === 0) {
        toast.error('No words selected');
        return;
      }

      try {
        setBulkProcessing(true);
        const wordsToProcess = words.filter((w) =>
          selectedWords.has(createWordKey(w.word, w.language))
        );

        const results = await Promise.allSettled(
          wordsToProcess.map((w) =>
            fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify(getBody(w)),
            })
          )
        );

        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        // Remove processed words from list
        setWords((prev) =>
          prev.filter((w) => !selectedWords.has(createWordKey(w.word, w.language)))
        );
        setSelectedWords(new Set());

        // Show result toast
        if (failed === 0) {
          toast.success(`${actionName} ${succeeded} word${succeeded !== 1 ? 's' : ''}`);
        } else {
          toast.error(`${actionName} ${succeeded}, failed ${failed}`);
        }

        // Update stats
        if (stats) {
          setStats(updateStats(stats, succeeded));
        }
      } catch {
        toast.error(`Failed to bulk ${actionName.toLowerCase()}`);
        fetchWords();
      } finally {
        setBulkProcessing(false);
      }
    },
    [authToken, words, selectedWords, stats, fetchWords]
  );

  // Bulk approve selected words
  const handleBulkApprove = useCallback(
    () =>
      executeBulkOperation(
        '/api/admin/community-words/approve',
        (w) => ({ word: w.word, language: w.language, addToDictionary: true }),
        (s, count) => ({
          ...s,
          validated: s.validated + count,
          pendingReview: Math.max(0, s.pendingReview - count),
        }),
        'Approved'
      ),
    [executeBulkOperation]
  );

  // Bulk reject selected words
  const handleBulkReject = useCallback(
    () =>
      executeBulkOperation(
        '/api/admin/community-words/disapprove',
        (w) => ({ word: w.word, language: w.language, blacklist: true }),
        (s, count) => ({
          ...s,
          rejected: s.rejected + count,
          pendingReview: Math.max(0, s.pendingReview - count),
        }),
        'Rejected'
      ),
    [executeBulkOperation]
  );

  // Toggle selection for a single word
  const toggleWordSelection = useCallback((word: string, language: string) => {
    const key = createWordKey(word, language);
    setSelectedWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedWords.size === words.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(words.map((w) => createWordKey(w.word, w.language))));
    }
  }, [selectedWords.size, words]);

  return {
    // Data
    words,
    stats,

    // Loading states
    loading,
    processing,
    bulkProcessing,

    // Selection
    selectedWords,
    toggleWordSelection,
    toggleSelectAll,

    // Filters
    statusFilter,
    langFilter,
    searchQuery,
    sortBy,
    setStatusFilter,
    setLangFilter,
    setSearchQuery,
    setSortBy,

    // Actions
    handleApprove,
    handleReject,
    handleBulkApprove,
    handleBulkReject,
    fetchWords,
  };
}
