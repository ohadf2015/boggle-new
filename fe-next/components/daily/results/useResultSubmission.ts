/**
 * Result Submission Hook
 * Handles submitting Word Hunt results to the backend
 */

import { useEffect, useRef } from 'react';
import {
  getTodaysWordHuntResult,
  markWordHuntResultSubmitted,
  type WordHuntResult,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';
import { neoErrorToast } from '@/components/NeoToast';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { getOfflineStore } from '@/lib/offline';
import { enqueueScore } from '@/lib/offline/scoreQueue';
import type { Language } from '@/types';

interface UseResultSubmissionProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  isNewCompletion: boolean;
  guestFingerprint: string | null;
  isAuthenticated: boolean;
  profile: {
    id: string;
    display_name?: string | null;
    username: string;
    avatar_emoji?: string | null;
    avatar_color?: string | null;
    avatar_image?: string | null;
  } | null;
  guestPlayer: GuestDailyPlayer | null;
  countryCodeReady: boolean;
  onSubmitSuccess: () => void;
  /** Fired once when the server consumed a Streak Freeze to bridge a missed day */
  onFreezeBridged?: (info: { freezesRemaining?: number }) => void;
  /** Number of coin-paid retries */
  extraTries?: number;
  /** Translation function for error messages */
  t?: (key: string) => string;
}

export function useResultSubmission({
  result,
  puzzleNumber,
  puzzleDate,
  language,
  isNewCompletion,
  guestFingerprint,
  isAuthenticated,
  profile,
  guestPlayer,
  countryCodeReady,
  onSubmitSuccess,
  onFreezeBridged,
  extraTries = 0,
  t,
}: UseResultSubmissionProps) {
  const hasSubmittedRef = useRef(false);
  const { online } = useNetworkState();
  const offlineFlag = useOfflineModeFlag();

  // Submit result to backend when completing a new challenge
  useEffect(() => {
    // Check if we need to retry submission for a previously saved but unsubmitted result
    const storedResult = getTodaysWordHuntResult(language);
    const needsRetrySubmission =
      !isNewCompletion && storedResult && storedResult.submittedToServer === false;

    // Wait for country code to be fetched (with timeout fallback)
    // For authenticated users: only need profile (NOT guestFingerprint)
    // For guests: need guestFingerprint (but not profile)
    // BUG FIX: Previously required guestFingerprint for ALL users, blocking authenticated submissions
    const canSubmit =
      (isNewCompletion || needsRetrySubmission) &&
      result &&
      countryCodeReady &&
      (isAuthenticated
        ? !!profile  // Authenticated: just need profile
        : !!guestFingerprint  // Guest: need fingerprint
      );

    // Debug logging for submission conditions (dev-only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[WordHunt Submit Check]', {
        isNewCompletion,
        needsRetrySubmission,
        hasResult: !!result,
        guestFingerprint: guestFingerprint ? guestFingerprint.substring(0, 8) + '...' : 'null',
        countryCodeReady,
        isAuthenticated,
        hasProfile: !!profile,
        canSubmit,
        alreadySubmitted: hasSubmittedRef.current,
      });
    }

    // Prevent double submission
    if (canSubmit && !hasSubmittedRef.current) {
      const submitResult = async () => {
        try {
          // Validate attemptsUsed BEFORE marking as submitted
          // Zero attempts means the result was created but never actually attempted
          // which indicates stale/invalid data that should not be submitted
          // BUG FIX (BUG-002): Do NOT mark as submitted when data is invalid
          // This allows user to correct the issue or retry with valid data
          if (result.attemptsUsed < 1 || result.attemptsUsed > 10) {
            console.error(
              '[WordHunt Submit] Invalid attempts count:',
              result.attemptsUsed,
              '- must be between 1 and 10. Cannot submit invalid data.'
            );
            // DO NOT mark as submitted - invalid data should not be persisted
            // DO NOT retry - just exit silently to prevent infinite loops
            return;
          }

          // Mark as submitted only after validation passes to prevent retries of invalid data
          hasSubmittedRef.current = true;

          const displayName =
            isAuthenticated && profile
              ? profile.display_name || profile.username
              : guestPlayer?.displayName || 'Guest Player';
          const avatarEmoji =
            isAuthenticated && profile
              ? profile.avatar_emoji
              : guestPlayer?.avatarEmoji || '🎯';
          const avatarColor =
            isAuthenticated && profile
              ? profile.avatar_color
              : guestPlayer?.avatarColor || '#6366f1';

          // Fetch country code from geolocation API
          let countryCode: string | null = null;
          try {
            const geoResponse = await fetch('/api/geolocation');
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              countryCode = geoData.countryCode || null;
            }
          } catch (geoError) {
            console.warn('Failed to fetch country code:', geoError);
          }

          const bodyData: Record<string, unknown> = {
            puzzleDate,
            puzzleNumber,
            language,
            playerId: isAuthenticated && profile ? profile.id : null,
            guestFingerprint: !isAuthenticated ? guestFingerprint : null,
            displayName,
            avatarEmoji,
            avatarColor,
            countryCode: countryCode || null,
            isCatchup: result.isCatchup ?? false,
            solved: result.solved,
            attemptsUsed: result.attemptsUsed,
            targetWord: result.targetWord,
            attemptWords: result.attempts.map((a) => ({
              word: a.word,
              feedback: a.feedback.map((f) => ({
                letter: f.letter,
                feedback: f.feedback,
                position: f.position,
              })),
              timestamp: a.timestamp,
            })),
          };

          // Debug logging for submission (dev-only)
          if (process.env.NODE_ENV === 'development') {
            console.log('[WordHunt Submit] Preparing submission:', {
              isAuthenticated,
              hasProfile: !!profile,
              playerId: bodyData.playerId,
              guestFingerprint: bodyData.guestFingerprint,
              displayName: bodyData.displayName,
              avatarEmoji: bodyData.avatarEmoji,
              countryCode: bodyData.countryCode,
              solved: bodyData.solved,
              attemptsUsed: bodyData.attemptsUsed,
            });
          }

          // Add extra tries for retry penalty tracking
          if (extraTries > 0) bodyData.extraTries = extraTries;

          // Add survival mode fields if present
          if (result.wordsDiscovered) bodyData.wordsDiscovered = result.wordsDiscovered;
          if (result.lifeRemaining !== undefined) bodyData.lifeRemaining = result.lifeRemaining;
          if (result.clueTokensEarned !== undefined)
            bodyData.clueTokensEarned = result.clueTokensEarned;
          if (result.clueTokensSpent !== undefined)
            bodyData.clueTokensSpent = result.clueTokensSpent;
          if (result.hintsUnlocked !== undefined) bodyData.hintsUnlocked = result.hintsUnlocked;
          if (result.efficiencyScore !== undefined)
            bodyData.efficiencyScore = result.efficiencyScore;

          // Offline-mode branch: queue for sync via /api/scores/sync.
          // Survival mode is detected by presence of lifeRemaining field.
          // Guests skip the queue — sync route requires authenticated user
          // for awards; their localStorage fallback (markWordHuntResultSubmitted)
          // is the canonical local record.
          if (offlineFlag && !online && isAuthenticated && profile?.id) {
            const mode = bodyData.lifeRemaining !== undefined ? 'daily-survival' : 'daily-wordhunt';
            try {
              const store = await getOfflineStore();
              await enqueueScore(store, mode, bodyData);
              markWordHuntResultSubmitted(language);
              onSubmitSuccess();
            } catch (err) {
              console.warn('[WordHunt] offline enqueue failed', err);
            }
            return;
          }

          const response = await fetch('/api/daily-challenge/word-hunt/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            // Invalid words are expected user behavior, not system errors - don't log as error
            const isInvalidWordsError = response.status === 400 && errorText.includes('Invalid words');
            if (isInvalidWordsError) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[WordHunt Submit] Submission rejected - contains invalid words:', errorText);
              }
            } else {
              // BUG-004: Show user-facing toast for submission failures
              const errorMessage = t?.('errors.resultSubmissionFailed') || 'Failed to save your result. Your progress is saved locally.';
              neoErrorToast(errorMessage, { icon: '⚠️', duration: 4000 });
              console.error('Failed to submit Word Hunt result:', errorText);
            }
            return;
          }

          const responseData = await response.json();
          if (process.env.NODE_ENV === 'development') {
            console.log('[WordHunt Submit] Response:', {
              success: responseData.success,
              alreadySubmitted: responseData.alreadySubmitted,
              dataId: responseData.data?.id,
              playerType: bodyData.playerId ? 'authenticated' : 'guest',
            });
          }

          // Mark the result as successfully submitted
          markWordHuntResultSubmitted(language);

          // One-shot "streak saved by freeze" signal — fire only on the
          // server's newly-consumed bridge event, never off steady protection.
          if (responseData.freezeBridged) {
            onFreezeBridged?.({ freezesRemaining: responseData.freezesRemaining });
          }

          // Notify parent of successful submission
          onSubmitSuccess();
        } catch (err) {
          // BUG-004: Show user-facing toast for network errors
          const errorMessage = t?.('errors.networkError') || 'Network error. Your progress is saved locally.';
          neoErrorToast(errorMessage, { icon: '📡', duration: 4000 });
          console.error('Failed to submit Word Hunt result:', err);
        }
      };

      submitResult();
    }
  }, [
    isNewCompletion,
    result,
    guestFingerprint,
    puzzleDate,
    puzzleNumber,
    language,
    isAuthenticated,
    profile,
    guestPlayer,
    countryCodeReady,
    onSubmitSuccess,
    onFreezeBridged,
    extraTries,
    t,
    online,
    offlineFlag,
  ]);

  return { hasSubmittedRef };
}
