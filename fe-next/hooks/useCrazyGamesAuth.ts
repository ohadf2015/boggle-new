'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

export interface CrazyGamesUser {
  username: string;
  profilePictureUrl?: string;
}

interface UseCrazyGamesAuthReturn {
  /** Whether we're on CrazyGames platform */
  isCrazyGames: boolean;
  /** Whether the SDK is ready */
  isReady: boolean;
  /** Currently logged in CrazyGames user (null if not logged in) */
  user: CrazyGamesUser | null;
  /** Whether user is logged into CrazyGames */
  isLoggedIn: boolean;
  /** Whether a login request is in progress */
  isLoggingIn: boolean;
  /** Trigger CrazyGames login prompt */
  login: () => Promise<CrazyGamesUser | null>;
  /** Check if CrazyGames accounts are available */
  isAccountAvailable: boolean;
  /** Get signed JWT for server-side user verification (1hr TTL) */
  getUserToken: () => Promise<string | null>;
  /** Show account linking prompt (link CrazyGames account to in-game account) */
  showAccountLink: () => Promise<void>;
}

/**
 * Hook for CrazyGames authentication integration.
 *
 * When on CrazyGames platform, this provides access to CrazyGames user accounts.
 * Users can login with their CrazyGames account to get their username and avatar.
 *
 * @example
 * ```tsx
 * const { isCrazyGames, user, isLoggedIn, login } = useCrazyGamesAuth();
 *
 * if (isCrazyGames && !isLoggedIn) {
 *   return (
 *     <button onClick={login}>
 *       Login with CrazyGames
 *     </button>
 *   );
 * }
 * ```
 */
export function useCrazyGamesAuth(): UseCrazyGamesAuthReturn {
  const {
    isAvailable,
    isOnCrazyGamesPlatform,
    isLoading,
    getUser,
    showAuthPrompt,
    isUserAccountAvailable,
    getUserToken,
    showAccountLinkPrompt,
    addAuthListener,
    removeAuthListener,
  } = useCrazyGames();

  const [user, setUser] = useState<CrazyGamesUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAccountAvailable, setIsAccountAvailable] = useState(false);
  const [hasCheckedUser, setHasCheckedUser] = useState(false);

  // Use runtime detection - only true when actually on CrazyGames platform
  const isCrazyGames = isOnCrazyGamesPlatform;
  const isReady = !isLoading && hasCheckedUser;

  // Check if user is already logged in on mount
  useEffect(() => {
    if (isLoading || !isAvailable) {
      if (!isLoading) setHasCheckedUser(true);
      return;
    }

    let mounted = true;

    const checkUser = async () => {
      try {
        // Check if accounts are available
        const accountAvailable = await isUserAccountAvailable();
        if (!mounted) return;
        setIsAccountAvailable(accountAvailable);

        // Get current user if logged in
        const currentUser = await getUser();
        if (!mounted) return;
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking CrazyGames user:', error);
      } finally {
        if (mounted) setHasCheckedUser(true);
      }
    };

    checkUser();
    return () => { mounted = false; };
  }, [isAvailable, isLoading, getUser, isUserAccountAvailable]);

  // Listen for mid-session login (user logs into CrazyGames while playing)
  useEffect(() => {
    if (!isAvailable) return;

    const handleAuthChange = (cgUser: { username: string; profilePictureUrl: string }) => {
      setUser(cgUser);
    };

    addAuthListener(handleAuthChange);
    return () => removeAuthListener(handleAuthChange);
  }, [isAvailable, addAuthListener, removeAuthListener]);

  // Account linking prompt
  const showAccountLink = useCallback(async (): Promise<void> => {
    if (!isAvailable) return;
    await showAccountLinkPrompt();
  }, [isAvailable, showAccountLinkPrompt]);

  // Login function - shows CrazyGames auth prompt
  const login = useCallback(async (): Promise<CrazyGamesUser | null> => {
    if (!isAvailable) return null;

    setIsLoggingIn(true);
    try {
      const loggedInUser = await showAuthPrompt();
      if (loggedInUser) {
        setUser(loggedInUser);
        return loggedInUser;
      }
      return null;
    } catch (error) {
      console.error('CrazyGames login error:', error);
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  }, [isAvailable, showAuthPrompt]);

  return {
    isCrazyGames,
    isReady,
    user,
    isLoggedIn: !!user,
    isLoggingIn,
    login,
    isAccountAvailable,
    getUserToken,
    showAccountLink,
  };
}

export default useCrazyGamesAuth;
