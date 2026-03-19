'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActivityEvent } from '@/app/api/activity/recent/route';

/**
 * useLiveActivity — Fetches recent game activity for the landing page ticker.
 * Polls every 60s, returns a shuffled array of ActivityEvent objects.
 */
export function useLiveActivity(): { events: ActivityEvent[]; loading: boolean } {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/activity/recent');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
      }
    } catch {
      // Silently fail — ticker just won't update
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return { events, loading };
}
