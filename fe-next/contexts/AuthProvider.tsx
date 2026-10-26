'use client';

import React, { useEffect, useMemo, useRef, ReactNode } from 'react';
import { setSentryUser, clearSentryUser } from '@/utils/sentry';
import { syncAuthAnalyticsTransition } from '@/utils/authAnalytics';
import { consumePendingSignupCompletion, consumeSignupSource, isRecentAccount, maybeTrackSignupCompleted, setAnalyticsIdentity } from '@/utils/growthTracking';
import { markAuthProviderMounted } from '@/lib/auth/authProviderMounted';
import { persistProfileAttribution } from '@/utils/profileAttribution';
import type { AuthContextValue } from './auth/authTypes';
import { AuthContext } from './AuthContext';

// Hooks value-import @supabase/ssr (gotrue). This module is loaded only via
// dynamic import() from DeferredAuthProvider — never a static import of the
// landing EssentialProviders chunk.
import {
  useAuthState,
  useComputedAuthValues,
  usePendingDailyResult,
  useProfileManagement,
  useCrossTabSync,
  useAuthInitialization,
  useClearAuthState,
} from './auth';

// Evaluating this module means the gotrue chunk is already in memory.
// Analytics may attach a bearer token after this; before it, landing PSI
// must not import @/lib/supabase.
markAuthProviderMounted();

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
    isBetaTester,
    canSeeInWorkModes,
    isTeacher,
    needsProfileCustomization,
  } = useComputedAuthValues(user, profile, rankedProgress);

  // Sync user context with Sentry and PostHog.
  // Gated through syncAuthAnalyticsTransition so guest pageviews don't emit
  // spurious user_logged_out events (was firing 1:1 with $pageview on /he).
  const wasAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (user && profile) {
      setSentryUser(user, profile);
      // Stamp authed identity onto analytics events so the admin game log shows
      // real player names (analytics_events is anonymous without this).
      setAnalyticsIdentity(user.id, profile.display_name ?? profile.username);
      const docLang = typeof document !== 'undefined' ? document.documentElement.lang : '';
      const navLang =
        typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] ?? '' : '';
      const locale = docLang || navLang || 'en';
      const wasGuest = !wasAuthenticatedRef.current;
      wasAuthenticatedRef.current = syncAuthAnalyticsTransition({
        wasAuthenticated: wasAuthenticatedRef.current,
        identify: {
          userId: user.id,
          displayName: profile.display_name ?? profile.username,
          isAdmin,
          isTeacher,
          locale,
          email: user.email ?? null,
          isTestAccount: profile.is_test_account === true,
        },
      });
      // Resolve pending signup-prompt funnel only on guest → authed flips.
      // Re-identifies of an already-authed user must not re-fire completion.
      if (wasGuest) {
        // Unconditional canonical emit so PostHog "Signup Completed" goal
        // can attribute *any* signup source (header / menu / onboarding /
        // post-game prompt). Source disambiguator is read from the pending
        // sessionStorage key so the prompt path keeps its attribution.
        const pending =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('lexiclash_signup_funnel_pending')
            : null;
        // results_inline: a tap on the post-results inline card latches its
        // own source and wins attribution over the sheet funnel variant.
        const latchedSource = consumeSignupSource();
        const source = latchedSource ??
          (pending === 'first_win'
            ? 'first_win_prompt'
            : pending === 'multi_game'
            ? 'multi_game_prompt'
            : 'header_or_menu');
        // Re-fire-proof: only fires for a *just-created* account, deduped per
        // user per device. A restored session on cold load (returning user)
        // resets `wasGuest` to true via the in-memory ref, but its account is
        // not recent and/or already counted, so no spurious signup is emitted.
        maybeTrackSignupCompleted({ userId: user.id, createdAt: user.created_at, source });
        consumePendingSignupCompletion();
        // t_a80f937b: persist first-touch attribution (referrer domain,
        // landing path, utm_*) + the signup surface onto the profile — only
        // for a genuinely fresh account, server never overwrites non-null
        // values. Fire-and-forget; must never block the auth flow.
        if (isRecentAccount(user.created_at, Date.now())) {
          void persistProfileAttribution(source);
        }
        // Allowlist bridge: if this email was pre-approved for teacher access, consume the entry.
        if (user?.email) {
          fetch('/api/education/consume-allowlist', { method: 'POST' }).catch(() => {});
        }
        // Auto-friend the inviter if a `?ref=<username>` was captured from an
        // invite link before this signup. Dynamic import avoids a hard cycle
        // between AuthContext and friends utilities. Result is dispatched as a
        // DOM event so any mounted page (friends/PageClient) can show an
        // i18n-aware toast.
        void (async () => {
          try {
            const [{ consumePendingInviteRef }, friendsApi] = await Promise.all([
              import('@/utils/inviteRef'),
              import('@/utils/friends'),
            ]);
            const result = await consumePendingInviteRef({
              searchUsers: friendsApi.searchUsers,
              sendFriendRequest: friendsApi.sendFriendRequest,
            });
            if (!result) return;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('lc:invite-replay', { detail: result })
              );
            }
          } catch {
            // best-effort — never block auth flow
          }
        })();
      }
    } else {
      setAnalyticsIdentity(null);
      if (wasAuthenticatedRef.current) {
        clearSentryUser();
      }
      wasAuthenticatedRef.current = syncAuthAnalyticsTransition({
        wasAuthenticated: wasAuthenticatedRef.current,
        identify: null,
      });
    }
  }, [user, profile, isAdmin, isTeacher]);

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
      isBetaTester,
      canSeeInWorkModes,
      isTeacher,
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
      isBetaTester,
      canSeeInWorkModes,
      isTeacher,
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
