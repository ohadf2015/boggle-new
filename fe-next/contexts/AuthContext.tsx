'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
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
import { getGuestSessionId, getGuestStats, clearGuestData, hashToken } from '../utils/guestManager';
import { getUtmDataForProfile } from '../utils/utmCapture';
import logger from '@/utils/logger';
import type { User } from '@supabase/supabase-js';

// Fetch geolocation data from our API
async function fetchGeolocation(): Promise<{ countryCode: string | null; country?: string; city?: string }> {
  try {
    const response = await fetch('/api/geolocation', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { countryCode: null };
    }
    const data = await response.json();
    return {
      countryCode: data.countryCode || null,
      country: data.country,
      city: data.city,
    };
  } catch (error) {
    logger.warn('Failed to fetch geolocation:', error);
    return { countryCode: null };
  }
}

export interface ProfileData {
  id: string;
  username: string;
  display_name?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  profile_picture_url?: string | null;
  profile_picture_provider?: string | null;
  total_games?: number;
  total_score?: number;
  total_words?: number;
  longest_word?: string | null;
  longest_word_length?: number;
  achievement_counts?: Record<string, number>;
  current_level?: number;
  is_admin?: boolean;
  country_code?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RankedProgress {
  user_id: string;
  casual_games_played: number;
  unlocked_at?: string | null;
  current_rating?: number;
  ranked_games_played?: number;
}

export interface AuthContextValue {
  // State
  user: User | null;
  profile: ProfileData | null;
  rankedProgress: RankedProgress | null;
  loading: boolean;
  isSupabaseEnabled: boolean;

  // Computed
  isAuthenticated: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  canPlayRanked: boolean;
  gamesUntilRanked: number;

  // Actions
  setupProfile: (username: string, avatarEmoji?: string, avatarColor?: string) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
}

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

      // Generate a temporary username from the user ID
      const tempUsername = `player_${userId.substring(0, 8)}`;

      // Get display name from OAuth provider if available
      const displayName = (userMetadata?.full_name as string) ||
                          (userMetadata?.name as string) ||
                          tempUsername;

      const { data: newProfile, error: createError } = await createProfile({
        id: userId,
        username: tempUsername,
        display_name: displayName,
        avatar_emoji: '😀',
        avatar_color: '#6366f1',
        profile_picture_url: profilePictureUrl,
        profile_picture_provider: profilePictureProvider,
      });

      if (createError) {
        logger.error('Failed to create profile:', createError);
        return;
      }

      if (newProfile) {
        logger.info('Created minimal profile for user:', userId);
        setProfile(newProfile);

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
  }, []);

  // Helper to check if error is a refresh token error
  const isRefreshTokenError = (error: { code?: string; message?: string } | null): boolean => {
    if (!error) return false;
    const errorCode = error.code?.toLowerCase() || '';
    const errorMessage = error.message?.toLowerCase() || '';
    return (
      errorCode === 'refresh_token_not_found' ||
      errorMessage.includes('refresh token not found') ||
      errorMessage.includes('invalid refresh token') ||
      errorCode === 'bad_jwt' ||
      errorMessage.includes('jwt expired')
    );
  };

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
    let isMounted = true;

    const initAuth = async () => {
      const configured = await isSupabaseConfigured();
      if (!isMounted) return;
      setIsSupabaseEnabled(configured);

      if (!configured || !supabase) {
        setLoading(false);
        return;
      }

      // Get initial session with timeout to prevent slow connections from blocking UI
      try {
        // Wrap getSession with a 2 second timeout for fast failure on slow connections
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 2000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMounted) return;

        if (error) {
          if (isRefreshTokenError(error)) {
            await clearAuthState('Invalid or expired refresh token');
          } else {
            logger.warn('Session error, signing out:', error.message);
            await supabase.auth.signOut();
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
        const error = err as { code?: string; message?: string };
        if (error.message === 'Session fetch timeout') {
          logger.warn('Auth session fetch timed out - continuing without blocking');
        } else if (isRefreshTokenError(error)) {
          await clearAuthState('Invalid or expired refresh token');
        } else {
          logger.warn('Failed to get session:', error.message);
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
    };

    // Listen for auth errors from API calls
    const handleAuthError = (event: CustomEvent<{ code?: string; message?: string }>) => {
      if (isRefreshTokenError(event.detail)) {
        clearAuthState('Auth error: ' + event.detail.message);
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
      window.removeEventListener('supabase-auth-error', handleAuthError as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUserData, clearAuthState]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id, user.user_metadata);
    }
  }, [user, fetchUserData]);

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

  // Check if user can play ranked
  const canPlayRanked = (): boolean => {
    if (!profile) return false;
    if (rankedProgress?.unlocked_at) return true;
    return (rankedProgress?.casual_games_played || 0) >= 10;
  };

  // Get games until ranked unlock
  const gamesUntilRanked = (): number => {
    if (!profile) return 10;
    if (rankedProgress?.unlocked_at) return 0;
    const played = rankedProgress?.casual_games_played || 0;
    return Math.max(0, 10 - played);
  };

  const value: AuthContextValue = {
    // State
    user,
    profile,
    rankedProgress,
    loading,
    isSupabaseEnabled,

    // Computed
    isAuthenticated: !!user && !!profile,
    isGuest: !user,
    isAdmin: !!profile?.is_admin,
    canPlayRanked: canPlayRanked(),
    gamesUntilRanked: gamesUntilRanked(),

    // Actions
    setupProfile,
    updateProfile: updateUserProfile,
    refreshProfile
  };

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
