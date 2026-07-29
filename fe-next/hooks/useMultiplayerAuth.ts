/**
 * Authentication and profile management for multiplayer games
 * Handles guest names, authenticated user profiles, and avatar management
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/utils/logger';
import { getRandomDefaultNameWithAvatar, getAvatarForName } from '@/utils/defaultNames';
import { getStoredUsername, setStoredUsername } from '@/utils/profileStorage';
import type { Language } from '@/shared/types/game';

interface UseMultiplayerAuthReturn {
  username: string;
  setUsername: (value: string) => void;
  guestAvatar: { emoji: string; color: string } | null;
  setGuestAvatar: (value: { emoji: string; color: string } | null) => void;
  authLoadingStartTime: number | null;
  setAuthLoadingStartTime: (value: number | null) => void;
  usernameManuallySetRef: React.MutableRefObject<boolean>;
  hasSetRandomNameRef: React.MutableRefObject<boolean>;
}

/**
 * Manages authentication state and username/avatar for multiplayer
 */
export function useMultiplayerAuth(language: Language): UseMultiplayerAuthReturn {
  const [username, setUsername] = useState<string>('');
  const [guestAvatar, setGuestAvatar] = useState<{ emoji: string; color: string } | null>(null);
  const [authLoadingStartTime, setAuthLoadingStartTime] = useState<number | null>(null);

  const { user, profile, loading, refreshProfile, isAuthenticated } = useAuth();

  // Track if username has been manually set to prevent auth loading from overwriting
  const usernameManuallySetRef = useRef<boolean>(false);
  const hasSetRandomNameRef = useRef<boolean>(false);

  // Track auth loading start time for timeout
  useEffect(() => {
    if (loading && !authLoadingStartTime) {
      setAuthLoadingStartTime(Date.now());
    } else if (!loading) {
      setAuthLoadingStartTime(null);
    }
  }, [loading, authLoadingStartTime]);

  // Set username and roomName from profile display_name for authenticated users
  // Uses fallback chain from OAuth metadata if profile hasn't loaded yet
  // For guests without saved names, generate random names only after auth is confirmed
  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    if (user) {
      // Authenticated user - use display name from profile/OAuth
      const displayName =
        profile?.display_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        '';

      // Only set if username is empty OR if it hasn't been manually set yet
      if (displayName && !usernameManuallySetRef.current && !username.trim()) {
        setUsername(displayName);
        usernameManuallySetRef.current = true;
      }
    } else if (!hasSetRandomNameRef.current) {
      // Guest user - check if we need to generate a random name
      const savedUsername = getStoredUsername() || '';

      // Only generate random name if BOTH saved and current username are empty
      if (!savedUsername.trim() && !username.trim()) {
        const { name, avatar } = getRandomDefaultNameWithAvatar(language);
        logger.log('[AUTH] Generated random name for guest:', name, 'avatar:', avatar.emoji);
        setUsername(name);
        setGuestAvatar(avatar);
        hasSetRandomNameRef.current = true;
      } else if (savedUsername.trim() && !username.trim()) {
        logger.log('[AUTH] Using saved username:', savedUsername);
        setUsername(savedUsername);
        setGuestAvatar(getAvatarForName(savedUsername));
      } else if (username.trim()) {
        logger.log('[AUTH] Preserving user-entered username:', username);
        setGuestAvatar(getAvatarForName(username));
      }
    }
  }, [user, profile?.display_name, loading, language, username]);

  // Refresh profile on mount for authenticated users
  useEffect(() => {
    if (isAuthenticated && user?.id && refreshProfile) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return {
    username,
    setUsername,
    guestAvatar,
    setGuestAvatar,
    authLoadingStartTime,
    setAuthLoadingStartTime,
    usernameManuallySetRef,
    hasSetRandomNameRef,
  };
}
