'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

export interface CrazyGamesUser {
  username: string;
  profilePictureUrl: string;
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

    const checkUser = async () => {
      try {
        // Check if accounts are available
        const accountAvailable = await isUserAccountAvailable();
        setIsAccountAvailable(accountAvailable);

        // Get current user if logged in
        const currentUser = await getUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking CrazyGames user:', error);
      } finally {
        setHasCheckedUser(true);
      }
    };

    checkUser();
  }, [isAvailable, isLoading, getUser, isUserAccountAvailable]);

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
  };
}

export default useCrazyGamesAuth;
