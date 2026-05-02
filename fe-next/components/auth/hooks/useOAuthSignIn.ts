'use client';

import { useState, useCallback, useEffect } from 'react';
import { signInWithGoogle, signInWithDiscord } from '@/lib/supabase';
import { isNative } from '@/utils/platform';
import { performMobileOAuth } from '@/utils/mobileOAuth';
import {
  performNativeOAuth,
  initializeNativeOAuth,
  isNativeOAuthAvailable
} from '@/utils/nativeOAuth';
import logger from '@/utils/logger';
import { useLanguage } from '@/contexts/LanguageContext';

interface UseOAuthSignInOptions {
  /** Callback before redirect (e.g., to store pending data) */
  onBeforeRedirect?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Callback on successful sign-in (for native OAuth which doesn't redirect) */
  onSuccess?: () => void;
  /**
   * Force browser-based OAuth even on mobile
   * Useful if native OAuth is not configured or for specific providers
   */
  forceBrowserOAuth?: boolean;
}

interface UseOAuthSignInReturn {
  signIn: (provider: 'google' | 'discord' | 'apple') => Promise<void>;
  loadingProvider: string | null;
  error: string | null;
  clearError: () => void;
  /** Whether native OAuth is available (for Google/Apple) */
  nativeOAuthAvailable: boolean;
}

/**
 * Hook for handling OAuth sign-in with Google, Discord, and Apple
 * Extracts common sign-in logic from auth modals
 *
 * Authentication flow priority:
 * 1. Native SDK (Google/Apple only) - Best UX, no browser involved
 * 2. In-app browser (Chrome Custom Tabs/SFSafariViewController) - Fallback for mobile
 * 3. Standard redirect - Web browsers
 *
 * Native OAuth:
 * - Uses platform-native sign-in dialogs (no browser)
 * - Exchanges ID token with Supabase via signInWithIdToken()
 * - Available for Google (iOS/Android) and Apple (iOS only)
 *
 * Browser OAuth:
 * - Uses in-app browser on mobile (Capacitor)
 * - Uses standard redirect on web
 * - Required for Discord (no native SDK)
 */
export function useOAuthSignIn(options: UseOAuthSignInOptions = {}): UseOAuthSignInReturn {
  const { onBeforeRedirect, onError, onSuccess, forceBrowserOAuth = false } = options;
  const { t } = useLanguage();

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeOAuthAvailable, setNativeOAuthAvailable] = useState(false);

  // Initialize native OAuth on mount (for mobile platforms)
  useEffect(() => {
    if (isNative() && !forceBrowserOAuth) {
      initializeNativeOAuth().then(success => {
        setNativeOAuthAvailable(success);
        if (success) {
          logger.log('[useOAuthSignIn] Native OAuth initialized successfully');
        }
      });
    }
  }, [forceBrowserOAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(async (provider: 'google' | 'discord' | 'apple') => {
    setLoadingProvider(provider);
    setError(null);

    try {
      // Call before redirect callback (e.g., to store pending game data)
      onBeforeRedirect?.();

      // Check if we should use native OAuth
      // Native OAuth is available for Google (iOS/Android) and Apple (iOS only)
      const nativeAvail = isNativeOAuthAvailable();
      const canUseNativeOAuth = !forceBrowserOAuth &&
        nativeAvail &&
        (provider === 'google' || provider === 'apple');

      logger.log(`[useOAuthSignIn] provider=${provider} native=${isNative()} nativeOAuthAvail=${nativeAvail} canUseNative=${canUseNativeOAuth} forceBrowser=${forceBrowserOAuth}`);

      // PRIORITY 1: Native SDK OAuth (best UX - no browser)
      if (canUseNativeOAuth) {
        logger.log(`[useOAuthSignIn] Using native OAuth for ${provider}`);
        const nativeResult = await performNativeOAuth(provider);

        if (nativeResult.success) {
          // Native OAuth completed successfully - session is already set
          // No redirect needed, call success callback
          onSuccess?.();
          return;
        }

        // If native OAuth failed, show the error (don't silently fall through to browser)
        if (nativeResult.error && !nativeResult.error.includes('cancel')) {
          logger.debug(`[useOAuthSignIn] Native OAuth failed: ${nativeResult.error}`);
          setError(`Native auth error: ${nativeResult.error}`);
          return;
        } else if (nativeResult.error?.includes('cancel')) {
          // User cancelled - don't fall back, just clear loading state
          setError(null);
          return;
        }

        // Unexpected result shape — log for debugging, show generic error to user
        logger.error(`[useOAuthSignIn] Unexpected native OAuth result: ${JSON.stringify(nativeResult)}`);
        setError(t('errors.signInFailedRetry'));
        return;
      }

      // PRIORITY 2: In-app browser OAuth on mobile (Capacitor)
      // This opens OAuth in SFSafariViewController (iOS) or Custom Tabs (Android)
      // and returns to the app via deep link instead of staying in external browser
      if (isNative()) {
        // Discord and fallback for Google/Apple when native SDK not available
        if (provider === 'discord' || provider === 'google') {
          logger.log(`[useOAuthSignIn] Using in-app browser OAuth for ${provider}`);
          const mobileResult = await performMobileOAuth(provider);
          if (!mobileResult.success) {
            const errorMessage = mobileResult.error || 'Mobile sign in failed';
            setError(errorMessage);
            onError?.(errorMessage);
          }
          // On success, deep link handler will catch the callback and navigate to auth/callback
          return;
        }

        // Apple on Android - not supported natively, and browser OAuth requires
        // additional configuration. Show appropriate error.
        if (provider === 'apple') {
          const errorMessage = t('errors.appleSignInIosOnly');
          setError(errorMessage);
          onError?.(errorMessage);
          return;
        }
      }

      // PRIORITY 3: Web flow - standard Supabase OAuth redirect
      let result;
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'discord':
          result = await signInWithDiscord();
          break;
        case 'apple': {
          // Apple OAuth on web requires additional setup
          // For now, only support on iOS via native SDK
          const appleErr = t('errors.appleSignInIosOnly');
          setError(appleErr);
          onError?.(appleErr);
          return;
        }
      }

      if (result?.error) {
        const errorMessage = result.error.message || 'Sign in failed';
        setError(errorMessage);
        onError?.(errorMessage);
      }
      // On success, Supabase will redirect to the callback URL
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoadingProvider(null);
    }
  }, [onBeforeRedirect, onError, onSuccess, forceBrowserOAuth, t]);

  return {
    signIn,
    loadingProvider,
    error,
    clearError,
    nativeOAuthAvailable,
  };
}

export default useOAuthSignIn;
