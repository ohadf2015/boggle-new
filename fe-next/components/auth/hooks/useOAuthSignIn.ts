'use client';

import { useState, useCallback } from 'react';
import { signInWithGoogle, signInWithDiscord } from '@/lib/supabase';

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
