/**
 * useCrossTabSync - Cross-tab authentication synchronization
 *
 * Handles synchronization of auth state across browser tabs:
 * - Broadcasts auth events to other tabs (sign in, sign out, token refresh)
 * - Listens for auth events from other tabs
 * - Ensures consistent auth state across all tabs
 */

import { useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  initCrossTabAuthSync,
  destroyCrossTabAuthSync,
  subscribeToAuthSync,
  broadcastSessionRefreshed,
  type AuthSyncMessage,
} from '@/utils/crossTabAuthSync';
import logger from '@/utils/logger';
import type { AuthStateSetters } from '../authTypes';

interface UseCrossTabSyncParams {
  userIdRef: React.MutableRefObject<string | null>;
  setters: AuthStateSetters;
  fetchUserData: (userId: string, userMetadata?: Record<string, unknown>) => Promise<void>;
  clearAuthState: (reason: string) => Promise<void>;
  isMountedRef: React.MutableRefObject<boolean>;
}

/**
 * Hook to handle cross-tab auth synchronization
 */
export function useCrossTabSync({
  userIdRef,
  setters,
  fetchUserData,
  clearAuthState,
  isMountedRef,
}: UseCrossTabSyncParams): () => void {
  const { setUser, setProfile, setRankedProgress, setLoading } = setters;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Handle incoming cross-tab auth sync messages
   */
  const handleCrossTabMessage = useCallback(
    async (message: AuthSyncMessage) => {
      if (!isMountedRef.current || !supabase) return;

      logger.debug(`AuthContext: Received cross-tab message: ${message.type}`);

      switch (message.type) {
        case 'AUTH_SUCCESS':
          // Another tab successfully authenticated - check for session
          logger.log('AuthContext: Another tab authenticated, checking for session');
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user && isMountedRef.current) {
              // Only update user if ID changed to prevent infinite loops
              if (sessionData.session.user.id !== userIdRef.current) {
                // Session synced from other tab - update state
                setUser(sessionData.session.user);
                await fetchUserData(
                  sessionData.session.user.id,
                  sessionData.session.user.user_metadata
                );
                setLoading(false);
              }
            }
          } catch (err) {
            logger.warn('AuthContext: Error handling cross-tab auth success:', err);
          }
          break;

        case 'SIGNED_OUT':
          // Another tab signed out - clear our state too
          logger.log('AuthContext: Another tab signed out, clearing state');
          setUser(null);
          setProfile(null);
          setRankedProgress(null);
          setLoading(false);
          break;

        case 'SESSION_REFRESHED':
          // Another tab refreshed the session - ensure we have fresh state
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user && isMountedRef.current) {
              // Only update user if ID changed to prevent infinite loops
              if (sessionData.session.user.id !== userIdRef.current) {
                setUser(sessionData.session.user);
              }
            }
          } catch (err) {
            logger.debug('AuthContext: Error handling cross-tab session refresh:', err);
          }
          break;

        default:
          // Ignore other message types (CODE_LOCK_ACQUIRED, CODE_LOCK_RELEASED)
          break;
      }
    },
    [
      isMountedRef,
      userIdRef,
      setUser,
      setProfile,
      setRankedProgress,
      setLoading,
      fetchUserData,
    ]
  );

  /**
   * Initialize cross-tab sync on mount
   */
  useEffect(() => {
    initCrossTabAuthSync();
    unsubscribeRef.current = subscribeToAuthSync(handleCrossTabMessage);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      destroyCrossTabAuthSync();
    };
  }, [handleCrossTabMessage]);

  /**
   * Return cleanup function for external use
   */
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    destroyCrossTabAuthSync();
  }, []);

  return cleanup;
}

/**
 * Broadcast that token was refreshed to other tabs
 */
export function notifySessionRefreshed(userId: string): void {
  broadcastSessionRefreshed(userId);
}
