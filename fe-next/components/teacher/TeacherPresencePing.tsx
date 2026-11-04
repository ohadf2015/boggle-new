'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Bumps profiles.last_seen_at for an authenticated session on the teacher and
 * education surfaces. useFriends is not mounted there, so a teacher who only
 * opens the dashboard never writes last_seen_at.
 *
 * Reuses updateOnlineStatus (module-level throttle, 90s — under the 5-minute
 * online threshold). Does not mount the friends hook, renders nothing, and
 * never calls the writer for an anonymous or still-loading session.
 *
 * The writer is dynamically imported so this layout does not pull the friends
 * chunk into SSR. A chunk that is not ready yet is swallowed; the next
 * pathname change retries. The throttle still collapses those retries.
 */
export function TeacherPresencePing() {
  const pathname = usePathname();
  const { isAuthenticated, loading, user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (loading || !isAuthenticated || !userId) return;
    let cancelled = false;
    void import('@/utils/friendsHeadToHead')
      .then((mod) => {
        if (cancelled || typeof mod.updateOnlineStatus !== 'function') return;
        return mod.updateOnlineStatus(userId);
      })
      .catch(() => {
        // Chunk failed to load. Next route change inside this layout retries.
      });
    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, userId, pathname]);

  return null;
}
