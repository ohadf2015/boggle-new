'use client';

import { useState, useCallback } from 'react';
import { getSession } from '@/lib/supabase';
import type { DailyBuzzDataAdmin } from '../types';

// Regeneration timeout (70s API maxDuration + buffer)
const REGENERATE_TIMEOUT_MS = 80_000;

export interface UseChallengeDataReturn {
  challengeData: DailyBuzzDataAdmin | null;
  loadingChallenges: boolean;
  fetchChallenges: (date: string, language: string) => Promise<void>;
  setChallengeData: (data: DailyBuzzDataAdmin | null) => void;
  // Image operations
  isRegeneratingImage: boolean;
  regenerateImageError: string | null;
  handleRegenerateImage: () => Promise<void>;
  isRemovingImage: boolean;
  removeImageError: string | null;
  handleRemoveImage: () => Promise<void>;
  clearImageErrors: () => void;
  // Type regeneration
  isRegeneratingType: boolean;
  typeRegenerateError: string | null;
  handleRegenerateByType: (type: string, feedback: string) => Promise<void>;
  clearTypeError: () => void;
}

/**
 * Hook for managing challenge data fetching, updates, and image operations.
 */
export function useChallengeData(): UseChallengeDataReturn {
  const [challengeData, setChallengeData] = useState<DailyBuzzDataAdmin | null>(null);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // Image regeneration state
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [regenerateImageError, setRegenerateImageError] = useState<string | null>(null);

  // Image removal state
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [removeImageError, setRemoveImageError] = useState<string | null>(null);

  // Type regeneration state
  const [isRegeneratingType, setIsRegeneratingType] = useState(false);
  const [typeRegenerateError, setTypeRegenerateError] = useState<string | null>(null);

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

  const handleRegenerateImage = useCallback(async () => {
    if (!challengeData) return;

    setIsRegeneratingImage(true);
    setRegenerateImageError(null);

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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setRegenerateImageError(
          'Request timed out after 80 seconds. The AI model may be overloaded. Please try again in a few minutes.'
        );
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to regenerate image';
        setRegenerateImageError(errorMsg);
      }
    } finally {
      setIsRegeneratingImage(false);
    }
  }, [challengeData]);

  const handleRemoveImage = useCallback(async () => {
    if (!challengeData) return;

    setIsRemovingImage(true);
    setRemoveImageError(null);

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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove image';
      setRemoveImageError(errorMsg);
    } finally {
      setIsRemovingImage(false);
    }
  }, [challengeData]);

  const handleRegenerateByType = useCallback(async (type: string, feedback: string) => {
    if (!type || !challengeData || !feedback.trim()) return;

    setIsRegeneratingType(true);
    setTypeRegenerateError(null);

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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setTypeRegenerateError(
          'Request timed out after 80 seconds. The AI model may be overloaded. ' +
          'Please try again in a few minutes.'
        );
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to regenerate';
        setTypeRegenerateError(errorMsg);
      }
      throw error; // Re-throw to let caller handle
    } finally {
      setIsRegeneratingType(false);
    }
  }, [challengeData]);

  const clearImageErrors = useCallback(() => {
    setRegenerateImageError(null);
    setRemoveImageError(null);
  }, []);

  const clearTypeError = useCallback(() => {
    setTypeRegenerateError(null);
  }, []);

  return {
    challengeData,
    loadingChallenges,
    fetchChallenges,
    setChallengeData,
    isRegeneratingImage,
    regenerateImageError,
    handleRegenerateImage,
    isRemovingImage,
    removeImageError,
    handleRemoveImage,
    clearImageErrors,
    isRegeneratingType,
    typeRegenerateError,
    handleRegenerateByType,
    clearTypeError,
  };
}
