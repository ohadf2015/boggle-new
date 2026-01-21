'use client';

import { useState, useCallback } from 'react';
import type { Language } from '@/types';
import type { BulkGenerateState } from '../types';

const initialBulkState: BulkGenerateState = {
  isLoading: false,
  generatedWords: [],
  existingWords: [],
  excludedWords: [],
  aiConfigured: true,
  stats: null,
  error: null,
};

interface UseBulkGenerationReturn {
  bulkState: BulkGenerateState;
  bulkStartDate: string;
  bulkEndDate: string;
  isSaving: boolean;
  showBulkGenerator: boolean;
  setBulkStartDate: (date: string) => void;
  setBulkEndDate: (date: string) => void;
  setShowBulkGenerator: (show: boolean) => void;
  generateWords: () => Promise<void>;
  updateWord: (index: number, newWord: string) => void;
  saveWords: () => Promise<{ success: boolean; message?: string }>;
  clearGenerated: () => void;
}

function getDefaultStartDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);
  return weekLater.toISOString().split('T')[0];
}

export function useBulkGeneration(
  selectedLang: Language,
  currentWords: string[],
  accessToken: string | null
): UseBulkGenerationReturn {
  const [bulkState, setBulkState] = useState<BulkGenerateState>(initialBulkState);
  const [bulkStartDate, setBulkStartDate] = useState(getDefaultStartDate);
  const [bulkEndDate, setBulkEndDate] = useState(getDefaultEndDate);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);

  const generateWords = useCallback(async () => {
    if (!accessToken) {
      setBulkState(prev => ({ ...prev, error: 'Not authenticated. Please refresh the page.' }));
      return;
    }

    setBulkState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/admin/daily-word/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          language: selectedLang,
          startDate: bulkStartDate,
          endDate: bulkEndDate,
          existingWords: currentWords,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate words');
      }

      setBulkState({
        isLoading: false,
        generatedWords: data.generatedWords || [],
        existingWords: data.existingWords || [],
        excludedWords: data.excludedWords || [],
        aiConfigured: data.aiConfigured ?? true,
        stats: data.stats || null,
        error: null,
      });
    } catch (error) {
      setBulkState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [selectedLang, bulkStartDate, bulkEndDate, currentWords, accessToken]);

  const updateWord = useCallback((index: number, newWord: string) => {
    setBulkState(prev => ({
      ...prev,
      generatedWords: prev.generatedWords.map((item, i) =>
        i === index ? { ...item, word: newWord.toUpperCase() } : item
      ),
    }));
  }, []);

  const saveWords = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!accessToken) {
      return { success: false, message: 'Not authenticated. Please refresh the page.' };
    }

    const wordsToSave = bulkState.generatedWords
      .filter(w => w.word.trim().length > 0)
      .map(w => ({ date: w.date, word: w.word }));

    if (wordsToSave.length === 0) {
      return { success: false, message: 'No words to save. Please fill in at least one word.' };
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/daily-word/bulk-generate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          language: selectedLang,
          words: wordsToSave,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save words');
      }

      const message = `Saved ${data.summary.created} new and ${data.summary.updated} updated words${data.summary.errors > 0 ? ` (${data.summary.errors} errors)` : ''}`;

      // Clear the generated words
      setBulkState(prev => ({
        ...prev,
        generatedWords: [],
        existingWords: [],
        stats: null,
      }));

      return { success: true, message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to save' };
    } finally {
      setIsSaving(false);
    }
  }, [bulkState.generatedWords, selectedLang, accessToken]);

  const clearGenerated = useCallback(() => {
    setBulkState(initialBulkState);
  }, []);

  return {
    bulkState,
    bulkStartDate,
    bulkEndDate,
    isSaving,
    showBulkGenerator,
    setBulkStartDate,
    setBulkEndDate,
    setShowBulkGenerator,
    generateWords,
    updateWord,
    saveWords,
    clearGenerated,
  };
}
