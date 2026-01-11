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
    profile_picture_url?: string | null;
  } | null;
  guestPlayer: GuestDailyPlayer | null;
  countryCodeReady: boolean;
  onSubmitSuccess: () => void;
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
}: UseResultSubmissionProps) {
  const hasSubmittedRef = useRef(false);

  // Submit result to backend when completing a new challenge
  useEffect(() => {
    // Check if we need to retry submission for a previously saved but unsubmitted result
    const storedResult = getTodaysWordHuntResult(language);
    const needsRetrySubmission =
      !isNewCompletion && storedResult && storedResult.submittedToServer === false;

    // Wait for country code to be fetched (with timeout fallback)
    const canSubmit =
      (isNewCompletion || needsRetrySubmission) &&
      result &&
      guestFingerprint &&
      countryCodeReady &&
      (isAuthenticated ? !!profile : true);

    // Debug logging for submission conditions
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

    // Prevent double submission
    if (canSubmit && !hasSubmittedRef.current) {
      const submitResult = async () => {
        try {
          // Validate attemptsUsed BEFORE marking as submitted
          // Zero attempts means the result was created but never actually attempted
          // which indicates stale/invalid data that should not be submitted
          if (result.attemptsUsed < 1 || result.attemptsUsed > 10) {
            console.error('[WordHunt Submit] Invalid attempts count:', result.attemptsUsed, '- must be between 1 and 10. Skipping submission.');
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

          // Debug logging for submission
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
              console.log('[WordHunt Submit] Submission rejected - contains invalid words:', errorText);
            } else {
              console.error('Failed to submit Word Hunt result:', errorText);
            }
            return;
          }

          const responseData = await response.json();
          console.log('[WordHunt Submit] Response:', {
            success: responseData.success,
            alreadySubmitted: responseData.alreadySubmitted,
            dataId: responseData.data?.id,
            playerType: bodyData.playerId ? 'authenticated' : 'guest',
          });

          // Mark the result as successfully submitted
          markWordHuntResultSubmitted(language);

          // Notify parent of successful submission
          onSubmitSuccess();
        } catch (err) {
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
  ]);

  return { hasSubmittedRef };
}
