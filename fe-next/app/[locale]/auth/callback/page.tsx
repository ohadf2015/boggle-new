'use client';

import { useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { defaultLocale } from '@/lib/i18n';
import { isRecoverableError, isRefreshTokenError, getAuthErrorMessage, type SupabaseAuthError } from '@/contexts/auth';
import {
  tryAcquireCodeLock,
  isCodeLockedByOther,
  releaseCodeLock,
  broadcastAuthSuccess,
  broadcastAuthFailed,
  subscribeToAuthSync,
  initCrossTabAuthSync,
  type AuthSyncMessage,
} from '@/utils/crossTabAuthSync';

// Loading UI component
function LoadingUI(): React.ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}

// Timeout for code exchange
const CODE_EXCHANGE_TIMEOUT = 15000; // 15 seconds timeout for code exchange
const MAX_CALLBACK_TIMEOUT = 30000; // 30 seconds max total time on callback page

// Helper to wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );
  return Promise.race([promise, timeoutPromise]);
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function AuthCallbackContent(): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const hasHandledCallback = useRef<boolean>(false);
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Get locale from URL params, fallback to default
  const locale = (params?.locale as string) || defaultLocale;

  // Helper to get redirect URL
  const getRedirectUrl = useCallback(() => {
    let next = searchParams.get('next') || `/${locale}`;
    if (next === '/') {
      next = `/${locale}`;
    } else if (!next.startsWith(`/${locale}`)) {
      const pathWithoutLocale = next.replace(/^\/(he|en|sv|ja)/, '');
      next = `/${locale}${pathWithoutLocale || ''}`;
    }
    return next;
  }, [searchParams, locale]);

  // Track if we've already navigated away
  const hasNavigated = useRef<boolean>(false);

  // Helper to safely redirect (clears URL params and navigates)
  const safeRedirect = useCallback((url: string) => {
    // Prevent double navigation
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    // Clean up all listeners
    cleanupFunctions.current.forEach(fn => fn());
    cleanupFunctions.current = [];
    // Clear URL params to prevent reprocessing on back navigation
    window.history.replaceState(null, '', window.location.pathname);
    router.replace(url);
  }, [router]);

  // Wait for session from another tab using BroadcastChannel + polling
  const waitForSessionFromOtherTab = useCallback(async (next: string, maxWaitMs = 10000): Promise<boolean> => {
    if (!supabase) return false;

    const startTime = Date.now();
    const pollInterval = 500; // Check every 500ms

    return new Promise((resolve) => {
      let resolved = false;

      // Subscribe to cross-tab auth messages
      const unsubscribe = subscribeToAuthSync((message: AuthSyncMessage) => {
        if (resolved) return;

        if (message.type === 'AUTH_SUCCESS') {
          logger.log('Auth callback: Received AUTH_SUCCESS from other tab');
          // Give a moment for session to sync via cookies, then check
          // Don't cleanup yet - let polling continue as backup
          setTimeout(async () => {
            if (resolved) return;
            if (!supabase) return;
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
              resolved = true;
              cleanup();
              safeRedirect(next);
              resolve(true);
            }
            // If session not synced yet, polling will continue and eventually find it
          }, 200);
        }
      });

      // Also poll periodically in case BroadcastChannel events are missed
      const pollTimer = setInterval(async () => {
        if (resolved) return;

        if (Date.now() - startTime >= maxWaitMs) {
          cleanup();
          resolve(false);
          return;
        }

        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          logger.log('Auth callback: Session detected from other tab via polling');
          resolved = true;
          cleanup();
          safeRedirect(next);
          resolve(true);
        }
      }, pollInterval);

      // Also set a timeout as a final fallback
      const timeoutTimer = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(false);
        }
      }, maxWaitMs);

      const cleanup = () => {
        unsubscribe();
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
      };

      // Store cleanup function for component unmount
      cleanupFunctions.current.push(cleanup);
    });
  }, [safeRedirect]);

  useEffect(() => {
    // Prevent double-handling within same tab
    if (hasHandledCallback.current) return;
    hasHandledCallback.current = true;

    // Initialize cross-tab sync
    initCrossTabAuthSync();

    // Global safety timeout - ensures we never stay stuck on callback page
    const safetyTimeout = setTimeout(async () => {
      if (hasNavigated.current) return;
      logger.warn('Auth callback: Global safety timeout reached, attempting recovery');

      // Try one final session check before giving up
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          logger.log('Auth callback: Session found in safety timeout, redirecting');
          safeRedirect(getRedirectUrl());
          return;
        }
      }

      // No session found, redirect with error
      logger.error('Auth callback: Safety timeout reached with no session');
      safeRedirect(`/${locale}?auth_error=true&reason=timeout`);
    }, MAX_CALLBACK_TIMEOUT);

    // Store cleanup for safety timeout
    cleanupFunctions.current.push(() => clearTimeout(safetyTimeout));

    const handleCallback = async (): Promise<void> => {
      const next = getRedirectUrl();

      try {
        if (!supabase) {
          logger.error('Supabase not configured');
          broadcastAuthFailed('Supabase not configured');
          safeRedirect(`/${locale}?auth_error=true`);
          return;
        }

        // IMPORTANT: Check for existing session FIRST with retry
        // This handles the case where another tab already completed the auth
        // Retry mechanism handles cookie sync timing issues across tabs
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: existingSession } = await supabase.auth.getSession();
          if (existingSession?.session) {
            logger.log(`Auth callback: Session already exists (attempt ${attempt + 1}), redirecting`);
            safeRedirect(next);
            return;
          }
          // Wait 400ms before retry to allow cookies to sync across tabs (increased from 300ms)
          if (attempt < 4) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }

        // Check for PKCE code in query params (from server redirect)
        const code = searchParams.get('code');

        if (code) {
          // CROSS-TAB COORDINATION: Check if another tab is handling this code
          if (isCodeLockedByOther(code)) {
            logger.log('Auth callback: Code is being handled by another tab, waiting for session');
            const gotSession = await waitForSessionFromOtherTab(next);
            if (!gotSession) {
              // Another tab had the lock but we never got a session - check one more time
              const { data: finalCheck } = await supabase.auth.getSession();
              if (finalCheck?.session) {
                logger.log('Auth callback: Session found after waiting for other tab');
                safeRedirect(next);
                return;
              }
              logger.warn('Auth callback: Timed out waiting for session from other tab');
              safeRedirect(`/${locale}?auth_error=true`);
            }
            return;
          }

          // Try to acquire lock for this code using atomic pattern
          const gotLock = tryAcquireCodeLock(code);
          if (!gotLock) {
            // Another tab just acquired the lock
            logger.log('Auth callback: Another tab just acquired lock, waiting for session');
            const gotSession = await waitForSessionFromOtherTab(next);
            if (!gotSession) {
              const { data: finalCheck } = await supabase.auth.getSession();
              if (finalCheck?.session) {
                safeRedirect(next);
                return;
              }
              broadcastAuthFailed('Timed out waiting for other tab');
              safeRedirect(`/${locale}?auth_error=true`);
            }
            return;
          }

          logger.log('Auth callback: Exchanging code for session');
          // IMPORTANT: Extract both data and error - the session is returned directly
          // in data.session, so we don't need to call getSession() again
          // Wrapped with timeout to prevent infinite hang if exchange fails silently
          const { data, error } = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            CODE_EXCHANGE_TIMEOUT,
            'Code exchange timed out'
          );

          // Release lock after exchange attempt
          releaseCodeLock();

          if (error) {
            const authError = error as SupabaseAuthError;
            // Check if error is recoverable (code already used, timeout, etc.)
            // In this case, wait and poll for session as other tab should have it
            if (isRecoverableError(authError) || isRefreshTokenError(authError)) {
              logger.warn('Auth callback: Code exchange failed (possibly used by another tab or recoverable error), waiting for session:', getAuthErrorMessage(authError));

              // Poll for session with retries - another tab may have succeeded
              const gotSession = await waitForSessionFromOtherTab(next, 5000);
              if (gotSession) return;

              // One final check
              const { data: retrySession } = await supabase.auth.getSession();
              if (retrySession?.session) {
                logger.log('Auth callback: Found session after failed exchange');
                // Broadcast success since we have a valid session
                broadcastAuthSuccess(retrySession.session.user.id);
                safeRedirect(next);
                return;
              }
            }
            logger.error('Auth callback: Code exchange error:', getAuthErrorMessage(authError));
            broadcastAuthFailed(getAuthErrorMessage(authError));
            safeRedirect(`/${locale}?auth_error=true`);
            return;
          }

          // Successfully exchanged code - use the session returned directly from exchangeCodeForSession
          // This avoids timing issues where getSession() might not immediately return the new session
          if (data?.session) {
            logger.log('Auth callback: Session established successfully from code exchange');
            // Broadcast success to other tabs
            broadcastAuthSuccess(data.session.user.id);
            safeRedirect(next);
            return;
          }

          // Fallback: If somehow no session in response, try getSession() as backup
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            logger.log('Auth callback: Session found in fallback getSession()');
            broadcastAuthSuccess(sessionData.session.user.id);
            safeRedirect(next);
            return;
          }
        }

        // Check for implicit flow tokens in hash fragment
        // Note: detectSessionInUrl is disabled in our Supabase client, so we must
        // manually extract and set the session from hash tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          logger.log('Auth callback: Found access_token in hash, setting session manually');

          // Manually set the session since detectSessionInUrl is disabled
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            const authError = sessionError as SupabaseAuthError;
            logger.error('Auth callback: Error setting session from hash tokens:', getAuthErrorMessage(authError));
            broadcastAuthFailed(getAuthErrorMessage(authError));
            safeRedirect(`/${locale}?auth_error=true`);
            return;
          }

          if (sessionData?.session) {
            logger.log('Auth callback: Session established from hash tokens');
            broadcastAuthSuccess(sessionData.session.user.id);
            safeRedirect(next);
            return;
          }
        }

        // Final check for session - might have been set asynchronously
        // Use longer timeout for slow connections/mobile networks
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: finalCheck } = await supabase.auth.getSession();
        if (finalCheck?.session) {
          logger.log('Auth callback: Session found in final check');
          broadcastAuthSuccess(finalCheck.session.user.id);
          safeRedirect(next);
          return;
        }

        // Fallback: redirect to home with error
        logger.warn('Auth callback: No session found, redirecting with error');
        broadcastAuthFailed('No session found');
        safeRedirect(`/${locale}?auth_error=true`);
      } catch (err) {
        logger.error('Auth callback exception:', err);
        releaseCodeLock();

        // Before giving up, check if another tab succeeded (timeout case)
        if (supabase) {
          const { data: recoverySession } = await supabase.auth.getSession();
          if (recoverySession?.session) {
            logger.log('Auth callback: Found session after exception, redirecting');
            broadcastAuthSuccess(recoverySession.session.user.id);
            safeRedirect(getRedirectUrl());
            return;
          }
        }

        broadcastAuthFailed(err instanceof Error ? err.message : 'Unknown error');
        safeRedirect(`/${locale}?auth_error=true`);
      }
    };

    handleCallback();

    // Cleanup on unmount
    return () => {
      cleanupFunctions.current.forEach(fn => fn());
      cleanupFunctions.current = [];
    };
  }, [router, searchParams, locale, getRedirectUrl, safeRedirect, waitForSessionFromOtherTab]);

  return <LoadingUI />;
}

// Main export with Suspense boundary - required for useSearchParams in Next.js App Router
export default function AuthCallbackPage(): React.ReactNode {
  return (
    <Suspense fallback={<LoadingUI />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
