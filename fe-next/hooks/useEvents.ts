/**
 * useEvents hook
 * Fetches and manages seasonal/limited-time events for the current user.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ClientGameEvent {
  id: string;
  name: string;
  description: string;
  type: 'tournament' | 'holiday' | 'weekend' | 'special';
  status: 'upcoming' | 'active' | 'ended';
  start_time: string;
  end_time: string;
  config: Record<string, unknown>;
  rewards: Array<{ position: number; coins: number; title?: string; badge?: string }>;
}

export interface UseEventsReturn {
  activeEvents: ClientGameEvent[];
  upcomingEvents: ClientGameEvent[];
  myEvents: ClientGameEvent[];
  joinEvent: (eventId: string) => Promise<void>;
  isLoading: boolean;
}

export function useEvents(): UseEventsReturn {
  const [activeEvents, setActiveEvents] = useState<ClientGameEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ClientGameEvent[]>([]);
  const [myEvents, setMyEvents] = useState<ClientGameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setActiveEvents(data.active ?? []);
        setUpcomingEvents(data.upcoming ?? []);
        setMyEvents(data.myEvents ?? []);
      } catch {
        // Silently fail - events are non-critical
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  const joinEvent = useCallback(async (eventId: string) => {
    const res = await fetch('/api/events/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to join event');
    }
    // Optimistically add to myEvents
    const joined = activeEvents.find((e) => e.id === eventId);
    if (joined) {
      setMyEvents((prev) => [...prev, joined]);
    }
  }, [activeEvents]);

  return { activeEvents, upcomingEvents, myEvents, joinEvent, isLoading };
}
