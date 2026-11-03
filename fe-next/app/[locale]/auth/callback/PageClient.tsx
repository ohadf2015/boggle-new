'use client';

import { useEffect, useRef, Suspense, useCallback, useState } from 'react';
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
import { PageLoader } from '@/components/ui/PageLoader';
import { authFailureHref, resolveAuthNext } from '@/lib/navigation/authReturnPath';
import { LoadingUI } from './CallbackLoadingUI';
import { clearSupabaseAuthData } from './clearSupabaseAuthData';

// Timeout constants
const CODE_EXCHANGE_TIMEOUT = 15000; // 15 seconds timeout for code exchange
const RETRY_TIMEOUT_SECONDS = 6; // Show retry button after 6 seconds

// Helper to wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );
  return Promise.race([promise, timeoutPromise]);
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function AuthCallbackContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const hasHandledCallback = useRef<boolean>(false);
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Get locale from URL params, fallback to default
  const locale = (params?.locale as string) || defaultLocale;

  // State for countdown timer and retry button
  const [secondsRemaining, setSecondsRemaining] = useState(RETRY_TIMEOUT_SECONDS);
  const [showRetry, setShowRetry] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowRetry(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    cleanupFunctions.current.push(() => clearInterval(countdownInterval));

    return () => clearInterval(countdownInterval);
  }, []);

  // Handle retry - clear cookies and redirect to sign-in
  const handleRetry = useCallback(() => {
    clearSupabaseAuthData();
    const next = searchParams.get('next');
    window.history.replaceState(null, '', window.location.pathname);
    router.replace(authFailureHref(locale, next, 'timeout'));
  }, [router, locale, searchParams]);

  const getRedirectUrl = useCallback(
    () => resolveAuthNext(searchParams.get('next'), locale),
    [searchParams, locale],
  );
  const failureHref = useCallback(
    (reason?: string) => authFailureHref(locale, searchParams.get('next'), reason),
    [searchParams, locale],
  );

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

  // No explicit destination: home page. Education dashboards are manual entry only.
  const redirectWithRole = useCallback(async (_userId: string | undefined, next: string, isDefault: boolean) => {
    if (isDefault) {
      safeRedirect(`/${locale}`);
    } else {
      safeRedirect(next);
    }
  }, [locale, safeRedirect]);

  // Wait for session from another tab using BroadcastChannel + polling
  const waitForSessionFromOtherTab = useCallback(async (next: string, maxWaitMs = 10000): Promise<boolean> => {
    if (!supabase) return false;

    const startTime = Date.now();
    const pollInterval = 500; // Check every 500ms

    return new Promise((resolve) => {
      let resolved = false;
      let isCheckingRef = false; // Guard against overlapping in-flight checks

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
        // Guard: skip if a check is already in-flight
        if (resolved || isCheckingRef) return;

        if (Date.now() - startTime >= maxWaitMs) {
          cleanup();
          resolve(false);
          return;
        }

        if (!supabase) return;

        isCheckingRef = true;
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            logger.log('Auth callback: Session detected from other tab via polling');
            resolved = true;
            cleanup();
            safeRedirect(next);
            resolve(true);
          }
        } finally {
          isCheckingRef = false;
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

    // Note: User-facing retry button handles timeout instead of automatic redirect.
    // After RETRY_TIMEOUT_SECONDS, user sees "Try Again" button to manually retry.

    const handleCallback = async (): Promise<void> => {
      const { url: next, isDefault } = getRedirectUrl();

      try {
        if (!supabase) {
          logger.error('Supabase not configured');
          broadcastAuthFailed('Supabase not configured');
          safeRedirect(failureHref());
          return;
        }

        // Check for OAuth error parameters FIRST
        // OAuth providers return errors like ?error=access_denied&error_description=...
        const oauthError = searchParams.get('error');
        const oauthErrorDescription = searchParams.get('error_description');
        if (oauthError) {
          const errorMessage = oauthErrorDescription || oauthError;
          // User denied OAuth consent or provider returned error — expected, not a bug
          logger.log(`Auth callback: OAuth provider returned error: ${oauthError}`, {
            error: oauthError,
            description: oauthErrorDescription
          });
          broadcastAuthFailed(errorMessage);
          safeRedirect(failureHref(oauthError));
          return;
        }

        // IMPORTANT: Check for existing session FIRST with retry
        // This handles the case where another tab already completed the auth
        // Retry mechanism handles cookie sync timing issues across tabs
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: existingSession } = await supabase.auth.getSession();
          if (existingSession?.session) {
            logger.log(`Auth callback: Session already exists (attempt ${attempt + 1}), redirecting`);
            await redirectWithRole(existingSession.session.user.id, next, isDefault);
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
                await redirectWithRole(finalCheck.session.user.id, next, isDefault);
                return;
              }
              logger.debug('Auth callback: Timed out waiting for session from other tab');
              safeRedirect(failureHref());
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
                await redirectWithRole(finalCheck.session.user.id, next, isDefault);
                return;
              }
              broadcastAuthFailed('Timed out waiting for other tab');
              safeRedirect(failureHref());
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
              logger.debug('Auth callback: Code exchange failed (possibly used by another tab or recoverable error), waiting for session:', getAuthErrorMessage(authError));

              // Poll for session with retries - another tab may have succeeded
              const gotSession = await waitForSessionFromOtherTab(next, 5000);
              if (gotSession) return;

              // One final check
              const { data: retrySession } = await supabase.auth.getSession();
              if (retrySession?.session) {
                logger.log('Auth callback: Found session after failed exchange');
                // Broadcast success since we have a valid session
                broadcastAuthSuccess(retrySession.session.user.id);
                await redirectWithRole(retrySession.session.user.id, next, isDefault);
                return;
              }
            }
            const authMessage = getAuthErrorMessage(authError);
            // Link opened in another browser/device: expected, user retries sign-in
            const logExchange = /code verifier not found/i.test(authMessage) ? logger.log : logger.error;
            logExchange.call(logger, 'Auth callback: Code exchange error:', authMessage);
            broadcastAuthFailed(authMessage);
            safeRedirect(failureHref());
            return;
          }

          // Successfully exchanged code - use the session returned directly from exchangeCodeForSession
          // This avoids timing issues where getSession() might not immediately return the new session
          if (data?.session) {
            logger.log('Auth callback: Session established successfully from code exchange');
            // Broadcast success to other tabs
            broadcastAuthSuccess(data.session.user.id);
            await redirectWithRole(data.session.user.id, next, isDefault);
            return;
          }

          // Fallback: If somehow no session in response, try getSession() as backup
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            logger.log('Auth callback: Session found in fallback getSession()');
            broadcastAuthSuccess(sessionData.session.user.id);
            await redirectWithRole(sessionData.session.user.id, next, isDefault);
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
            safeRedirect(failureHref());
            return;
          }

          if (sessionData?.session) {
            logger.log('Auth callback: Session established from hash tokens');
            broadcastAuthSuccess(sessionData.session.user.id);
            await redirectWithRole(sessionData.session.user.id, next, isDefault);
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
          await redirectWithRole(finalCheck.session.user.id, next, isDefault);
          return;
        }

        // Fallback: redirect to home with error
        // Log diagnostic info - use variables already declared above (code, accessToken)
        logger.warn('Auth callback: No session found, redirecting with error', {
          hadCode: !!code,
          hadHashTokens: !!accessToken,
          url: window.location.href.replace(/code=[^&]+/, 'code=REDACTED')
        });
        broadcastAuthFailed('No session found');
        safeRedirect(failureHref('no_session'));
      } catch (err) {
        logger.error('Auth callback exception:', err);
        releaseCodeLock();

        // Before giving up, check if another tab succeeded (timeout case)
        if (supabase) {
          const { data: recoverySession } = await supabase.auth.getSession();
          if (recoverySession?.session) {
            logger.log('Auth callback: Found session after exception, redirecting');
            broadcastAuthSuccess(recoverySession.session.user.id);
            const { url: recoveryNext, isDefault: recoveryIsDefault } = getRedirectUrl();
            await redirectWithRole(recoverySession.session.user.id, recoveryNext, recoveryIsDefault);
            return;
          }
        }

        broadcastAuthFailed(err instanceof Error ? err.message : 'Unknown error');
        safeRedirect(failureHref());
      }
    };

    handleCallback();

    // Cleanup on unmount
    return () => {
      cleanupFunctions.current.forEach(fn => fn());
      cleanupFunctions.current = [];
    };
  }, [router, searchParams, locale, getRedirectUrl, failureHref, safeRedirect, waitForSessionFromOtherTab, redirectWithRole]);

  return (
    <LoadingUI
      secondsRemaining={secondsRemaining}
      showRetry={showRetry}
      onRetry={handleRetry}
      locale={locale}
    />
  );
}

// Simple fallback for Suspense - no retry logic needed during initial load
function SuspenseFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy">
      <PageLoader size="lg" />
    </div>
  );
}

// Main export with Suspense boundary - required for useSearchParams in Next.js App Router
export default function AuthCallbackPageClient(): React.JSX.Element {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
