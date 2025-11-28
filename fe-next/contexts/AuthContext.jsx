'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rankedProgress, setRankedProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState(false);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
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
          }
        }
      );

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, []);

  const fetchUserData = async (userId) => {
    // Fetch profile
    const { data: profileData, error: profileError } = await getProfile(userId);

    if (profileError && profileError.code === 'PGRST116') {
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
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user?.id]);

  // Create profile after OAuth sign up
  const setupProfile = async (username, avatarEmoji, avatarColor) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    const profileData = {
      id: user.id,
      username,
      display_name: username,
      avatar_emoji: avatarEmoji || '🐶',
      avatar_color: avatarColor || '#4ECDC4'
    };

    // Check if there's a guest session to merge
    const guestSessionId = getGuestSessionId();
    if (guestSessionId) {
      const tokenHash = await hashToken(guestSessionId);
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
  const updateUserProfile = async (updates) => {
    if (!user?.id) return { error: { message: 'Not authenticated' } };

    const { data, error } = await updateProfile(user.id, updates);

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  // Check if user can play ranked
  const canPlayRanked = () => {
    if (!profile) return false;
    if (rankedProgress?.unlocked_at) return true;
    return (rankedProgress?.casual_games_played || 0) >= 10;
  };

  // Get games until ranked unlock
  const gamesUntilRanked = () => {
    if (!profile) return 10;
    if (rankedProgress?.unlocked_at) return 0;
    const played = rankedProgress?.casual_games_played || 0;
    return Math.max(0, 10 - played);
  };

  const value = {
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
