'use client';

import { useState, useCallback } from 'react';
import { getSession } from '@/lib/supabase';
import type { RegenerableField, PromptExample, PromptPreviewResponse } from '../../types';

interface UsePromptPreviewOptions {
  date: string;
  language: string;
  challengeIndex: number;
  selectedFields: RegenerableField[];
  feedback: string;
}

interface UsePromptPreviewReturn {
  promptPreview: string;
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  isEditingPrompt: boolean;
  setIsEditingPrompt: (value: boolean) => void;
  doNotDoExamples: PromptExample[];
  loadingPreview: boolean;
  error: string | null;
  loadPromptPreview: () => Promise<void>;
  resetPreview: () => void;
}

export function usePromptPreview({
  date,
  language,
  challengeIndex,
  selectedFields,
  feedback,
}: UsePromptPreviewOptions): UsePromptPreviewReturn {
  const [promptPreview, setPromptPreview] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [doNotDoExamples, setDoNotDoExamples] = useState<PromptExample[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPromptPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const fieldsParam = selectedFields.join(',');
      const params = new URLSearchParams({
        date,
        language,
        challengeIndex: challengeIndex.toString(),
        feedback: feedback || 'Needs improvement',
        fields: fieldsParam,
      });

      const response = await fetch(`/api/admin/buzz/prompt-preview?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load prompt preview');
      }

      const data: PromptPreviewResponse = await response.json();
      setPromptPreview(data.data.aiPrompt);
      setCustomPrompt(data.data.aiPrompt);
      setDoNotDoExamples(data.data.availableExamples);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMsg);
    } finally {
      setLoadingPreview(false);
    }
  }, [date, language, challengeIndex, selectedFields, feedback]);

  const resetPreview = useCallback(() => {
    setPromptPreview('');
    setCustomPrompt('');
    setIsEditingPrompt(false);
    setDoNotDoExamples([]);
    setError(null);
  }, []);

  return {
    promptPreview,
    customPrompt,
    setCustomPrompt,
    isEditingPrompt,
    setIsEditingPrompt,
    doNotDoExamples,
    loadingPreview,
    error,
    loadPromptPreview,
    resetPreview,
  };
}
