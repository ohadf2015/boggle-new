import { useCallback, useRef, useState } from 'react';
import {
  getDailyChallengeDate,
  clearWordHuntResultForRetry,
  getGuestFingerprint,
} from '@/utils/dailyChallenge';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';
import type { Language } from '@/types';
import type { DailyChallengePhase } from './DailyChallenge';

interface UseRetryChallengeProps {
  gameLanguage: Language;
  isAuthenticated: boolean;
  profile: { id: string } | null;
  t: (key: string) => string;
  setStoredResult: (val: null) => void;
  setGameResult: (val: null) => void;
  setWasReset: (val: boolean) => void;
  setPhase: (phase: DailyChallengePhase) => void;
}

interface UseRetryChallengeReturn {
  handleRetryChallenge: () => Promise<void>;
  justResetRef: React.RefObject<boolean>;
  extraTries: number;
}

export function useRetryChallenge({
  gameLanguage,
  isAuthenticated,
  profile,
  t,
  setStoredResult,
  setGameResult,
  setWasReset,
  setPhase,
}: UseRetryChallengeProps): UseRetryChallengeReturn {
  const justResetRef = useRef(false);
  const [extraTries, setExtraTries] = useState(0);

  const handleRetryChallenge = useCallback(async () => {
    try {
      const today = getDailyChallengeDate();

      const resetBody: { puzzleDate: string; language: string; playerId?: string; guestFingerprint?: string } = {
        puzzleDate: today,
        language: gameLanguage,
      };

      if (isAuthenticated && profile) {
        resetBody.playerId = profile.id;
      } else {
        const fp = await getGuestFingerprint();
        if (fp) resetBody.guestFingerprint = fp;
      }

      if (resetBody.playerId || resetBody.guestFingerprint) {
        try {
          const resetResponse = await fetch('/api/daily/reset-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resetBody),
          });
          const resetResult = await resetResponse.json();
          if (!resetResult.success) {
            console.warn('Server reset returned failure:', resetResult);
            neoErrorToast(t('errors.resetFailed'), { icon: '⚠️', duration: 4000 });
            return;
          }
          // Track the extra tries count from the server response
          setExtraTries(resetResult.extraTries || 0);
        } catch (serverError) {
          console.warn('Failed to reset server attempt:', serverError);
          neoErrorToast(t('errors.networkError'), { icon: '📡', duration: 4000 });
          return;
        }
      }

      const cleared = clearWordHuntResultForRetry(gameLanguage);
      if (!cleared) {
        console.error('Failed to clear Word Hunt result for retry');
        neoErrorToast(t('daily.retryFailed'), { icon: '❌', duration: 4000 });
        return;
      }

      justResetRef.current = true;

      setStoredResult(null);
      setGameResult(null);
      setWasReset(true);
      setPhase('ready');

      neoSuccessToast(t('daily.attemptReset'), { icon: '🔄', duration: 3000 });
    } catch (error) {
      console.error('Retry challenge error:', error);
      neoErrorToast(t('daily.retryFailed'), { icon: '❌', duration: 4000 });
    }
  }, [gameLanguage, isAuthenticated, profile, t, setStoredResult, setGameResult, setWasReset, setPhase]);

  return { handleRetryChallenge, justResetRef, extraTries };
}
