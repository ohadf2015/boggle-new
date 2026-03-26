/**
 * useEvents hook
 * Fetches and manages seasonal/limited-time events for the current user.
 */

'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

interface EventsData {
  active: ClientGameEvent[];
  upcoming: ClientGameEvent[];
  myEvents: ClientGameEvent[];
}

export interface UseEventsReturn {
  activeEvents: ClientGameEvent[];
  upcomingEvents: ClientGameEvent[];
  myEvents: ClientGameEvent[];
  joinEvent: (eventId: string) => Promise<void>;
  isLoading: boolean;
}

export function useEvents(): UseEventsReturn {
  const queryClient = useQueryClient();
  const [optimisticMyEvents, setOptimisticMyEvents] = useState<ClientGameEvent[]>([]);

  const { data, isLoading } = useQuery<EventsData>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const json = await res.json();
      return {
        active: json.active ?? [],
        upcoming: json.upcoming ?? [],
        myEvents: json.myEvents ?? [],
      };
    },
    staleTime: 2 * 60_000,
  });

  const joinMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch('/api/events/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to join event');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const activeEvents = data?.active ?? [];
  const upcomingEvents = data?.upcoming ?? [];
  const serverMyEvents = data?.myEvents ?? [];

  // Merge server myEvents with optimistic additions
  const myEventIds = new Set(serverMyEvents.map(e => e.id));
  const mergedMyEvents = [
    ...serverMyEvents,
    ...optimisticMyEvents.filter(e => !myEventIds.has(e.id)),
  ];

  const joinEvent = useCallback(async (eventId: string) => {
    // Optimistically add to myEvents
    const joined = activeEvents.find((e) => e.id === eventId);
    if (joined) {
      setOptimisticMyEvents((prev) => [...prev, joined]);
    }
    await joinMutation.mutateAsync(eventId);
  }, [activeEvents, joinMutation]);

  return { activeEvents, upcomingEvents, myEvents: mergedMyEvents, joinEvent, isLoading };
}
