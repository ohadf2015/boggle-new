'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchIncomingPings, type IncomingPingView } from '@/lib/rivals/pingClient';
import { pingIdFromEntityType } from '@/lib/rivals/pings';
import { subscribeToNotifications } from '@/lib/supabaseRealtimeNotifications';

/** Unread rival pings for a signed-in player, oldest first, live via its own realtime channel. */
export function useIncomingRivalPings() {
  const { user, loading, isAuthenticated } = useAuth();
  const userId = !loading && isAuthenticated && user && !user.is_anonymous ? user.id : null;

  const [queue, setQueue] = useState<IncomingPingView[]>([]);
  const dismissed = useRef(new Set<string>());

  const load = useCallback(async () => {
    const pings = await fetchIncomingPings();
    const fresh = pings
      .filter((p) => !dismissed.current.has(p.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    setQueue((prev) => {
      const known = new Set(prev.map((p) => p.id));
      const added = fresh.filter((p) => !known.has(p.id));
      return added.length ? [...prev, ...added] : prev;
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    void load();
    return subscribeToNotifications(
      userId,
      (n) => {
        if (pingIdFromEntityType(n.related_entity_type)) void load();
      },
      undefined,
      'rival-pings',
    );
  }, [userId, load]);

  const dismiss = useCallback((id: string) => {
    dismissed.current.add(id);
    setQueue((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { queue, dismiss };
}
