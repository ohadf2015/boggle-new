/**
 * useAuthState - Core auth state management hook
 *
 * Manages the fundamental auth state including user, profile, and ranked progress.
 * Provides state setters and refs for cross-component synchronization.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ProfileData, RankedProgress, AuthState, AuthStateSetters } from '../authTypes';
import { canAccessInWorkMode } from '@/lib/auth/inWorkModeAccess';

/**
 * Core auth state hook that manages user, profile, and ranked progress state.
 * Provides refs for stable identity comparisons across renders.
 */
export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [rankedProgress, setRankedProgress] = useState<RankedProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState<boolean>(false);

  // Track user ID in ref for comparisons to avoid stale closure issues
  // This prevents infinite loops when setUser is called with same user (different object reference)
  const userIdRef = useRef<string | null>(null);

  // Track last visible time for session validity checks on tab visibility change
  // Initialize with 0 and set actual time in effect to avoid impure function call during render
  const lastVisibleTimeRef = useRef<number>(0);

  // Keep ref in sync with user state - runs whenever user changes
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  // Initialize lastVisibleTimeRef on mount
  useEffect(() => {
    lastVisibleTimeRef.current = Date.now();
  }, []);

  // Memoize setters to provide stable references
  const setters: AuthStateSetters = useMemo(
    () => ({
      setUser,
      setProfile,
      setRankedProgress,
      setLoading,
      setIsSupabaseEnabled,
    }),
    []
  );

  return {
    user,
    profile,
    rankedProgress,
    loading,
    isSupabaseEnabled,
    userIdRef,
    lastVisibleTimeRef,
    setters,
  };
}

/**
 * Clear all auth state - used during sign out or error recovery
 */
export function clearAuthStateValues(setters: AuthStateSetters): void {
  setters.setUser(null);
  setters.setProfile(null);
  setters.setRankedProgress(null);
}

/**
 * Compute derived auth values from state
 */
export function useComputedAuthValues(
  user: User | null,
  profile: ProfileData | null,
  rankedProgress: RankedProgress | null
) {
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
  const isBetaTester = useMemo(() => !!profile?.is_beta_tester, [profile?.is_beta_tester]);
  // Durable chokepoint: in-work/preview modes are visible to admins OR beta
  // testers. Client mode-gates read this instead of bare isAdmin so a future
  // in-work mode gets beta access for free. See lib/auth/inWorkModeAccess.ts.
  const canSeeInWorkModes = useMemo(
    () => canAccessInWorkMode({ is_admin: profile?.is_admin, is_beta_tester: profile?.is_beta_tester }),
    [profile?.is_admin, profile?.is_beta_tester]
  );
  const isTeacher = useMemo(
    () => profile?.user_role === 'teacher' || profile?.user_role === 'admin',
    [profile?.user_role]
  );
  const needsProfileCustomization = useMemo(
    () => isAuthenticated && profile?.has_customized_profile === false,
    [isAuthenticated, profile?.has_customized_profile]
  );

  return {
    canPlayRanked,
    gamesUntilRanked,
    isAuthenticated,
    isGuest,
    isAdmin,
    isBetaTester,
    canSeeInWorkModes,
    isTeacher,
    needsProfileCustomization,
  };
}
