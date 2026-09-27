/**
 * Hook for handling word validation/voting in results
 */

import { useState, useEffect, useCallback } from 'react';
import { useAutoShowWithInteraction } from '@/hooks/useAutoShowWithInteraction';

/**
 * Session-scoped flag so the dictionary-help prompt is shown at most once per
 * browser session, no matter how many games the player finishes in that session.
 */
const SESSION_SHOWN_KEY = 'lc_dictionary_help_shown';

function hasShownThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SESSION_SHOWN_KEY) === '1';
  } catch {
    return false;
  }
}

function markShownThisSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_SHOWN_KEY, '1');
  } catch {
    // sessionStorage unavailable (private mode / blocked) — fail open, no crash.
  }
}

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

  // Initialize queue from bot words — only ever ask about a single word so the
  // prompt is "show once", not a multi-word sequence.
  useEffect(() => {
    if (!botWordsForValidation || botWordsForValidation.length === 0) return;
    setWordValidationQueue(botWordsForValidation.slice(0, 1));
  }, [botWordsForValidation]);

  // Auto-show validation modal only after the player has interacted with the
  // page for 7s, and at most once per browser session.
  useAutoShowWithInteraction({
    enabled:
      !disabled &&
      wordValidationQueue.length > 0 &&
      !showWordValidation &&
      !hasShownThisSession(),
    delayMs: 7000,
    onTrigger: () => {
      markShownThisSession();
      setShowWordValidation(true);
    },
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
