'use client';

import { useState, useCallback } from 'react';
import { getSession } from '@/lib/supabase';
import type { DailyBuzzDataAdmin } from '../types';

// Regeneration timeout (70s API maxDuration + buffer)
const REGENERATE_TIMEOUT_MS = 80_000;

// Consolidated operation state type
interface OperationState {
  loading: boolean;
  error: string | null;
}

const initialOperationState: OperationState = {
  loading: false,
  error: null,
};

export interface UseChallengeDataReturn {
  challengeData: DailyBuzzDataAdmin | null;
  loadingChallenges: boolean;
  fetchChallenges: (date: string, language: string) => Promise<void>;
  setChallengeData: (data: DailyBuzzDataAdmin | null) => void;
  // Image operations
  isRegeneratingImage: boolean;
  regenerateImageError: string | null;
  handleRegenerateImage: () => Promise<boolean>;
  isRemovingImage: boolean;
  removeImageError: string | null;
  handleRemoveImage: () => Promise<boolean>;
  clearImageErrors: () => void;
  // Type regeneration
  isRegeneratingType: boolean;
  typeRegenerateError: string | null;
  handleRegenerateByType: (type: string, feedback: string) => Promise<void>;
  clearTypeError: () => void;
}

/**
 * Hook for managing challenge data fetching, updates, and image operations.
 * Uses consolidated operation state to reduce state explosion.
 */
export function useChallengeData(): UseChallengeDataReturn {
  const [challengeData, setChallengeData] = useState<DailyBuzzDataAdmin | null>(null);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // Consolidated operation states
  const [imageRegenState, setImageRegenState] = useState<OperationState>(initialOperationState);
  const [imageRemoveState, setImageRemoveState] = useState<OperationState>(initialOperationState);
  const [typeRegenState, setTypeRegenState] = useState<OperationState>(initialOperationState);

  const fetchChallenges = useCallback(async (date: string, language: string) => {
    setLoadingChallenges(true);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `/api/admin/buzz/challenges?date=${date}&language=${language}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setChallengeData(null);
          return;
        }
        throw new Error('Failed to fetch challenges');
      }

      const data = await response.json();
      setChallengeData(data.data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setChallengeData(null);
    } finally {
      setLoadingChallenges(false);
    }
  }, []);

  const handleRegenerateImage = useCallback<() => Promise<boolean>>(async () => {
    if (!challengeData) return false;

    setImageRegenState({ loading: true, error: null });

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REGENERATE_TIMEOUT_MS);

      const response = await fetch('/api/admin/buzz/regenerate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: challengeData.puzzle_date,
          language: challengeData.language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate image');
      }

      const data = await response.json();

      // Update local state with new image
      setChallengeData({
        ...challengeData,
        image_url: data.data.image_url,
        image_prompt: data.data.image_prompt,
        image_category: data.data.image_category,
        image_alt_text: data.data.image_alt_text,
      });

      setImageRegenState({ loading: false, error: null });
      return true;
    } catch (error) {
      const errorMsg = getTimeoutOrError(error, 'Failed to regenerate image');
      setImageRegenState({ loading: false, error: errorMsg });
      return false;
    }
  }, [challengeData]);

  const handleRemoveImage = useCallback<() => Promise<boolean>>(async () => {
    if (!challengeData) return false;

    setImageRemoveState({ loading: true, error: null });

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/buzz/remove-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: challengeData.puzzle_date,
          language: challengeData.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove image');
      }

      // Update local state to reflect image removal
      setChallengeData({
        ...challengeData,
        image_url: null,
        image_prompt: null,
        image_category: null,
      });

      setImageRemoveState({ loading: false, error: null });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove image';
      setImageRemoveState({ loading: false, error: errorMsg });
      return false;
    }
  }, [challengeData]);

  const handleRegenerateByType = useCallback(async (type: string, feedback: string) => {
    if (!type || !challengeData || !feedback.trim()) return;

    setTypeRegenState({ loading: true, error: null });

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REGENERATE_TIMEOUT_MS);

      const response = await fetch('/api/admin/buzz/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: challengeData.puzzle_date,
          language: challengeData.language,
          challengeType: type,
          feedback: feedback.trim(),
          saveFeedback: false, // No original challenge to store for type-based regen
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      const data = await response.json();
      setChallengeData(data.data);
      setTypeRegenState({ loading: false, error: null });
    } catch (error) {
      const errorMsg = getTimeoutOrError(error, 'Failed to regenerate');
      setTypeRegenState({ loading: false, error: errorMsg });
      throw error; // Re-throw to let caller handle
    }
  }, [challengeData]);

  const clearImageErrors = useCallback(() => {
    setImageRegenState((prev) => ({ ...prev, error: null }));
    setImageRemoveState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearTypeError = useCallback(() => {
    setTypeRegenState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    challengeData,
    loadingChallenges,
    fetchChallenges,
    setChallengeData,
    // Image regeneration (destructured from consolidated state)
    isRegeneratingImage: imageRegenState.loading,
    regenerateImageError: imageRegenState.error,
    handleRegenerateImage,
    // Image removal (destructured from consolidated state)
    isRemovingImage: imageRemoveState.loading,
    removeImageError: imageRemoveState.error,
    handleRemoveImage,
    clearImageErrors,
    // Type regeneration (destructured from consolidated state)
    isRegeneratingType: typeRegenState.loading,
    typeRegenerateError: typeRegenState.error,
    handleRegenerateByType,
    clearTypeError,
  };
}

/**
 * Helper to get appropriate error message for timeout or generic errors.
 */
function getTimeoutOrError(error: unknown, defaultMsg: string): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Request timed out after 80 seconds. The AI model may be overloaded. Please try again in a few minutes.';
  }
  return error instanceof Error ? error.message : defaultMsg;
}
