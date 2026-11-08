import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { AuthStateSetters } from '../authTypes';

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Handle tab becoming visible - verify session and sync state
 */
export async function handleTabBecameVisible(
  userIdRef: React.MutableRefObject<string | null>,
  lastVisibleTimeRef: React.MutableRefObject<number>,
  setters: AuthStateSetters,
  fetchUserData: (userId: string, userMetadata?: Record<string, unknown>) => Promise<void>,
  clearAuthState: (reason: string) => Promise<void>,
  isMountedRef: React.MutableRefObject<boolean>
): Promise<void> {
  const { setUser } = setters;
  const now = Date.now();
  const timeInactive = now - lastVisibleTimeRef.current;
  const currentUserId = userIdRef.current;

  if (timeInactive > TEN_MINUTES_MS && currentUserId) {
    // Verify session is still valid after long inactivity
    logger.log('Tab visible after long inactivity, checking session validity');
    if (supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session && isMountedRef.current) {
        logger.log('Session expired during inactivity');
        await clearAuthState('Session expired during inactivity');
        return;
      }
    }
  }

  // Always sync session when tab becomes visible (fixes stuck auth issue)
  logger.log('Tab became visible, syncing session state');
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      if (sessionData.session.user.id !== userIdRef.current) {
        if (isMountedRef.current) {
          logger.log('Session synced from cookies on tab visibility');
          setUser(sessionData.session.user);
          try {
            await fetchUserData(
              sessionData.session.user.id,
              sessionData.session.user.user_metadata
            );
          } catch (err) {
            logger.warn('Error fetching user data on tab visibility:', err);
          }
        }
      }
    } else if (userIdRef.current && isMountedRef.current) {
      // Downgraded warn → debug: expected when user logs out in another tab.
      logger.debug('No session found on tab visibility but user state exists');
      await clearAuthState('Session not found on tab visibility');
    }
  }
}
