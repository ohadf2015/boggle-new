'use client';

import { createContext, useContext } from 'react';
import type { AuthContextValue } from './auth/authTypes';

// Re-export types for consumers. Type-only — must not pull the auth hooks
// barrel (that barrel value-imports @supabase/ssr / gotrue).
export type { ProfileData, RankedProgress, AuthContextValue } from './auth/authTypes';

export const AuthContext = createContext<AuthContextValue | null>(null);

// Default value for SSR and when AuthProvider has not mounted yet
// (landing defers the gotrue chunk until first interaction).
// loading=true prevents a flash of unauthenticated content.
const defaultAuthValue: AuthContextValue = {
  user: null,
  profile: null,
  rankedProgress: null,
  loading: true,
  isSupabaseEnabled: false,
  isAuthenticated: false,
  isGuest: true,
  isAdmin: false,
  isBetaTester: false,
  canSeeInWorkModes: false,
  isTeacher: false,
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
