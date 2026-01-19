'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';
import { formatDate, type ScheduledWord } from '../types';

interface UseWordManagementOptions {
  language: Language;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
}

interface UseWordManagementResult {
  saving: boolean;
  triggerLoading: boolean;
  regeneratingBoard: string | null;
  handleSaveOverride: (word: ScheduledWord, newValue: string) => Promise<void>;
  handleClearOverride: (word: ScheduledWord) => Promise<void>;
  handleReplaceWord: (
    puzzleDate: string,
    newWord: string,
    resetAllAttempts: boolean
  ) => Promise<void>;
  handleAddNewWord: (puzzleDate: string, newWord: string) => Promise<void>;
  handleTriggerGeneration: () => Promise<void>;
  handleRegenerateBoard: (puzzleDate: string) => Promise<void>;
  copyWord: (word: string) => Promise<void>;
  copyResetLink: () => Promise<void>;
}

export function useWordManagement({
  language,
  onSuccess,
  onError,
  onRefresh,
}: UseWordManagementOptions): UseWordManagementResult {
  const [saving, setSaving] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [regeneratingBoard, setRegeneratingBoard] = useState<string | null>(null);

  const supabase = createClient();

  const handleSaveOverride = useCallback(
    async (word: ScheduledWord, newValue: string): Promise<void> => {
      if (!newValue.trim()) return;

      setSaving(true);
      try {
        const { error: updateError } = await supabase
          .from('daily_target_words')
          .update({
            override_word: newValue.toUpperCase().trim(),
            override_at: new Date().toISOString(),
          })
          .eq('id', word.id);

        if (updateError) throw updateError;

        await onRefresh();
        onSuccess(`Word updated to "${newValue.toUpperCase()}"`);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to save override');
      } finally {
        setSaving(false);
      }
    },
    [supabase, onRefresh, onSuccess, onError]
  );

  const handleClearOverride = useCallback(
    async (word: ScheduledWord): Promise<void> => {
      setSaving(true);
      try {
        const { error: updateError } = await supabase
          .from('daily_target_words')
          .update({
            override_word: null,
            override_by: null,
            override_at: null,
          })
          .eq('id', word.id);

        if (updateError) throw updateError;

        await onRefresh();
        onSuccess('Override cleared successfully!');
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to clear override');
      } finally {
        setSaving(false);
      }
    },
    [supabase, onRefresh, onSuccess, onError]
  );

  const handleReplaceWord = useCallback(
    async (puzzleDate: string, newWord: string, resetAllAttempts: boolean): Promise<void> => {
      if (!puzzleDate || !newWord.trim()) return;

      setSaving(true);
      try {
        const response = await fetch('/api/admin/daily-word/replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            puzzleDate,
            language,
            newWord: newWord.toUpperCase().trim(),
            resetAllAttempts,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to replace word');
        }

        const result = await response.json();
        let message = `Word replaced with "${newWord.toUpperCase()}"`;
        if (result.reset?.deleted) {
          message += ` and ${result.reset.deleted} attempts reset`;
        }
        onSuccess(message);
        await onRefresh();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to replace word');
      } finally {
        setSaving(false);
      }
    },
    [language, onRefresh, onSuccess, onError]
  );

  const handleAddNewWord = useCallback(
    async (puzzleDate: string, newWord: string): Promise<void> => {
      if (!puzzleDate || !newWord.trim() || newWord.length < 2) return;

      setSaving(true);
      try {
        const response = await fetch('/api/admin/daily-word/replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            puzzleDate,
            language,
            newWord: newWord.toUpperCase().trim(),
            resetAllAttempts: false,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add word');
        }

        onSuccess(`Word "${newWord.toUpperCase()}" added for ${formatDate(puzzleDate)}`);
        await onRefresh();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to add word');
      } finally {
        setSaving(false);
      }
    },
    [language, onRefresh, onSuccess, onError]
  );

  const handleTriggerGeneration = useCallback(async (): Promise<void> => {
    setTriggerLoading(true);

    try {
      const response = await fetch('/api/admin/trigger-daily-word-generation', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger generation');
      }

      const result = await response.json();
      onSuccess(`Generated ${result.summary?.created || 0} new words!`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to trigger generation');
    } finally {
      setTriggerLoading(false);
    }
  }, [onRefresh, onSuccess, onError]);

  const handleRegenerateBoard = useCallback(
    async (puzzleDate: string): Promise<void> => {
      if (regeneratingBoard) return;

      setRegeneratingBoard(puzzleDate);

      try {
        const response = await fetch('/api/admin/daily-word/regenerate-board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            puzzleDate,
            language,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to regenerate board');
        }

        const result = await response.json();
        onSuccess(
          `Board regenerated for ${formatDate(puzzleDate)} - ${result.puzzle.gridDimensions.rows}x${result.puzzle.gridDimensions.cols} grid with "${result.puzzle.targetWord}"`
        );
        await onRefresh();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to regenerate board');
      } finally {
        setRegeneratingBoard(null);
      }
    },
    [language, regeneratingBoard, onRefresh, onSuccess, onError]
  );

  const copyWord = useCallback(
    async (word: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(word);
        onSuccess(`Copied "${word}" to clipboard`);
      } catch {
        onError('Failed to copy to clipboard');
      }
    },
    [onSuccess, onError]
  );

  const copyResetLink = useCallback(async (): Promise<void> => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const resetLink = `${origin}/${language}/daily?reset=true`;
      await navigator.clipboard.writeText(resetLink);
      onSuccess('Reset link copied! Share this with the player to let them replay.');
    } catch {
      onError('Failed to copy reset link');
    }
  }, [language, onSuccess, onError]);

  return {
    saving,
    triggerLoading,
    regeneratingBoard,
    handleSaveOverride,
    handleClearOverride,
    handleReplaceWord,
    handleAddNewWord,
    handleTriggerGeneration,
    handleRegenerateBoard,
    copyWord,
    copyResetLink,
  };
}
