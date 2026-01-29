/**
 * useMarkAsBad Hook
 *
 * Provides state and actions for marking challenges as bad with feedback.
 * The feedback is stored and automatically included in future AI prompts.
 */

import { useState, useCallback } from 'react';
import type { MarkAsBadRequest } from '../types';

interface UseMarkAsBadOptions {
  authToken: string;
  onSuccess?: (data: MarkAsBadResponse) => void;
  onError?: (error: string) => void;
}

interface MarkAsBadResponse {
  date: string;
  language: string;
  challengeIndex: number;
  challengeType: string;
  trendTopic?: string;
  feedbackStored: boolean;
}

interface UseMarkAsBadReturn {
  // State
  isSubmitting: boolean;
  error: string | null;
  lastMarked: MarkAsBadResponse | null;

  // Actions
  markAsBad: (request: MarkAsBadRequest) => Promise<boolean>;
  clearError: () => void;
  clearLastMarked: () => void;
}

export function useMarkAsBad({
  authToken,
  onSuccess,
  onError,
}: UseMarkAsBadOptions): UseMarkAsBadReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMarked, setLastMarked] = useState<MarkAsBadResponse | null>(null);

  /**
   * Mark a challenge as bad with feedback
   */
  const markAsBad = useCallback(
    async (request: MarkAsBadRequest): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);

      try {
        // Validate feedback length
        if (!request.feedback || request.feedback.trim().length < 10) {
          throw new Error('Feedback must be at least 10 characters');
        }

        const response = await fetch('/api/admin/buzz/challenges/mark-bad', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to mark challenge as bad');
        }

        const data = await response.json();
        const result: MarkAsBadResponse = data.data;

        setLastMarked(result);
        onSuccess?.(result);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        onError?.(message);
        console.error('[useMarkAsBad] Error:', err);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [authToken, onSuccess, onError]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear last marked state
   */
  const clearLastMarked = useCallback(() => {
    setLastMarked(null);
  }, []);

  return {
    isSubmitting,
    error,
    lastMarked,
    markAsBad,
    clearError,
    clearLastMarked,
  };
}
