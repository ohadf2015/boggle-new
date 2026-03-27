/**
 * useProfileManagement - Profile fetch, create, and update operations
 *
 * Handles all profile-related operations including:
 * - Fetching user profile and ranked progress
 * - Creating new profiles for OAuth signups
 * - Updating existing profiles
 * - Syncing guest daily results to authenticated accounts
 */

import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getProfile,
  createProfile,
  getRankedProgress,
  updateProfile,
  getGuestToken,
  claimGuestToken,
} from '@/lib/supabase';
import { getGuestSessionId, clearGuestData, hashToken } from '@/utils/guestManager';
import { getUtmDataForProfile } from '@/utils/utmCapture';
import { syncGuestDailyResultsToAccount } from '@/utils/dailyChallenge';
import { getRandomAvatar, getAvatarEmojiAndColor } from '@/utils/avatarConfig';
import { getRandomAvatarConfig } from '@/shared/types/customAvatar';
import { captureBackgroundError } from '@/utils/sentry';
import logger from '@/utils/logger';
import { fetchGeolocation, fetchRandomPlayerName, extractOAuthDisplayName } from '../authUtils';
import type { ProfileData, AuthStateSetters } from '../authTypes';

interface UseProfileManagementParams {
  user: User | null;
  setters: AuthStateSetters;
  submitPendingDailyResult: (userId: string, userProfile: ProfileData) => Promise<void>;
}

interface ProfileManagementResult {
  fetchUserData: (userId: string, userMetadata?: Record<string, unknown>) => Promise<void>;
  setupProfile: (
    username: string,
    avatarEmoji?: string,
    avatarColor?: string
  ) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  updateUserProfile: (
    updates: Partial<ProfileData>
  ) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
}

/**
 * Sync guest daily results to authenticated account in background
 */
async function syncGuestResults(
  userId: string,
  profileData: ProfileData
): Promise<void> {
  try {
    const syncedCount = await syncGuestDailyResultsToAccount(userId, {
      display_name: profileData.display_name ?? null,
      username: profileData.username,
      avatar_emoji: profileData.avatar_emoji ?? null,
      avatar_color: profileData.avatar_color ?? null,
      avatar_image: profileData.avatar_image ?? null,
    });
    if (syncedCount > 0) {
      logger.info(`Synced ${syncedCount} guest daily results to account`);
    }
  } catch (err) {
    logger.warn('Failed to sync guest daily results:', err);
    captureBackgroundError(err instanceof Error ? err : new Error(String(err)), {
      operation: 'sync_guest_daily_results',
      service: 'dailyChallenge',
      userId,
    });
  }
}

/**
 * Update user's country code from geolocation in background
 */
async function updateCountryCode(
  userId: string,
  setProfile: AuthStateSetters['setProfile']
): Promise<void> {
  try {
    const geoData = await fetchGeolocation();
    if (geoData.countryCode) {
      const { data: updatedProfile } = await updateProfile(userId, {
        country_code: geoData.countryCode,
      });
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    }
  } catch (err) {
    logger.warn('Failed to update country_code:', err);
    captureBackgroundError(err instanceof Error ? err : new Error(String(err)), {
      operation: 'geolocation_update',
      service: 'geolocation',
      userId,
    });
  }
}

/**
 * Create a new profile for a user who signed up via OAuth
 */
async function createNewProfile(
  userId: string,
  userMetadata: Record<string, unknown> | undefined,
  setProfile: AuthStateSetters['setProfile'],
  setRankedProgress: AuthStateSetters['setRankedProgress'],
  submitPendingDailyResult: (userId: string, userProfile: ProfileData) => Promise<void>
): Promise<void> {
  logger.info('Profile not found, creating minimal profile for user:', userId);

  // Extract name from OAuth provider (Google, Discord, Apple)
  const oauthName = extractOAuthDisplayName(userMetadata);

  // Generate username and avatar: use OAuth name if available, otherwise get a fun random name
  let username: string;
  let displayName: string;

  // Always assign a random character avatar for new users as fallback
  const randomAvatar = getRandomAvatar();
  const avatarImage = randomAvatar.id;

  if (oauthName) {
    username = oauthName;
    displayName = oauthName;
  } else {
    // No OAuth display name - generate a fun random name
    const randomData = await fetchRandomPlayerName();
    username = randomData.name;
    displayName = randomData.name;
  }

  const finalAvatarImage = avatarImage;

  // Get legacy emoji/color from the character avatar (for backward compatibility with DB)
  const { emoji: avatarEmoji, color: avatarColor } = getAvatarEmojiAndColor(avatarImage);

  const randomCustomAvatar = getRandomAvatarConfig();

  const { data: newProfile, error: createError } = await createProfile({
    id: userId,
    username,
    display_name: displayName,
    avatar_emoji: avatarEmoji,
    avatar_color: avatarColor,
    avatar_image: finalAvatarImage,
    avatar_config: randomCustomAvatar,
    has_customized_profile: false, // Will prompt user to customize after sign-in
  });

  if (createError) {
    logger.error('Failed to create profile:', createError);
    return;
  }

  if (newProfile) {
    logger.info('Created minimal profile for user:', userId);
    setProfile(newProfile);

    // Submit any pending daily challenge result (from pre-signup)
    submitPendingDailyResult(userId, newProfile);

    // Sync ALL guest daily challenge results to authenticated account
    syncGuestResults(userId, newProfile);

    // Fetch geolocation and update in background
    updateCountryCode(userId, setProfile);
  }

  // Fetch ranked progress for new user (will likely be empty)
  const { data: rankedData } = await getRankedProgress(userId);
  if (rankedData) {
    setRankedProgress(rankedData);
  }
}

/**
 * Hook for profile management operations
 */
export function useProfileManagement({
  user,
  setters,
  submitPendingDailyResult,
}: UseProfileManagementParams): ProfileManagementResult {
  const { setProfile, setRankedProgress } = setters;

  /**
   * Fetch user data (profile and ranked progress) for a given user ID
   */
  const fetchUserData = useCallback(
    async (userId: string, userMetadata?: Record<string, unknown>) => {
      // Fetch profile
      const { data: profileData, error: profileError } = await getProfile(userId);

      if (profileError && (profileError as { code?: string }).code === 'PGRST116') {
        // Profile doesn't exist - auto-create a minimal profile so auth works
        await createNewProfile(
          userId,
          userMetadata,
          setProfile,
          setRankedProgress,
          submitPendingDailyResult
        );
        return;
      }

      if (profileData) {
        setProfile(profileData);

        // Auto-assign random custom avatar for existing users who don't have one
        if (!profileData.avatar_config) {
          const randomConfig = getRandomAvatarConfig();
          updateProfile(userId, { avatar_config: randomConfig }).then(({ data }) => {
            if (data) setProfile(data);
          }).catch(() => {});
        }

        // Submit any pending daily challenge result (from pre-signup or returning user)
        submitPendingDailyResult(userId, profileData);

        // Sync ALL guest daily challenge results to authenticated account
        syncGuestResults(userId, profileData);

        // If user doesn't have country_code yet, fetch and update it
        if (!profileData.country_code) {
          updateCountryCode(userId, setProfile);
        }
      }

      // Fetch ranked progress
      const { data: rankedData } = await getRankedProgress(userId);
      if (rankedData) {
        setRankedProgress(rankedData);
      }
    },
    [setProfile, setRankedProgress, submitPendingDailyResult]
  );

  /**
   * Create profile after OAuth sign up with optional guest data merge
   */
  const setupProfile = useCallback(
    async (username: string, avatarEmoji?: string, avatarColor?: string) => {
      if (!user) return { data: null, error: { message: 'Not authenticated' } };

      // Fetch geolocation data for analytics
      const geoData = await fetchGeolocation();

      // Get UTM and referral data captured during user's first visit
      const utmData = getUtmDataForProfile();

      const profilePayload: Partial<ProfileData> = {
        id: user.id,
        username,
        display_name: username,
        avatar_emoji: avatarEmoji || '',
        avatar_color: avatarColor || '#4ECDC4',
        country_code: geoData.countryCode,
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        referrer: utmData.referrer,
      };

      // Check if there's a guest session to merge
      const guestSessionId = getGuestSessionId();
      if (guestSessionId) {
        const tokenHash = await hashToken(guestSessionId);
        if (tokenHash) {
          const { data: guestData } = await getGuestToken(tokenHash);

          if (guestData?.stats) {
            // Merge guest stats into profile
            profilePayload.total_games = guestData.stats.games || 0;
            profilePayload.total_score = guestData.stats.score || 0;
            profilePayload.total_words = guestData.stats.words || 0;
            profilePayload.longest_word = guestData.stats.longestWord || null;
            profilePayload.longest_word_length = guestData.stats.longestWord?.length || 0;
            profilePayload.achievement_counts = guestData.stats.achievementCounts || {};

            // Mark guest token as claimed
            await claimGuestToken(tokenHash, user.id);
          }
        }

        // Clear local guest data
        clearGuestData();
      }

      const { data, error } = await createProfile(profilePayload);

      if (!error && data) {
        setProfile(data);
      }

      return { data, error };
    },
    [user, setProfile]
  );

  /**
   * Update existing user profile
   */
  const updateUserProfile = useCallback(
    async (updates: Partial<ProfileData>) => {
      if (!user?.id) return { data: null, error: { message: 'Not authenticated' } };

      const { data, error } = await updateProfile(user.id, updates);

      if (!error && data) {
        setProfile(data);
      }

      return { data, error };
    },
    [user, setProfile]
  );

  /**
   * Refresh profile data from server
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id, user.user_metadata);
    }
  }, [user, fetchUserData]);

  return {
    fetchUserData,
    setupProfile,
    updateUserProfile,
    refreshProfile,
  };
}
