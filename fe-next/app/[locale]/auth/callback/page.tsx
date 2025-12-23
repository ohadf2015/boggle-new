'use client';

import { useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { defaultLocale } from '@/lib/i18n';

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

// Cross-tab coordination keys
const AUTH_CODE_LOCK_KEY = 'boggle_auth_code_lock';
const AUTH_CODE_LOCK_TIMEOUT = 15000; // 15 seconds max lock time
const CODE_EXCHANGE_TIMEOUT = 15000; // 15 seconds timeout for code exchange

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
  const storageListenerCleanup = useRef<(() => void) | null>(null);

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

  // Helper to safely redirect (clears URL params and navigates)
  const safeRedirect = useCallback((url: string) => {
    // Clean up any storage listeners
    if (storageListenerCleanup.current) {
      storageListenerCleanup.current();
      storageListenerCleanup.current = null;
    }
    // Clear URL params to prevent reprocessing on back navigation
    window.history.replaceState(null, '', window.location.pathname);
    router.replace(url);
  }, [router]);

  // Check if another tab has locked this code
  const isCodeLocked = useCallback((code: string): boolean => {
    try {
      const lockData = localStorage.getItem(AUTH_CODE_LOCK_KEY);
      if (!lockData) return false;

      const lock = JSON.parse(lockData);
      // Check if lock is for this code and still valid
      if (lock.code === code && Date.now() - lock.timestamp < AUTH_CODE_LOCK_TIMEOUT) {
        return true;
      }
      // Clear stale lock
      localStorage.removeItem(AUTH_CODE_LOCK_KEY);
      return false;
    } catch {
      return false;
    }
  }, []);

  // Lock the code for this tab
  const lockCode = useCallback((code: string): boolean => {
    try {
      // Double-check lock before acquiring
      if (isCodeLocked(code)) {
        return false;
      }
      localStorage.setItem(AUTH_CODE_LOCK_KEY, JSON.stringify({
        code,
        timestamp: Date.now()
      }));
      return true;
    } catch {
      return true; // Proceed if localStorage fails
    }
  }, [isCodeLocked]);

  // Release the code lock
  const releaseLock = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_CODE_LOCK_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  // Poll for session when another tab is handling the code
  const waitForSessionFromOtherTab = useCallback(async (next: string, maxWaitMs = 10000): Promise<boolean> => {
    if (!supabase) return false;

    const startTime = Date.now();
    const pollInterval = 500; // Check every 500ms

    return new Promise((resolve) => {
      // Listen for storage events (session changes from other tabs)
      const storageHandler = async () => {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          logger.log('Auth callback: Session detected from other tab via storage event');
          cleanup();
          safeRedirect(next);
          resolve(true);
        }
      };

      window.addEventListener('storage', storageHandler);

      // Also poll periodically in case storage events are missed
      const pollTimer = setInterval(async () => {
        if (Date.now() - startTime >= maxWaitMs) {
          cleanup();
          resolve(false);
          return;
        }

        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          logger.log('Auth callback: Session detected from other tab via polling');
          cleanup();
          safeRedirect(next);
          resolve(true);
        }
      }, pollInterval);

      // Also set a timeout as a final fallback
      const timeoutTimer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, maxWaitMs);

      const cleanup = () => {
        window.removeEventListener('storage', storageHandler);
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
      };

      // Store cleanup function for component unmount
      storageListenerCleanup.current = cleanup;
    });
  }, [safeRedirect]);

  useEffect(() => {
    // Prevent double-handling within same tab
    if (hasHandledCallback.current) return;
    hasHandledCallback.current = true;

    const handleCallback = async (): Promise<void> => {
      const next = getRedirectUrl();

      try {
        if (!supabase) {
          logger.error('Supabase not configured');
          safeRedirect(`/${locale}?auth_error=true`);
          return;
        }

        // IMPORTANT: Check for existing session FIRST with retry
        // This handles the case where another tab already completed the auth
        // Retry mechanism handles cookie sync timing issues across tabs
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: existingSession } = await supabase.auth.getSession();
          if (existingSession?.session) {
            logger.log(`Auth callback: Session already exists (attempt ${attempt + 1}), redirecting`);
            safeRedirect(next);
            return;
          }
          // Wait 300ms before retry to allow cookies to sync
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        // Check for PKCE code in query params (from server redirect)
        const code = searchParams.get('code');

        if (code) {
          // CROSS-TAB COORDINATION: Check if another tab is handling this code
          if (isCodeLocked(code)) {
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

          // Try to acquire lock for this code
          const gotLock = lockCode(code);
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
          releaseLock();

          if (error) {
            // Check if error is because code was already used (by another tab) or timeout
            // In this case, wait and poll for session as other tab should have it
            const isRecoverableError = error.message?.includes('code') ||
                                        error.message?.includes('expired') ||
                                        error.message?.includes('invalid') ||
                                        error.message?.includes('timed out');

            if (isRecoverableError) {
              logger.warn('Auth callback: Code exchange failed (possibly used by another tab or timed out), waiting for session');

              // Poll for session with retries - another tab may have succeeded
              const gotSession = await waitForSessionFromOtherTab(next, 5000);
              if (gotSession) return;

              // One final check
              const { data: retrySession } = await supabase.auth.getSession();
              if (retrySession?.session) {
                logger.log('Auth callback: Found session after failed exchange');
                safeRedirect(next);
                return;
              }
            }
            logger.error('Auth callback: Code exchange error:', error);
            safeRedirect(`/${locale}?auth_error=true`);
            return;
          }

          // Successfully exchanged code - use the session returned directly from exchangeCodeForSession
          // This avoids timing issues where getSession() might not immediately return the new session
          if (data?.session) {
            logger.log('Auth callback: Session established successfully from code exchange');
            safeRedirect(next);
            return;
          }

          // Fallback: If somehow no session in response, try getSession() as backup
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            logger.log('Auth callback: Session found in fallback getSession()');
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
            logger.error('Auth callback: Error setting session from hash tokens:', sessionError);
            safeRedirect(`/${locale}?auth_error=true`);
            return;
          }

          if (sessionData?.session) {
            logger.log('Auth callback: Session established from hash tokens');
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
          safeRedirect(next);
          return;
        }

        // Fallback: redirect to home with error
        logger.warn('Auth callback: No session found, redirecting with error');
        safeRedirect(`/${locale}?auth_error=true`);
      } catch (err) {
        logger.error('Auth callback exception:', err);
        releaseLock();

        // Before giving up, check if another tab succeeded (timeout case)
        if (supabase) {
          const { data: recoverySession } = await supabase.auth.getSession();
          if (recoverySession?.session) {
            logger.log('Auth callback: Found session after exception, redirecting');
            safeRedirect(getRedirectUrl());
            return;
          }
        }

        safeRedirect(`/${locale}?auth_error=true`);
      }
    };

    handleCallback();

    // Cleanup on unmount
    return () => {
      if (storageListenerCleanup.current) {
        storageListenerCleanup.current();
      }
    };
  }, [router, searchParams, locale, getRedirectUrl, safeRedirect, isCodeLocked, lockCode, releaseLock, waitForSessionFromOtherTab]);

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
