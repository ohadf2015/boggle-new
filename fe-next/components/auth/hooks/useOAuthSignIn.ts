'use client';

import { useState, useCallback } from 'react';
import { signInWithGoogle, signInWithDiscord } from '@/lib/supabase';
import { isNative } from '@/utils/platform';
import { performMobileOAuth } from '@/utils/mobileOAuth';

interface UseOAuthSignInOptions {
  /** Callback before redirect (e.g., to store pending data) */
  onBeforeRedirect?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UseOAuthSignInReturn {
  signIn: (provider: 'google' | 'discord') => Promise<void>;
  loadingProvider: string | null;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for handling OAuth sign-in with Google and Discord
 * Extracts common sign-in logic from auth modals
 *
 * On mobile (Capacitor), uses in-app browser via performMobileOAuth
 * On web, uses standard Supabase OAuth redirect flow
 */
export function useOAuthSignIn(options: UseOAuthSignInOptions = {}): UseOAuthSignInReturn {
  const { onBeforeRedirect, onError } = options;

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(async (provider: 'google' | 'discord') => {
    setLoadingProvider(provider);
    setError(null);

    try {
      // Call before redirect callback (e.g., to store pending game data)
      onBeforeRedirect?.();

      // Use in-app browser OAuth on mobile (Capacitor)
      // This opens OAuth in SFSafariViewController (iOS) or Custom Tabs (Android)
      // and returns to the app via deep link instead of staying in external browser
      if (isNative()) {
        const mobileResult = await performMobileOAuth(provider);
        if (!mobileResult.success) {
          const errorMessage = mobileResult.error || 'Mobile sign in failed';
          setError(errorMessage);
          onError?.(errorMessage);
        }
        // On success, deep link handler will catch the callback and navigate to auth/callback
        return;
      }

      // Web flow: standard Supabase OAuth redirect
      let result;
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'discord':
          result = await signInWithDiscord();
          break;
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
  }, [onBeforeRedirect, onError]);

  return {
    signIn,
    loadingProvider,
    error,
    clearError,
  };
}

export default useOAuthSignIn;
