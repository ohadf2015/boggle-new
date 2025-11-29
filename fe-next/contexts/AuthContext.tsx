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
import logger from '@/utils/logger';
import type { User } from '@supabase/supabase-js';

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
  const fetchUserData = useCallback(async (userId: string) => {
    // Fetch profile
    const { data: profileData, error: profileError } = await getProfile(userId);

    if (profileError && (profileError as { code?: string }).code === 'PGRST116') {
      // Profile doesn't exist, will be created on first sign in
      return;
    }

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch ranked progress
    const { data: rankedData } = await getRankedProgress(userId);
    if (rankedData) {
      setRankedProgress(rankedData);
    }
  }, []);

  // Initialize and check auth state
  useEffect(() => {
    const initAuth = async () => {
      const configured = await isSupabaseConfigured();
      setIsSupabaseEnabled(configured);

      if (!configured || !supabase) {
        setLoading(false);
        return;
      }

      // Get initial session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Invalid refresh token or other auth error - clear state
          logger.warn('Session error, signing out:', error.message);
          await supabase.auth.signOut();
        } else if (session?.user) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        }
      } catch (err) {
        logger.warn('Failed to get session:', (err as Error).message);
      }
      setLoading(false);

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            await fetchUserData(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setRankedProgress(null);
          } else if (event === 'TOKEN_REFRESHED' && !session) {
            // Token refresh failed - sign out
            logger.warn('Token refresh failed, signing out');
            setUser(null);
            setProfile(null);
            setRankedProgress(null);
          }
        }
      );

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [fetchUserData]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
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

    const profileData: Partial<ProfileData> = {
      id: user.id,
      username,
      display_name: username,
      avatar_emoji: avatarEmoji || '🐶',
      avatar_color: avatarColor || '#4ECDC4',
      profile_picture_url: profilePictureUrl,
      profile_picture_provider: profilePictureProvider
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
