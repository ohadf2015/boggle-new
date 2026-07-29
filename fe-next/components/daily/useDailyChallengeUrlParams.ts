import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  parseChallengeParam,
  clearWordHuntResultForRetry,
  getGuestFingerprint,
} from '@/utils/dailyChallenge';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';
import type { ChallengeData } from './DailyReadyScreen';
import type { Language } from '@/types';

interface RetryTokenValidation {
  valid: boolean;
  reason?: string;
  puzzleDate?: string;
  language?: string;
  todayDate?: string;
}

interface UseDailyChallengeUrlParamsProps {
  gameLanguage: Language;
  isAuthenticated: boolean;
  profile: { id: string } | null;
  t: (key: string) => string;
  setChallengeData: (data: ChallengeData | null) => void;
  setWasReset: (val: boolean) => void;
}

/**
 * Handles URL parameter parsing for daily challenge:
 * - ?challenge={data} - challenge link
 * - ?reset=true - admin reset
 * - ?retryToken={token} - paid retry token
 */
export function useDailyChallengeUrlParams({
  gameLanguage,
  isAuthenticated,
  profile,
  t,
  setChallengeData,
  setWasReset,
}: UseDailyChallengeUrlParamsProps): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    const challengeParam = searchParams.get('challenge');
    if (challengeParam) {
      const parsed = parseChallengeParam(challengeParam);
      if (parsed) setChallengeData(parsed);
    }

    // Handle admin reset: ?reset=true
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true' && typeof window !== 'undefined') {
      let isMounted = true;

      const performReset = async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
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

          let serverReset = false;
          if (resetBody.playerId || resetBody.guestFingerprint) {
            try {
              const resetResponse = await fetch('/api/daily/reset-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetBody),
              });
              const resetResult = await resetResponse.json();
              serverReset = resetResult.success && (resetResult.deleted > 0);
            } catch (serverError) {
              console.warn('Failed to reset server attempt:', serverError);
            }
          }

          if (!isMounted) return;

          const localCleared = clearWordHuntResultForRetry(gameLanguage);

          if (localCleared || serverReset) {
            setWasReset(true);
            neoSuccessToast(t('daily.attemptReset'), { icon: '🔄', duration: 4000 });
          }
        } catch (error) {
          console.error('Reset error:', error);
        }

        if (isMounted && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('reset');
          window.history.replaceState({}, '', url.toString());
        }
      };

      performReset();
      return () => { isMounted = false; };
    }

    // Handle retry token: ?retryToken={token}
    const retryToken = searchParams.get('retryToken');
    if (retryToken && typeof window !== 'undefined') {
      let isMounted = true;

      const validateRetryToken = async () => {
        try {
          const response = await fetch(`/api/daily/validate-retry-token?token=${encodeURIComponent(retryToken)}`);
          const data: RetryTokenValidation = await response.json();

          if (!isMounted) return;

          if (data.valid) {
            const resetBody: { token: string; playerId?: string; guestFingerprint?: string } = { token: retryToken };
            if (isAuthenticated && profile) {
              resetBody.playerId = profile.id;
            } else {
              const fp = await getGuestFingerprint();
              if (fp) resetBody.guestFingerprint = fp;
            }

            try {
              const resetResponse = await fetch('/api/daily/validate-retry-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetBody),
              });
              const resetResult = await resetResponse.json();

              if (!isMounted) return;

              const cleared = clearWordHuntResultForRetry(gameLanguage);
              setWasReset(true);

              if (resetResult.attemptsReset > 0 || cleared) {
                neoSuccessToast(t('daily.retryLinkUsed'), { icon: '🔓', duration: 4000 });
              } else {
                neoSuccessToast(t('daily.retryLinkReady'), { icon: '🎯', duration: 3000 });
              }
            } catch (resetError) {
              console.warn('Failed to reset server attempt:', resetError);
              if (!isMounted) return;
              clearWordHuntResultForRetry(gameLanguage);
              setWasReset(true);
              neoSuccessToast(t('daily.retryLinkReady'), { icon: '🎯', duration: 3000 });
            }
          } else {
            if (data.reason === 'expired') {
              neoErrorToast(t('daily.retryLinkExpired'), { icon: '⏰', duration: 5000 });
            } else if (data.reason === 'wrong_date') {
              neoErrorToast(t('daily.retryLinkWrongDate'), { icon: '📅', duration: 5000 });
            } else {
              neoErrorToast(t('daily.retryLinkInvalid'), { icon: '❌', duration: 5000 });
            }
          }
        } catch (error) {
          console.error('Failed to validate retry token:', error);
          if (isMounted) {
            neoErrorToast(t('daily.retryLinkError'), { icon: '⚠️', duration: 5000 });
          }
        }

        if (isMounted && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('retryToken');
          window.history.replaceState({}, '', url.toString());
        }
      };

      validateRetryToken();
      return () => { isMounted = false; };
    }
    return undefined;
  }, [searchParams, gameLanguage, t, isAuthenticated, profile, setChallengeData, setWasReset]);
}
