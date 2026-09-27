/**
 * useEvents hook
 * Fetches and manages seasonal/limited-time events for the current user.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';

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

  const { data, isLoading } = useQuery<EventsData>({
    queryKey: queryKeys.events.all(),
    queryFn: async ({ signal }) => {
      const res = await getWithAuth('/api/events', { signal });
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
    // Proper TanStack optimistic update with rollback
    onMutate: async (eventId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.events.all() });
      const previous = queryClient.getQueryData<EventsData>(queryKeys.events.all());

      queryClient.setQueryData<EventsData>(queryKeys.events.all(), (old) => {
        if (!old) return old;
        const joined = old.active.find(e => e.id === eventId);
        if (!joined) return old;
        return {
          ...old,
          myEvents: [...old.myEvents, joined],
        };
      });

      return { previous };
    },
    onError: (_err, _eventId, context) => {
      // Rollback on failure
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.events.all(), context.previous);
      }
      logger.error('useEvents: join failed', _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
    },
  });

  const activeEvents = useMemo(() => data?.active ?? [], [data?.active]);
  const upcomingEvents = data?.upcoming ?? [];
  const myEvents = data?.myEvents ?? [];

  const joinEvent = useCallback(async (eventId: string) => {
    await joinMutation.mutateAsync(eventId);
  }, [joinMutation]);

  return { activeEvents, upcomingEvents, myEvents, joinEvent, isLoading };
}
