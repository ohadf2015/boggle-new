'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  supabase,
  getProfile,
  createProfile,
  getRankedProgress,
  getGuestToken,
  claimGuestToken,
  updateProfile,
  isSupabaseConfigured
} from '../lib/supabase';
import { getGuestSessionId, clearGuestData, hashToken } from '../utils/guestManager';
import { getUtmDataForProfile } from '../utils/utmCapture';
import { getPendingDailyResult, clearPendingDailyResult, getGuestDailyPlayer, setWinnerOnboarding } from '../utils/dailyChallenge';
import logger from '@/utils/logger';
import { setSentryUser, clearSentryUser } from '@/utils/sentry';
import type { User } from '@supabase/supabase-js';
import { linkSessionToUser } from '@/utils/sessionTracking';
import { getRandomAvatar } from '@/utils/avatarConfig';
import {
  initCrossTabAuthSync,
  destroyCrossTabAuthSync,
  subscribeToAuthSync,
  broadcastSignedOut,
  broadcastAuthSuccess,
  type AuthSyncMessage,
} from '@/utils/crossTabAuthSync';

// Import types and utils from auth module
import type { ProfileData, RankedProgress, AuthContextValue } from './auth';
import {
  fetchGeolocation,
  fetchRandomPlayerName,
  fetchRandomGenericAvatar,
  isRefreshTokenError,
  isNetworkError,
  isRecoverableError,
  getAuthErrorMessage,
  type SupabaseAuthError,
} from './auth';

// Re-export types for consumers
export type { ProfileData, RankedProgress, AuthContextValue } from './auth';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [rankedProgress, setRankedProgress] = useState<RankedProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState<boolean>(false);

  /**
   * Submit any pending daily challenge result after OAuth signup
   * For new users: triggers winner onboarding flow first
   * For returning users: auto-saves immediately
   */
  const submitPendingDailyResult = useCallback(async (userId: string, userProfile: ProfileData) => {
    try {
      const pending = getPendingDailyResult();
      if (!pending) return;

      logger.info('Found pending daily result for user:', userId);

      // Check if this is a brand new user who hasn't customized their profile yet
      // If so, trigger the winner onboarding flow instead of immediate submission
      if (userProfile.has_customized_profile === false && pending.trigger) {
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
        avatarEmoji: userProfile.avatar_emoji || guestPlayer?.avatarEmoji || '🎯',
        avatarColor: userProfile.avatar_color || guestPlayer?.avatarColor || '#6366f1',
        avatarImage: userProfile.avatar_image || undefined,
        profilePictureUrl: userProfile.profile_picture_url || undefined,
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
        logger.info('Successfully submitted pending daily result for new user');
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
  }, []);

  // Define fetchUserData before useEffect to fix "variable used before declaration" error
  const fetchUserData = useCallback(async (userId: string, userMetadata?: Record<string, unknown>) => {
    // Fetch profile
    const { data: profileData, error: profileError } = await getProfile(userId);

    if (profileError && (profileError as { code?: string }).code === 'PGRST116') {
      // Profile doesn't exist - auto-create a minimal profile so auth works
      // User can update their username/avatar later via profile settings
      logger.info('Profile not found, creating minimal profile for user:', userId);

      // Extract profile picture from OAuth provider if available
      let profilePictureUrl: string | null = null;
      let profilePictureProvider: string | null = null;
      if (userMetadata?.avatar_url) {
        profilePictureUrl = userMetadata.avatar_url as string;
        profilePictureProvider = 'oauth';
      } else if (userMetadata?.picture) {
        profilePictureUrl = userMetadata.picture as string;
        profilePictureProvider = 'google';
      }

      // Get display name from OAuth provider if available
      // Extract FIRST NAME only from OAuth (e.g., "Anders Ekdahl" → "Anders")
      const oauthFullName = (userMetadata?.full_name as string) ||
                            (userMetadata?.name as string);

      // Helper to get first name with proper capitalization
      const getFirstName = (fullName: string): string => {
        if (!fullName) return '';
        const firstName = fullName.split(' ')[0];
        // Capitalize first letter, lowercase rest for Latin chars: "ANDERS" → "Anders"
        // For non-Latin (Hebrew, etc.), just return as-is
        if (/^[A-Z]+$/.test(firstName)) {
          return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        return firstName;
      };

      const oauthFirstName = oauthFullName ? getFirstName(oauthFullName) : null;

      // Generate username and avatar: use OAuth first name if available, otherwise get a fun random name
      let username: string;
      let avatarEmoji: string;
      let avatarColor: string;
      let displayName: string;

      // Always assign a random character avatar for new users
      const randomAvatar = getRandomAvatar();
      const avatarImage = randomAvatar.id;

      if (oauthFirstName) {
        // OAuth provided a display name - use first name with a generic avatar
        // Generic avatars are neutral and work with any name (unlike themed player names)
        username = oauthFirstName;
        displayName = oauthFirstName;
        const genericAvatar = await fetchRandomGenericAvatar();
        avatarEmoji = genericAvatar.emoji;
        avatarColor = genericAvatar.color;
      } else {
        // No OAuth display name - generate a fun random name with suited avatar
        const randomData = await fetchRandomPlayerName();
        username = randomData.name;
        displayName = randomData.name;
        avatarEmoji = randomData.avatar.emoji;
        avatarColor = randomData.avatar.color;
      }

      // Determine the avatar_image: use PROFILE_AVATAR_ID if we have a profile picture,
      // otherwise use the random character avatar
      const finalAvatarImage = profilePictureUrl ? '__profile_avatar__' : avatarImage;

      const { data: newProfile, error: createError } = await createProfile({
        id: userId,
        username,
        display_name: displayName,
        avatar_emoji: avatarEmoji,
        avatar_color: avatarColor,
        avatar_image: finalAvatarImage, // Use profile picture if available, otherwise character avatar
        profile_picture_url: profilePictureUrl,
        profile_picture_provider: profilePictureProvider,
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

        // Fetch geolocation and update in background
        fetchGeolocation().then(async (geoData) => {
          if (geoData.countryCode) {
            const { data: updatedProfile } = await updateProfile(userId, {
              country_code: geoData.countryCode
            });
            if (updatedProfile) {
              setProfile(updatedProfile);
            }
          }
        }).catch((err) => {
          logger.warn('Failed to update country_code:', err);
        });
      }

      // Fetch ranked progress for new user (will likely be empty)
      const { data: rankedData } = await getRankedProgress(userId);
      if (rankedData) {
        setRankedProgress(rankedData);
      }
      return;
    }

    if (profileData) {
      setProfile(profileData);

      // Submit any pending daily challenge result (from pre-signup or returning user)
      submitPendingDailyResult(userId, profileData);

      // If user doesn't have country_code yet, fetch and update it
      if (!profileData.country_code) {
        fetchGeolocation().then(async (geoData) => {
          if (geoData.countryCode) {
            const { data: updatedProfile } = await updateProfile(userId, {
              country_code: geoData.countryCode
            });
            if (updatedProfile) {
              setProfile(updatedProfile);
            }
          }
        }).catch((err) => {
          logger.warn('Failed to update country_code:', err);
        });
      }
    }

    // Fetch ranked progress
    const { data: rankedData } = await getRankedProgress(userId);
    if (rankedData) {
      setRankedProgress(rankedData);
    }
  }, [submitPendingDailyResult]);

  // Helper to clear auth state and sign out
  const clearAuthState = useCallback(async (reason: string) => {
    logger.warn(`Clearing auth state: ${reason}`);
    setUser(null);
    setProfile(null);
    setRankedProgress(null);
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore signout errors - we're already clearing state
      }
    }
  }, []);

  // Initialize and check auth state
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let crossTabUnsubscribe: (() => void) | null = null;
    let isMounted = true;

    // Initialize cross-tab auth sync
    initCrossTabAuthSync();

    const initAuth = async () => {
      const configured = await isSupabaseConfigured();
      if (!isMounted) return;
      setIsSupabaseEnabled(configured);

      if (!configured || !supabase) {
        setLoading(false);
        return;
      }

      // Get initial session with timeout to prevent slow connections from blocking UI
      // With middleware handling session refresh, this is mainly for initial state
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: SupabaseAuthError }>((_, reject) =>
          setTimeout(() => reject({ code: 'TIMEOUT', message: 'Session fetch timeout' }), 2000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMounted) return;

        if (error) {
          if (isRefreshTokenError(error)) {
            await clearAuthState('Invalid or expired refresh token');
          } else if (isRecoverableError(error)) {
            // Network errors - don't sign out, just log and continue
            logger.warn('Recoverable auth error:', getAuthErrorMessage(error));
          } else {
            logger.warn('Session error:', getAuthErrorMessage(error));
            // Only sign out on non-recoverable errors
            if (!isNetworkError(error)) {
              await supabase.auth.signOut();
            }
          }
        } else if (session?.user) {
          setUser(session.user);
          // Fetch user data in background, don't block loading state
          fetchUserData(session.user.id, session.user.user_metadata).catch((err) => {
            logger.warn('Failed to fetch user data:', err.message);
          });
        }
      } catch (err) {
        if (!isMounted) return;
        const error = err as SupabaseAuthError;
        if (error.message === 'Session fetch timeout' || error.code === 'TIMEOUT') {
          logger.warn('Auth session fetch timed out - continuing without blocking');
        } else if (isRefreshTokenError(error)) {
          await clearAuthState('Invalid or expired refresh token');
        } else if (isRecoverableError(error)) {
          logger.warn('Recoverable auth error during init:', getAuthErrorMessage(error));
        } else {
          logger.warn('Failed to get session:', getAuthErrorMessage(error));
        }
      }

      if (isMounted) {
        setLoading(false);
      }

      // Listen for auth changes (including cross-tab events)
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return;

          // Handle cross-tab auth state sync
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            // Link guest session to user account
            linkSessionToUser(session.user.id).catch((err) => {
              logger.warn('Failed to link guest session to user:', err);
            });
            // Only set loading if we don't already have profile data
            // This prevents loading state getting stuck on tab visibility change
            setLoading(currentLoading => {
              // If already loading, stay loading; if not loading and no profile, set loading
              // If we already have profile data, don't set loading - just refresh in background
              return currentLoading;
            });
            try {
              await fetchUserData(session.user.id, session.user.user_metadata);
            } finally {
              if (isMounted) {
                setLoading(false);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setRankedProgress(null);
            setLoading(false);
          } else if (event === 'TOKEN_REFRESHED') {
            if (!session) {
              // Token refresh failed - sign out
              await clearAuthState('Token refresh failed');
            }
            // Even on successful refresh, ensure loading is false
            if (isMounted) {
              setLoading(false);
            }
          } else if (event === 'INITIAL_SESSION') {
            // Handle initial session from other tabs - ensure loading is set
            if (session?.user) {
              setUser(session.user);
              // Link guest session to user account
              linkSessionToUser(session.user.id).catch((err) => {
                logger.warn('Failed to link guest session to user:', err);
              });
              try {
                await fetchUserData(session.user.id, session.user.user_metadata);
              } finally {
                if (isMounted) {
                  setLoading(false);
                }
              }
            } else {
              if (isMounted) {
                setLoading(false);
              }
            }
          }
        }
      );
      subscription = data.subscription;

      // Subscribe to cross-tab auth sync messages
      crossTabUnsubscribe = subscribeToAuthSync(async (message: AuthSyncMessage) => {
        if (!isMounted || !supabase) return;

        logger.debug(`AuthContext: Received cross-tab message: ${message.type}`);

        switch (message.type) {
          case 'AUTH_SUCCESS':
            // Another tab successfully authenticated - check for session
            logger.log('AuthContext: Another tab authenticated, checking for session');
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session?.user && isMounted) {
                // Session synced from other tab - update state
                setUser(sessionData.session.user);
                await fetchUserData(sessionData.session.user.id, sessionData.session.user.user_metadata);
                setLoading(false);
              }
            } catch (err) {
              logger.warn('AuthContext: Error handling cross-tab auth success:', err);
            }
            break;

          case 'SIGNED_OUT':
            // Another tab signed out - clear our state too
            logger.log('AuthContext: Another tab signed out, clearing state');
            setUser(null);
            setProfile(null);
            setRankedProgress(null);
            setLoading(false);
            break;

          case 'SESSION_REFRESHED':
            // Another tab refreshed the session - ensure we have fresh state
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session?.user && isMounted) {
                setUser(sessionData.session.user);
              }
            } catch (err) {
              logger.warn('AuthContext: Error handling cross-tab session refresh:', err);
            }
            break;

          default:
            // Ignore other message types (CODE_LOCK_ACQUIRED, CODE_LOCK_RELEASED)
            break;
        }
      });
    };

    // Listen for auth errors from API calls
    const handleAuthError = (event: CustomEvent<SupabaseAuthError>) => {
      const error = event.detail;
      if (isRefreshTokenError(error)) {
        clearAuthState('Auth error: ' + getAuthErrorMessage(error));
      } else if (isRecoverableError(error)) {
        logger.warn('Recoverable auth error:', getAuthErrorMessage(error));
      } else {
        logger.error('Auth error:', getAuthErrorMessage(error));
      }
    };
    window.addEventListener('supabase-auth-error', handleAuthError as EventListener);

    // Handle tab visibility change - ensure loading is reset when coming back to tab
    // This prevents the avatar section from being stuck at loading
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        // When tab becomes visible, ensure loading is reset after a short delay
        // This catches any edge cases where loading got stuck
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (isMounted) {
            setLoading(currentLoading => {
              if (currentLoading) {
                logger.warn('Tab visibility change - forcing loading to false');
                return false;
              }
              return currentLoading;
            });
          }
        }, 1500); // Short delay to allow normal auth flow to complete
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    initAuth();

    // Safety timeout: ensure loading is set to false after 3 seconds
    // This prevents infinite loading states due to network issues or edge cases
    // Reduced from 10s to 3s for better UX on slow connections
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        // Use functional update to check current loading state
        setLoading(currentLoading => {
          if (currentLoading) {
            logger.warn('Auth loading timeout - forcing loading to false');
            return false;
          }
          return currentLoading;
        });
      }
    }, 3000);

    // Cleanup function - properly returned from useEffect
    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
      if (crossTabUnsubscribe) {
        crossTabUnsubscribe();
      }
      destroyCrossTabAuthSync();
      window.removeEventListener('supabase-auth-error', handleAuthError as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUserData, clearAuthState]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id, user.user_metadata);
    }
  }, [user, fetchUserData]);

  // Sync user context with Sentry for error tracking
  useEffect(() => {
    if (user && profile) {
      setSentryUser(user, profile);
    } else {
      clearSentryUser();
    }
  }, [user, profile]);

  // Create profile after OAuth sign up
  const setupProfile = async (username: string, avatarEmoji?: string, avatarColor?: string) => {
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    // Extract profile picture from OAuth provider metadata
    const userMetadata = user.user_metadata;
    let profilePictureUrl: string | null = null;
    let profilePictureProvider: string | null = null;

    // Google provides 'avatar_url' or 'picture' in user_metadata
    if (userMetadata?.avatar_url) {
      profilePictureUrl = userMetadata.avatar_url;
      profilePictureProvider = user.app_metadata?.provider || 'oauth';
    } else if (userMetadata?.picture) {
      profilePictureUrl = userMetadata.picture;
      profilePictureProvider = 'google';
    }

    // Fetch geolocation data for analytics
    const geoData = await fetchGeolocation();

    // Get UTM and referral data captured during user's first visit
    const utmData = getUtmDataForProfile();

    const profileData: Partial<ProfileData> = {
      id: user.id,
      username,
      display_name: username,
      avatar_emoji: avatarEmoji || '🐶',
      avatar_color: avatarColor || '#4ECDC4',
      profile_picture_url: profilePictureUrl,
      profile_picture_provider: profilePictureProvider,
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
          profileData.total_games = guestData.stats.games || 0;
          profileData.total_score = guestData.stats.score || 0;
          profileData.total_words = guestData.stats.words || 0;
          profileData.longest_word = guestData.stats.longestWord || null;
          profileData.longest_word_length = guestData.stats.longestWord?.length || 0;
          profileData.achievement_counts = guestData.stats.achievementCounts || {};

          // Mark guest token as claimed
          await claimGuestToken(tokenHash, user.id);
        }
      }

      // Clear local guest data
      clearGuestData();
    }

    const { data, error } = await createProfile(profileData);

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  // Update profile
  const updateUserProfile = async (updates: Partial<ProfileData>) => {
    if (!user?.id) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await updateProfile(user.id, updates);

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  // Memoize computed values to prevent recalculation on every render
  const canPlayRanked = useMemo((): boolean => {
    if (!profile) return false;
    if (rankedProgress?.unlocked_at) return true;
    return (rankedProgress?.casual_games_played || 0) >= 10;
  }, [profile, rankedProgress?.unlocked_at, rankedProgress?.casual_games_played]);

  const gamesUntilRanked = useMemo((): number => {
    if (!profile) return 10;
    if (rankedProgress?.unlocked_at) return 0;
    const played = rankedProgress?.casual_games_played || 0;
    return Math.max(0, 10 - played);
  }, [profile, rankedProgress?.unlocked_at, rankedProgress?.casual_games_played]);

  const isAuthenticated = useMemo(() => !!user && !!profile, [user, profile]);
  const isGuest = useMemo(() => !user, [user]);
  const isAdmin = useMemo(() => !!profile?.is_admin, [profile?.is_admin]);
  const needsProfileCustomization = useMemo(
    () => isAuthenticated && profile?.has_customized_profile === false,
    [isAuthenticated, profile?.has_customized_profile]
  );

  // Memoize the context value to prevent unnecessary re-renders of all consumers
  // This is critical for performance - without this, every state change causes all
  // consumers (Header, GamePage, ProfilePage, etc.) to re-render
  const value: AuthContextValue = useMemo(() => ({
    // State
    user,
    profile,
    rankedProgress,
    loading,
    isSupabaseEnabled,

    // Computed (memoized above)
    isAuthenticated,
    isGuest,
    isAdmin,
    canPlayRanked,
    gamesUntilRanked,
    needsProfileCustomization,

    // Actions
    setupProfile,
    updateProfile: updateUserProfile,
    refreshProfile
  }), [
    user,
    profile,
    rankedProgress,
    loading,
    isSupabaseEnabled,
    isAuthenticated,
    isGuest,
    isAdmin,
    canPlayRanked,
    gamesUntilRanked,
    needsProfileCustomization,
    // Note: setupProfile, updateUserProfile, refreshProfile are stable due to their definitions
    refreshProfile
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
