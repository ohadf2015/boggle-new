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
import { triggerExternalIdentityLink } from '@/lib/auth/triggerExternalIdentityLink';
import logger from '@/utils/logger';
import {
  isRefreshTokenError,
  isNetworkError,
  isRecoverableError,
  getAuthErrorMessage,
  type SupabaseAuthError,
} from '../authUtils';
import type { AuthStateSetters } from '../authTypes';
import { shouldReloadAfterSignIn } from '../reloadOnSignIn';
import { shouldRedirectToPendingJoin } from '../pendingJoinRedirect';
import { handleTabBecameVisible } from './tabVisibleSessionSync';

// Constants for timeout values
// Increased from 2s to 5s to accommodate slower mobile connections (fixes JAVASCRIPT-NEXTJS-11)
const SESSION_FETCH_TIMEOUT_MS = 5000;
const LOADING_SAFETY_TIMEOUT_MS = 6000; // Increased to match new session timeout
const TAB_VISIBILITY_LOADING_TIMEOUT_MS = 1500;
const SESSION_UNANSWERED_FALLBACK_MS = 15000;

type SessionAnswer = 'unknown' | 'absent' | 'present';

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
    // 'unknown' while the session check has not answered: a timeout is not "no session".
    let sessionAnswer: SessionAnswer = 'unknown';
    isMountedRef.current = true;

    const applyInitialSession = (sessionUser: User | null) => {
      sessionAnswer = sessionUser ? 'present' : 'absent';
      if (sessionUser && sessionUser.id !== userIdRef.current) {
        userIdRef.current = sessionUser.id;
        setUser(sessionUser);
        // Fetch user data in background, don't block loading state
        fetchUserData(sessionUser.id, sessionUser.user_metadata).catch((err) => {
          logger.warn('Failed to fetch user data:', err.message);
          captureBackgroundError(err instanceof Error ? err : new Error(String(err)), {
            operation: 'fetch_user_data',
            service: 'auth',
            userId: sessionUser.id,
          });
        });
        registerPushToken({ silent: true }).catch(() => {});
      }
      setLoading(false);
    };

    const initAuth = async () => {
      const configured = await isSupabaseConfigured();
      if (!isMountedRef.current) return;
      setIsSupabaseEnabled(configured);

      if (!configured || !supabase) {
        sessionAnswer = 'absent';
        setLoading(false);
        return;
      }

      // Subscribed before getSession so a slow restore's SIGNED_IN is not missed.
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMountedRef.current) return;

        // New-signup welcome email. Fire-and-forget — server is idempotent and
        // NEW-signups-only, so calling on any SIGNED_IN is safe and covers every
        // signup method (OAuth, email/password, magic-link, OTP).
        if (event === 'SIGNED_IN' && session) {
          void triggerWelcomeEmail(session.access_token);
          void triggerExternalIdentityLink(session);
        }

        const sessionUser = session?.user ?? null;
        const knownSignedOut = sessionAnswer === 'absent';
        if (sessionUser) sessionAnswer = 'present';
        else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') sessionAnswer = 'absent';

        await handleAuthStateChange(
          event,
          sessionUser,
          knownSignedOut,
          userIdRef,
          setters,
          fetchUserData,
          clearAuthState,
          isMountedRef
        );
      });
      subscription = data.subscription;

      // Get initial session with timeout to prevent slow connections from blocking UI
      const sessionPromise = supabase.auth.getSession();
      try {
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
          if (isMountedRef.current && sessionAnswer === 'unknown') applyInitialSession(null);
        } else if (sessionAnswer === 'unknown' || session?.user) {
          applyInitialSession(session?.user ?? null);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        if (isSessionTimeout(err as SupabaseAuthError)) {
          // Keep loading: the listener or the late getSession answers, or the outage fallback ends it.
          logger.info('Auth session fetch timed out after 5s - waiting for the session to answer');
          sessionPromise
            .then(({ data: late, error }) => {
              if (isMountedRef.current && sessionAnswer === 'unknown' && !error) {
                applyInitialSession(late.session?.user ?? null);
              }
            })
            .catch(() => {});
          return;
        }
        await handleInitError(err as SupabaseAuthError, clearAuthState);
        if (isMountedRef.current && sessionAnswer === 'unknown') applyInitialSession(null);
      }
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
          if (isMountedRef.current && sessionAnswer !== 'unknown') {
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

    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current && sessionAnswer !== 'unknown') {
        setLoading((currentLoading) => {
          if (currentLoading) {
            logger.debug('Auth loading timeout - forcing loading to false');
            return false;
          }
          return currentLoading;
        });
      }
    }, LOADING_SAFETY_TIMEOUT_MS);

    const unansweredTimeout = setTimeout(() => {
      if (!isMountedRef.current || sessionAnswer !== 'unknown') return;
      logger.warn('Auth session never answered - showing the signed-out screen');
      captureBackgroundError(new Error('Auth session check never answered'), {
        operation: 'auth_session_unanswered',
        service: 'auth',
      });
      setLoading(false);
    }, SESSION_UNANSWERED_FALLBACK_MS);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      clearTimeout(loadingTimeout);
      clearTimeout(unansweredTimeout);
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

function isSessionTimeout(error: SupabaseAuthError): boolean {
  return error?.message === 'Session fetch timeout' || error?.code === 'TIMEOUT';
}

/**
 * Handle init errors (network issues, etc.)
 */
async function handleInitError(
  error: SupabaseAuthError,
  clearAuthState: (reason: string) => Promise<void>
): Promise<void> {
  if (isRefreshTokenError(error)) {
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
  knownSignedOut: boolean,
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
        // Captured BEFORE setUser/userIdRef advances — true only on a genuine
        // guest → authenticated transition (drives the one-shot reload below).
        // Only a session check that answered "no session" counts as a guest; a timeout does not.
        const wasUnauthenticated = knownSignedOut && userIdRef.current === null;
        const isNewUser = sessionUser.id !== userIdRef.current;
        if (isNewUser) {
          userIdRef.current = sessionUser.id;
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
          registerPushToken({ silent: true }).catch(() => {});
          // Check for pending classroom join after successful sign-in
          if (typeof window !== 'undefined') {
            const pendingJoinCode = sessionStorage.getItem('joinClassroomReturnCode');
            const isAnonymousSession = sessionUser.is_anonymous === true;
            // An anonymous session is the guest join MINTING ITSELF mid-flow —
            // it goes on to POST the enrolment and navigate into the room. Take
            // the return code off the shelf so no later SIGNED_IN can fire the
            // redirect below and bounce the student out of the room they are
            // walking into.
            if (pendingJoinCode && isAnonymousSession) {
              sessionStorage.removeItem('joinClassroomReturnCode');
            }
            if (shouldRedirectToPendingJoin({ pendingJoinCode, isAnonymous: isAnonymousSession })) {
              sessionStorage.removeItem('joinClassroomReturnCode');
              // Redirect to join page with the code
              const currentLocale = window.location.pathname.split('/')[1] || 'en';
              window.location.href = `/${currentLocale}/join/${pendingJoinCode}`;
            } else if (
              shouldReloadAfterSignIn('SIGNED_IN', {
                wasUnauthenticated,
                pathname: window.location.pathname,
                isAnonymous: isAnonymousSession,
              })
            ) {
              // Fresh guest → authenticated: hard reload so EVERY page (server
              // components, authed chrome, the FTUE mount gate) re-renders in
              // signed-in mode. fetchUserData already finished above, so the new
              // profile is persisted before the reloaded page re-reads the session.
              window.location.reload();
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
          userIdRef.current = sessionUser.id;
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
