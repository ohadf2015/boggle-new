'use client';

import { useState, useCallback } from 'react';
import type { Language } from '@/types';
import type { PlayerAttempt } from '../types';

interface UsePlayerAttemptsOptions {
  language: Language;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface UsePlayerAttemptsResult {
  attempts: PlayerAttempt[];
  attemptsLoading: boolean;
  expandedDate: string | null;
  searchQuery: string;
  selectedAttempts: Set<string>;
  setSearchQuery: (query: string) => void;
  toggleExpanded: (dateString: string) => void;
  toggleAttemptSelection: (id: string) => void;
  selectAllAttempts: () => void;
  getFilteredAttempts: () => PlayerAttempt[];
  handleResetSelectedAttempts: () => Promise<void>;
  saving: boolean;
}

export function usePlayerAttempts({
  language,
  onSuccess,
  onError,
}: UsePlayerAttemptsOptions): UsePlayerAttemptsResult {
  const [attempts, setAttempts] = useState<PlayerAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttempts, setSelectedAttempts] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchAttempts = useCallback(
    async (puzzleDate: string): Promise<void> => {
      setAttemptsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/daily-word/attempts?puzzleDate=${puzzleDate}&language=${language}`,
          { credentials: 'include' }
        );
        if (!response.ok) {
          throw new Error('Failed to fetch attempts');
        }
        const data = await response.json();
        setAttempts(data.attempts || []);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to fetch attempts');
      } finally {
        setAttemptsLoading(false);
      }
    },
    [language, onError]
  );

  const toggleExpanded = useCallback(
    (dateString: string): void => {
      if (expandedDate === dateString) {
        setExpandedDate(null);
        setAttempts([]);
        setSelectedAttempts(new Set());
      } else {
        setExpandedDate(dateString);
        fetchAttempts(dateString);
        setSelectedAttempts(new Set());
      }
    },
    [expandedDate, fetchAttempts]
  );

  const toggleAttemptSelection = useCallback((id: string): void => {
    setSelectedAttempts((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const getFilteredAttempts = useCallback((): PlayerAttempt[] => {
    if (!searchQuery) return attempts;
    const query = searchQuery.toLowerCase();
    return attempts.filter((a) => a.display_name?.toLowerCase().includes(query));
  }, [attempts, searchQuery]);

  const selectAllAttempts = useCallback((): void => {
    const filtered = getFilteredAttempts();
    if (selectedAttempts.size === filtered.length) {
      setSelectedAttempts(new Set());
    } else {
      setSelectedAttempts(new Set(filtered.map((a) => a.id)));
    }
  }, [getFilteredAttempts, selectedAttempts.size]);

  const handleResetSelectedAttempts = useCallback(async (): Promise<void> => {
    if (selectedAttempts.size === 0 || !expandedDate) return;

    const selectedList = attempts.filter((a) => selectedAttempts.has(a.id));
    const playerIds = selectedList.filter((a) => a.player_id).map((a) => a.player_id);
    const guestFingerprints = selectedList
      .filter((a) => a.guest_fingerprint)
      .map((a) => a.guest_fingerprint);

    setSaving(true);
    try {
      const response = await fetch('/api/admin/daily-word/reset-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          puzzleDate: expandedDate,
          language,
          playerIds,
          guestFingerprints,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset attempts');
      }

      const result = await response.json();
      onSuccess(`Reset ${result.deleted} player attempts`);
      await fetchAttempts(expandedDate);
      setSelectedAttempts(new Set());
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to reset attempts');
    } finally {
      setSaving(false);
    }
  }, [selectedAttempts, expandedDate, attempts, language, onSuccess, onError, fetchAttempts]);

  return {
    attempts,
    attemptsLoading,
    expandedDate,
    searchQuery,
    selectedAttempts,
    setSearchQuery,
    toggleExpanded,
    toggleAttemptSelection,
    selectAllAttempts,
    getFilteredAttempts,
    handleResetSelectedAttempts,
    saving,
  };
}
