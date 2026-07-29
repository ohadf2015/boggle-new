/**
 * useAuthInitialization - Auth lifecycle management
 *
 * Orchestrates the complete auth initialization and lifecycle:
 * - Initial session check with timeout
 * - Supabase auth state change subscription
 * - Tab visibility change handling
 * - Auth error event handling
 * - Loading state safety timeouts
 */

import { useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { linkSessionToUser } from '@/utils/sessionTracking';
import { registerPushToken, unregisterPushToken } from '@/utils/pushNotifications/tokenRegistration';
import { broadcastSessionRefreshed } from '@/utils/crossTabAuthSync';
import { captureBackgroundError } from '@/utils/sentry';
import { triggerWelcomeEmail } from '@/lib/welcome/triggerWelcomeEmail';
import logger from '@/utils/logger';
import {
  isRefreshTokenError,
  isNetworkError,
  isRecoverableError,
  getAuthErrorMessage,
  type SupabaseAuthError,
} from '../authUtils';
import type { AuthStateSetters } from '../authTypes';

// Constants for timeout values
// Increased from 2s to 5s to accommodate slower mobile connections (fixes JAVASCRIPT-NEXTJS-11)
const SESSION_FETCH_TIMEOUT_MS = 5000;
const LOADING_SAFETY_TIMEOUT_MS = 6000; // Increased to match new session timeout
const TAB_VISIBILITY_LOADING_TIMEOUT_MS = 1500;
const TEN_MINUTES_MS = 10 * 60 * 1000;

interface UseAuthInitializationParams {
  userIdRef: React.MutableRefObject<string | null>;
  lastVisibleTimeRef: React.MutableRefObject<number>;
  setters: AuthStateSetters;
  fetchUserData: (userId: string, userMetadata?: Record<string, unknown>) => Promise<void>;
}

/**
 * Clear auth state and optionally sign out from Supabase
 */
export function useClearAuthState(
  setters: AuthStateSetters
): (reason: string) => Promise<void> {
  const { setUser, setProfile, setRankedProgress } = setters;

  return useCallback(
    async (reason: string) => {
      logger.log(`Clearing auth state: ${reason}`);
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
    },
    [setUser, setProfile, setRankedProgress]
  );
}

/**
 * Hook for auth initialization and lifecycle management
 */
export function useAuthInitialization({
  userIdRef,
  lastVisibleTimeRef,
  setters,
  fetchUserData,
}: UseAuthInitializationParams): void {
  const { setUser, setProfile, setRankedProgress, setLoading, setIsSupabaseEnabled } = setters;
  const isMountedRef = useRef(true);
  const clearAuthState = useClearAuthState(setters);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let visibilityTimeout: NodeJS.Timeout | null = null;
    isMountedRef.current = true;

    const initAuth = async () => {
      const configured = await isSupabaseConfigured();
      if (!isMountedRef.current) return;
      setIsSupabaseEnabled(configured);

      if (!configured || !supabase) {
        setLoading(false);
        return;
      }

      // Get initial session with timeout to prevent slow connections from blocking UI
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: SupabaseAuthError }>(
          (_, reject) =>
            setTimeout(
              () => reject({ code: 'TIMEOUT', message: 'Session fetch timeout' }),
              SESSION_FETCH_TIMEOUT_MS
            )
        );

        const {
          data: { session },
          error,
        } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMountedRef.current) return;

        if (error) {
          await handleSessionError(error, clearAuthState);
        } else if (session?.user) {
          // Only update user if ID changed to prevent infinite loops
          if (session.user.id !== userIdRef.current) {
            setUser(session.user);
            // Fetch user data in background, don't block loading state
            fetchUserData(session.user.id, session.user.user_metadata).catch((err) => {
              logger.warn('Failed to fetch user data:', err.message);
              captureBackgroundError(err instanceof Error ? err : new Error(String(err)), {
                operation: 'fetch_user_data',
                service: 'auth',
                userId: session.user.id,
              });
            });
            registerPushToken().catch(() => {});
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        await handleInitError(err as SupabaseAuthError, clearAuthState);
      }

      if (isMountedRef.current) {
        setLoading(false);
      }

      // Listen for auth changes (including cross-tab events)
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMountedRef.current) return;

        // New-signup welcome email. Fire-and-forget — server is idempotent and
        // NEW-signups-only, so calling on any SIGNED_IN is safe and covers every
        // signup method (OAuth, email/password, magic-link, OTP).
        if (event === 'SIGNED_IN' && session) {
          void triggerWelcomeEmail(session.access_token);
        }

        await handleAuthStateChange(
          event,
          session?.user ?? null,
          userIdRef,
          setters,
          fetchUserData,
          clearAuthState,
          isMountedRef
        );
      });
      subscription = data.subscription;
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

    // Handle tab visibility change
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        await handleTabBecameVisible(
          userIdRef,
          lastVisibleTimeRef,
          setters,
          fetchUserData,
          clearAuthState,
          isMountedRef
        );

        // Update last visible timestamp
        lastVisibleTimeRef.current = Date.now();

        // Existing loading state reset logic
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            setLoading((currentLoading) => {
              if (currentLoading) {
                logger.warn('Tab visibility change - forcing loading to false');
                return false;
              }
              return currentLoading;
            });
          }
        }, TAB_VISIBILITY_LOADING_TIMEOUT_MS);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    initAuth();

    // Safety timeout: ensure loading is set to false after 3 seconds
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading((currentLoading) => {
          if (currentLoading) {
            logger.debug('Auth loading timeout - forcing loading to false');
            return false;
          }
          return currentLoading;
        });
      }
    }, LOADING_SAFETY_TIMEOUT_MS);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      clearTimeout(loadingTimeout);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
      window.removeEventListener('supabase-auth-error', handleAuthError as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    userIdRef,
    lastVisibleTimeRef,
    setters,
    setUser,
    setProfile,
    setRankedProgress,
    setLoading,
    setIsSupabaseEnabled,
    fetchUserData,
    clearAuthState,
  ]);
}

/**
 * Handle session fetch errors
 */
async function handleSessionError(
  error: SupabaseAuthError,
  clearAuthState: (reason: string) => Promise<void>
): Promise<void> {
  if (isRefreshTokenError(error)) {
    await clearAuthState('Invalid or expired refresh token');
  } else if (isRecoverableError(error)) {
    logger.debug('Recoverable auth error:', getAuthErrorMessage(error));
  } else {
    logger.debug('Session error:', getAuthErrorMessage(error));
    if (!isNetworkError(error) && supabase) {
      await supabase.auth.signOut();
    }
  }
}

/**
 * Handle init errors (timeouts, network issues, etc.)
 */
async function handleInitError(
  error: SupabaseAuthError,
  clearAuthState: (reason: string) => Promise<void>
): Promise<void> {
  if (error.message === 'Session fetch timeout' || error.code === 'TIMEOUT') {
    // Changed from warn to info - this is expected behavior on slow connections (JAVASCRIPT-NEXTJS-11)
    logger.info('Auth session fetch timed out after 5s - continuing without blocking');
  } else if (isRefreshTokenError(error)) {
    await clearAuthState('Invalid or expired refresh token');
  } else if (isRecoverableError(error)) {
    logger.debug('Recoverable auth error during init:', getAuthErrorMessage(error));
  } else {
    logger.debug('Failed to get session:', getAuthErrorMessage(error));
  }
}

/**
 * Handle Supabase auth state change events
 */
async function handleAuthStateChange(
  event: string,
  sessionUser: User | null,
  userIdRef: React.MutableRefObject<string | null>,
  setters: AuthStateSetters,
  fetchUserData: (userId: string, userMetadata?: Record<string, unknown>) => Promise<void>,
  clearAuthState: (reason: string) => Promise<void>,
  isMountedRef: React.MutableRefObject<boolean>
): Promise<void> {
  const { setUser, setProfile, setRankedProgress, setLoading } = setters;

  switch (event) {
    case 'SIGNED_IN':
      if (sessionUser) {
        const isNewUser = sessionUser.id !== userIdRef.current;
        if (isNewUser) {
          setUser(sessionUser);
          linkSessionToUser(sessionUser.id).catch((err) => {
            logger.debug('Failed to link guest session to user:', err);
            captureBackgroundError(err instanceof Error ? err : new Error(String(err)), {
              operation: 'link_session_to_user',
              service: 'sessionTracking',
              userId: sessionUser.id,
            });
          });
          try {
            await fetchUserData(sessionUser.id, sessionUser.user_metadata);
          } finally {
            if (isMountedRef.current) {
              setLoading(false);
            }
          }
          // Register push token for native mobile apps (fire-and-forget)
          registerPushToken().catch(() => {});
          // Check for pending classroom join after successful sign-in
          if (typeof window !== 'undefined') {
            const pendingJoinCode = sessionStorage.getItem('joinClassroomReturnCode');
            if (pendingJoinCode) {
              sessionStorage.removeItem('joinClassroomReturnCode');
              // Redirect to join page with the code
              const currentLocale = window.location.pathname.split('/')[1] || 'en';
              window.location.href = `/${currentLocale}/join/${pendingJoinCode}`;
            }
          }
        }
      }
      break;

    case 'SIGNED_OUT':
      unregisterPushToken().catch(() => {});
      setUser(null);
      setProfile(null);
      setRankedProgress(null);
      setLoading(false);
      break;

    case 'TOKEN_REFRESHED':
      if (!sessionUser) {
        await clearAuthState('Token refresh failed');
      } else {
        broadcastSessionRefreshed(sessionUser.id);
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
      break;

    case 'INITIAL_SESSION':
      if (sessionUser) {
        const isNewUser = sessionUser.id !== userIdRef.current;
        if (isNewUser) {
          setUser(sessionUser);
          linkSessionToUser(sessionUser.id).catch((err) => {
            logger.debug('Failed to link guest session to user:', err);
            captureBackgroundError(err instanceof Error ? err : new Error(String(err)), {
              operation: 'link_session_to_user',
              service: 'sessionTracking',
              userId: sessionUser.id,
            });
          });
          try {
            await fetchUserData(sessionUser.id, sessionUser.user_metadata);
          } finally {
            if (isMountedRef.current) {
              setLoading(false);
            }
          }
        } else {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      } else {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
      break;

    default:
      break;
  }
}

/**
 * Handle tab becoming visible - verify session and sync state
 */
async function handleTabBecameVisible(
  userIdRef: React.MutableRefObject<string | null>,
  lastVisibleTimeRef: React.MutableRefObject<number>,
  setters: AuthStateSetters,
  fetchUserData: (userId: string, userMetadata?: Record<string, unknown>) => Promise<void>,
  clearAuthState: (reason: string) => Promise<void>,
  isMountedRef: React.MutableRefObject<boolean>
): Promise<void> {
  const { setUser } = setters;
  const now = Date.now();
  const timeInactive = now - lastVisibleTimeRef.current;
  const currentUserId = userIdRef.current;

  if (timeInactive > TEN_MINUTES_MS && currentUserId) {
    // Verify session is still valid after long inactivity
    logger.log('Tab visible after long inactivity, checking session validity');
    if (supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session && isMountedRef.current) {
        logger.log('Session expired during inactivity');
        await clearAuthState('Session expired during inactivity');
        return;
      }
    }
  }

  // Always sync session when tab becomes visible (fixes stuck auth issue)
  logger.log('Tab became visible, syncing session state');
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      if (sessionData.session.user.id !== userIdRef.current) {
        if (isMountedRef.current) {
          logger.log('Session synced from cookies on tab visibility');
          setUser(sessionData.session.user);
          try {
            await fetchUserData(
              sessionData.session.user.id,
              sessionData.session.user.user_metadata
            );
          } catch (err) {
            logger.warn('Error fetching user data on tab visibility:', err);
          }
        }
      }
    } else if (userIdRef.current && isMountedRef.current) {
      // Downgraded warn → debug: expected when user logs out in another tab.
      logger.debug('No session found on tab visibility but user state exists');
      await clearAuthState('Session not found on tab visibility');
    }
  }
}
