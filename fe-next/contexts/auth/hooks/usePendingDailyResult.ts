/**
 * usePendingDailyResult - Handles pending daily challenge result submission
 *
 * Manages submission of daily challenge results after OAuth signup.
 * For new users: triggers winner onboarding flow first.
 * For returning users: auto-saves immediately.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  getPendingDailyResult,
  clearPendingDailyResult,
  getGuestDailyPlayer,
  setWinnerOnboarding,
} from '@/utils/dailyChallenge';
import {
  getStoredProfile,
  hasCompleteStoredProfile,
  clearStoredProfile,
} from '@/utils/profileStorage';
import { updateProfile } from '@/lib/supabase';
import { getAvatarEmojiAndColor } from '@/utils/avatarConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackDailySignupRank } from '@/utils/posthogEngagement';
import logger from '@/utils/logger';
import type { ProfileData } from '../authTypes';

interface PendingDailyResultSubmission {
  submitPendingDailyResult: (userId: string, userProfile: ProfileData) => Promise<void>;
}

/**
 * Hook to handle pending daily challenge result submission after user signup
 */
export function usePendingDailyResult(): PendingDailyResultSubmission {
  const router = useRouter();
  const { t } = useLanguage();

  const submitPendingDailyResult = useCallback(
    async (userId: string, userProfile: ProfileData) => {
      try {
        const pending = getPendingDailyResult();
        if (!pending) return;

        logger.info('Found pending daily result for user:', userId);

        // Check if this is a brand new user who hasn't customized their profile yet
        // If so, trigger the winner onboarding flow instead of immediate submission
        if (userProfile.has_customized_profile === false && pending.trigger) {
          // First check if the guest already chose a name and avatar before signing up
          // If they did, use those values directly instead of showing the onboarding modal
          if (hasCompleteStoredProfile()) {
            const guestProfile = getStoredProfile();
            logger.info('Guest already has stored profile, using those values:', guestProfile);

            // Get emoji and color for the stored avatar
            const { emoji, color } = getAvatarEmojiAndColor(guestProfile.avatarId || '');

            // Update the user's profile with the guest's chosen values
            const { error: updateError } = await updateProfile(userId, {
              display_name: guestProfile.username || userProfile.display_name || userProfile.username,
              avatar_image: guestProfile.avatarId || userProfile.avatar_image,
              avatar_emoji: emoji || userProfile.avatar_emoji,
              avatar_color: color || userProfile.avatar_color,
              has_customized_profile: true,
            });

            if (updateError) {
              logger.warn('Failed to update profile with guest data:', updateError);
            } else {
              logger.info('Profile updated with guest data, skipping onboarding modal');
            }

            // Clear the stored guest profile
            clearStoredProfile();

            // Continue to submit the pending result (don't return early)
          } else {
            // Guest hasn't set up their profile yet, show the onboarding modal
            logger.info('New user with pending result - triggering winner onboarding flow');
            setWinnerOnboarding({
              needsOnboarding: true,
              trigger: pending.trigger,
              initialName: userProfile.display_name || userProfile.username || '',
              initialAvatarId: userProfile.avatar_image || '',
            });
            // DON'T clear the pending result yet - it will be submitted after onboarding
            return;
          }
        }

        // Returning user or no trigger - submit immediately as before
        logger.info('Submitting pending daily result immediately');

        // Get guest player info for fallback
        const guestPlayer = await getGuestDailyPlayer();

        const bodyData: Record<string, unknown> = {
          puzzleDate: pending.puzzleDate,
          puzzleNumber: pending.puzzleNumber,
          language: pending.language,
          playerId: userId,
          guestFingerprint: null, // Now authenticated, use player ID
          displayName: userProfile.display_name || userProfile.username,
          avatarEmoji: userProfile.avatar_emoji || guestPlayer?.avatarEmoji || '',
          avatarColor: userProfile.avatar_color || guestPlayer?.avatarColor || '#6366f1',
          avatarImage: userProfile.avatar_image || undefined,
          solved: pending.result.solved,
          attemptsUsed: pending.result.attemptsUsed,
          targetWord: pending.result.targetWord,
          attemptWords: pending.result.attempts.map((a) => ({
          word: a.word,
          feedback: a.feedback.map((f) => ({
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
          logger.info('Successfully submitted pending daily result for new user');

          // Fetch rank for contextual celebration copy
          let rank: number | undefined;
          let percentile = 0;
          try {
            const statsRes = await fetch(
              `/api/daily-challenge/word-hunt/stats/${pending.puzzleDate}/${pending.language}?playerId=${userId}`
            );
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              rank = statsData?.yourStats?.rank;
              percentile = statsData?.yourStats?.percentile ?? 0;
            }
          } catch {
            // Non-critical — fall through to generic copy
          }

          let toastMsg: string;
          if (rank === 1) {
            toastMsg = t('daily.achievementRank1');
          } else if (rank !== undefined && percentile >= 90) {
            toastMsg = t('daily.achievementTopTen', { rank });
          } else if (rank !== undefined) {
            toastMsg = t('daily.achievementRanked', { rank });
          } else {
            toastMsg = t('daily.youreOnTheBoard');
          }

          toast.success(toastMsg, { duration: 4000 });
          trackDailySignupRank({ rank, percentile, puzzleDate: pending.puzzleDate, language: pending.language });
          router.push(`/${pending.language}/daily?showLeaderboard=true`);
        } else {
          const errorText = await response.text();
          logger.warn('Failed to submit pending daily result:', errorText);
        }
      } catch (err) {
        logger.warn('Error submitting pending daily result:', err);
      } finally {
        // Always clear the pending result regardless of success/failure
        clearPendingDailyResult();
      }
    },
    [router, t]
  );

  return { submitPendingDailyResult };
}
