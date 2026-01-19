'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, ReactNode } from 'react';
import { setSentryUser, clearSentryUser } from '@/utils/sentry';

// Import types and hooks from auth module
import {
  type ProfileData,
  type RankedProgress,
  type AuthContextValue,
  useAuthState,
  useComputedAuthValues,
  usePendingDailyResult,
  useProfileManagement,
  useCrossTabSync,
  useAuthInitialization,
  useClearAuthState,
} from './auth';

// Re-export types for consumers
export type { ProfileData, RankedProgress, AuthContextValue } from './auth';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Central authentication context provider
 *
 * Composes multiple specialized hooks to provide complete auth functionality:
 * - useAuthState: Core state management (user, profile, rankedProgress)
 * - usePendingDailyResult: Handles pending daily challenge submissions
 * - useProfileManagement: Profile CRUD operations
 * - useCrossTabSync: Cross-tab auth synchronization
 * - useAuthInitialization: Auth lifecycle and Supabase subscription
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  // Core auth state
  const authState = useAuthState();
  const { user, profile, rankedProgress, loading, isSupabaseEnabled, userIdRef, lastVisibleTimeRef, setters } =
    authState;

  // Mounted ref for cleanup safety
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Pending daily result submission
  const { submitPendingDailyResult } = usePendingDailyResult();

  // Profile management
  const { fetchUserData, setupProfile, updateUserProfile, refreshProfile } = useProfileManagement({
    user,
    setters,
    submitPendingDailyResult,
  });

  // Clear auth state helper
  const clearAuthState = useClearAuthState(setters);

  // Cross-tab synchronization
  useCrossTabSync({
    userIdRef,
    setters,
    fetchUserData,
    clearAuthState,
    isMountedRef,
  });

  // Auth initialization and lifecycle
  useAuthInitialization({
    userIdRef,
    lastVisibleTimeRef,
    setters,
    fetchUserData,
  });

  // Computed auth values
  const {
    canPlayRanked,
    gamesUntilRanked,
    isAuthenticated,
    isGuest,
    isAdmin,
    needsProfileCustomization,
  } = useComputedAuthValues(user, profile, rankedProgress);

  // Sync user context with Sentry for error tracking
  useEffect(() => {
    if (user && profile) {
      setSentryUser(user, profile);
    } else {
      clearSentryUser();
    }
  }, [user, profile]);

  // Memoize the context value to prevent unnecessary re-renders of all consumers
  const value: AuthContextValue = useMemo(
    () => ({
      // State
      user,
      profile,
      rankedProgress,
      loading,
      isSupabaseEnabled,

      // Computed
      isAuthenticated,
      isGuest,
      isAdmin,
      canPlayRanked,
      gamesUntilRanked,
      needsProfileCustomization,

      // Actions
      setupProfile,
      updateProfile: updateUserProfile,
      refreshProfile,
    }),
    [
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
      setupProfile,
      updateUserProfile,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Default value for SSR and when context is unavailable
// This allows components to render safely during SSR before hydration
const defaultAuthValue: AuthContextValue = {
  user: null,
  profile: null,
  rankedProgress: null,
  loading: true, // Important: loading=true during SSR prevents flash of unauthenticated content
  isSupabaseEnabled: false,
  isAuthenticated: false,
  isGuest: true,
  isAdmin: false,
  canPlayRanked: false,
  gamesUntilRanked: 10,
  needsProfileCustomization: false,
  setupProfile: async () => ({ data: null, error: { message: 'Auth not initialized' } }),
  updateProfile: async () => ({ data: null, error: { message: 'Auth not initialized' } }),
  refreshProfile: async () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  // Return default value during SSR or when outside provider
  // This prevents "useAuth must be used within an AuthProvider" errors during SSR
  if (!context) {
    // Only warn in development if we're in browser (likely a real misconfiguration)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('useAuth called outside AuthProvider, returning default value');
    }
    return defaultAuthValue;
  }
  return context;
}
