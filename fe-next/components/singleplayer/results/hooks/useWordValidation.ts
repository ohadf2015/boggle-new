/**
 * Hook for handling word validation/voting in results
 */

import { useState, useEffect, useCallback } from 'react';
import { useAutoShowWithInteraction } from '@/hooks/useAutoShowWithInteraction';

interface UseWordValidationParams {
  botWordsForValidation?: string[];
  gameSessionId?: string;
  language?: string;
  disabled?: boolean;
}

interface UseWordValidationReturn {
  wordValidationQueue: string[];
  showWordValidation: boolean;
  setShowWordValidation: (show: boolean) => void;
  handleWordVote: (voteType: 'like' | 'dislike', word?: string) => Promise<void>;
}

export function useWordValidation({
  botWordsForValidation,
  gameSessionId,
  language,
  disabled = false,
}: UseWordValidationParams): UseWordValidationReturn {
  const [wordValidationQueue, setWordValidationQueue] = useState<string[]>([]);
  const [showWordValidation, setShowWordValidation] = useState(false);

  // Initialize queue from bot words
  useEffect(() => {
    if (!botWordsForValidation || botWordsForValidation.length === 0) return;
    setWordValidationQueue(botWordsForValidation.slice(0, 2));
  }, [botWordsForValidation]);

  // Auto-show validation modal after interaction delay
  useAutoShowWithInteraction({
    enabled: !disabled && wordValidationQueue.length > 0 && !showWordValidation,
    delayMs: 5000,
    onTrigger: () => setShowWordValidation(true),
  });

  const handleWordVote = useCallback(async (voteType: 'like' | 'dislike', word?: string) => {
    if (!word || !gameSessionId) return;
    try {
      await fetch('/api/single-player/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          language: language || 'en',
          voteType,
          sessionId: gameSessionId
        })
      });
    } catch (error) {
      // Serialize error properly - Error objects don't stringify well
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to record vote:', errorMessage);
    }
  }, [gameSessionId, language]);

  return {
    wordValidationQueue,
    showWordValidation,
    setShowWordValidation,
    handleWordVote,
  };
}
