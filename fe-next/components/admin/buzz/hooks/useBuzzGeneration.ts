'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getSession } from '@/lib/supabase';

// Client-side timeout matches server maxDuration (120s) with buffer
const CLIENT_TIMEOUT_MS = 130_000;

export interface GenerationResult {
  success: boolean;
  results: Record<string, { success: boolean; error?: string }>;
  duration: number;
  date: string;
  message?: string;
}

export interface UseBuzzGenerationOptions {
  onGenerationComplete?: () => void;
}

export interface UseBuzzGenerationReturn {
  isGenerating: boolean;
  result: GenerationResult | null;
  elapsedTime: number;
  handleGenerate: (selectedDate: string, selectedLanguage: string) => Promise<void>;
  clearResult: () => void;
}

/**
 * Hook for managing Daily Buzz generation state and actions.
 * Handles timeout, abort controller, and elapsed time tracking.
 */
export function useBuzzGeneration(
  options: UseBuzzGenerationOptions = {}
): UseBuzzGenerationReturn {
  const { onGenerationComplete } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Update elapsed time during generation
  useEffect(() => {
    if (!isGenerating) {
      setElapsedTime(0);
      return;
    }

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = useCallback(async (selectedDate: string, selectedLanguage: string) => {
    setIsGenerating(true);
    setResult(null);

    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      // Get user's JWT token from session
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session. Please refresh the page.');
      }

      const body: Record<string, string> = { date: selectedDate };
      if (selectedLanguage !== 'all') {
        body.language = selectedLanguage;
      }

      const response = await fetch('/api/cron/generate-daily-buzz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data);
      onGenerationComplete?.();
    } catch (error) {
      // Handle abort differently from other errors
      if (error instanceof Error && error.name === 'AbortError') {
        setResult({
          success: false,
          results: {},
          duration: 0,
          date: selectedDate,
          message: 'Request timed out after 130 seconds. The AI model may be overloaded. Please try again in a few minutes.',
        });
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setResult({
          success: false,
          results: {},
          duration: 0,
          date: selectedDate,
          message: errorMsg,
        });
      }
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, [onGenerationComplete]);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    isGenerating,
    result,
    elapsedTime,
    handleGenerate,
    clearResult,
  };
}
