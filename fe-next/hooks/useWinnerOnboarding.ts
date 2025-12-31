'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import logger from '@/utils/logger';
import {
  getWinnerOnboarding,
  clearWinnerOnboarding,
  getPendingDailyResult,
  clearPendingDailyResult,
  getGuestDailyPlayer,
  type WinnerOnboardingData,
} from '@/utils/dailyChallenge';
import { updateProfile } from '@/lib/supabase';

/**
 * Hook to manage winner onboarding flow after daily challenge signup
 *
 * This hook:
 * 1. Detects when winner onboarding is needed (after OAuth signup with pending result)
 * 2. Shows the WinnerOnboarding modal
 * 3. Updates the user's profile with chosen avatar/name
 * 4. Submits the pending daily challenge result
 * 5. Redirects to the daily challenge leaderboard
 */
export function useWinnerOnboarding() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { language } = useLanguage();

  const [onboardingData, setOnboardingData] = useState<WinnerOnboardingData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for winner onboarding on mount and when auth changes
  useEffect(() => {
    if (!user || !profile) {
      setOnboardingData(null);
      setIsOpen(false);
      return;
    }

    const checkOnboarding = () => {
      const data = getWinnerOnboarding();
      if (data && data.needsOnboarding) {
        logger.info('Winner onboarding needed, showing modal');
        setOnboardingData(data);
        setIsOpen(true);
      } else {
        setOnboardingData(null);
        setIsOpen(false);
      }
    };

    checkOnboarding();
  }, [user, profile]);

  /**
   * Complete the winner onboarding flow
   * Updates profile, submits pending result, and redirects to leaderboard
   */
  const completeOnboarding = useCallback(async (displayName: string, avatarId: string) => {
    if (!user || !profile) {
      throw new Error('Not authenticated');
    }

    setIsProcessing(true);

    try {
      logger.info('Completing winner onboarding with:', { displayName, avatarId });

      // 1. Update the user's profile with chosen avatar and name
      const { data: updatedProfile, error: updateError } = await updateProfile(user.id, {
        display_name: displayName,
        avatar_image: avatarId,
        has_customized_profile: true, // Mark as customized
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      logger.info('Profile updated successfully');

      // 2. Submit the pending daily challenge result with the NEW avatar/name
      const pending = getPendingDailyResult();
      if (pending) {
        const guestPlayer = await getGuestDailyPlayer();

        const bodyData: Record<string, unknown> = {
          puzzleDate: pending.puzzleDate,
          puzzleNumber: pending.puzzleNumber,
          language: pending.language,
          playerId: user.id,
          guestFingerprint: null, // Now authenticated
          displayName: displayName, // Use the chosen name
          avatarEmoji: updatedProfile?.avatar_emoji || guestPlayer?.avatarEmoji || '🎯',
          avatarColor: updatedProfile?.avatar_color || guestPlayer?.avatarColor || '#6366f1',
          solved: pending.result.solved,
          attemptsUsed: pending.result.attemptsUsed,
          targetWord: pending.result.targetWord,
          attemptWords: pending.result.attempts.map(a => ({
            word: a.word,
            feedback: a.feedback.map(f => ({
              letter: f.letter,
              feedback: f.feedback,
              position: f.position,
            })),
            timestamp: a.timestamp,
          })),
        };

        // Add survival mode fields if present
        if (pending.result.wordsDiscovered) bodyData.wordsDiscovered = pending.result.wordsDiscovered;
        if (pending.result.lifeRemaining !== undefined) bodyData.lifeRemaining = pending.result.lifeRemaining;
        if (pending.result.clueTokensEarned !== undefined) bodyData.clueTokensEarned = pending.result.clueTokensEarned;
        if (pending.result.clueTokensSpent !== undefined) bodyData.clueTokensSpent = pending.result.clueTokensSpent;
        if (pending.result.hintsUnlocked !== undefined) bodyData.hintsUnlocked = pending.result.hintsUnlocked;
        if (pending.result.efficiencyScore !== undefined) bodyData.efficiencyScore = pending.result.efficiencyScore;

        const response = await fetch('/api/daily-challenge/word-hunt/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        if (response.ok) {
          logger.info('Successfully submitted pending daily result after onboarding');
        } else {
          const errorText = await response.text();
          logger.warn('Failed to submit pending daily result:', errorText);
        }

        clearPendingDailyResult();
      }

      // 3. Clear the onboarding flag
      clearWinnerOnboarding();
      setOnboardingData(null);
      setIsOpen(false);

      // 4. Refresh the profile in auth context
      if (refreshProfile) {
        await refreshProfile();
      }

      // 5. Redirect to daily challenge page with leaderboard open
      const dailyChallengePath = `/${language}/daily`;
      logger.info('Redirecting to daily challenge leaderboard');
      router.push(`${dailyChallengePath}?showLeaderboard=true`);

    } catch (err) {
      logger.error('Error completing winner onboarding:', err);
      setIsProcessing(false);
      throw err;
    }
  }, [user, profile, language, router, refreshProfile]);

  return {
    isOpen,
    onboardingData,
    isProcessing,
    completeOnboarding,
  };
}
