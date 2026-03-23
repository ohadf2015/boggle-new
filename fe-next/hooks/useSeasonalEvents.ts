/**
 * useSeasonalEvents Hook
 *
 * Fetches active and upcoming seasonal events from the events table,
 * along with the current user's participation from event_participation.
 * Provides functions to join events and claim rewards.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type {
  SeasonalEvent,
  SeasonalEventReward,
  EventParticipation,
} from '@/shared/types/growth';

export interface UseSeasonalEventsReturn {
  activeEvents: SeasonalEvent[];
  upcomingEvents: SeasonalEvent[];
  myParticipation: EventParticipation[];
  loading: boolean;
  joinEvent: (eventId: string) => Promise<boolean>;
  claimRewards: (eventId: string) => Promise<boolean>;
}

function parseEvent(row: Record<string, unknown>): SeasonalEvent {
  let rewards: SeasonalEventReward[] = [];
  if (row.rewards) {
    rewards = typeof row.rewards === 'string'
      ? JSON.parse(row.rewards as string)
      : (row.rewards as SeasonalEventReward[]);
  }

  let config: Record<string, unknown> = {};
  if (row.config) {
    config = typeof row.config === 'string'
      ? JSON.parse(row.config as string)
      : (row.config as Record<string, unknown>);
  }

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    type: row.type as SeasonalEvent['type'],
    status: row.status as SeasonalEvent['status'],
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    config,
    rewards,
  };
}

function parseParticipation(row: Record<string, unknown>): EventParticipation {
  return {
    eventId: row.event_id as string,
    userId: row.user_id as string,
    score: (row.score as number) ?? 0,
    rank: row.rank as number | undefined,
    rewardsClaimed: (row.rewards_claimed as boolean) ?? false,
    joinedAt: row.joined_at as string,
  };
}

export function useSeasonalEvents(): UseSeasonalEventsReturn {
  const { user } = useAuth();
  const [activeEvents, setActiveEvents] = useState<SeasonalEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SeasonalEvent[]>([]);
  const [myParticipation, setMyParticipation] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchEvents = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch active and upcoming events
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .in('status', ['active', 'upcoming'])
        .order('start_time', { ascending: true });

      if (eventError || !eventData) {
        setActiveEvents([]);
        setUpcomingEvents([]);
      } else {
        const events = eventData.map((r) => parseEvent(r as Record<string, unknown>));
        setActiveEvents(events.filter((e) => e.status === 'active'));
        setUpcomingEvents(events.filter((e) => e.status === 'upcoming'));
      }

      // Fetch user participation if authenticated
      if (user?.id) {
        const { data: partData, error: partError } = await supabase
          .from('event_participation')
          .select('*')
          .eq('user_id', user.id);

        if (!partError && partData) {
          setMyParticipation(
            partData.map((r) => parseParticipation(r as Record<string, unknown>)),
          );
        }
      }
    } catch {
      setActiveEvents([]);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchEvents();
  }, [fetchEvents]);

  const joinEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      // Already participating
      if (myParticipation.some((p) => p.eventId === eventId)) return false;

      try {
        const { data, error } = await supabase
          .from('event_participation')
          .insert({
            event_id: eventId,
            user_id: user.id,
            score: 0,
            rewards_claimed: false,
          })
          .select('*')
          .single();

        if (error || !data) return false;

        const participation = parseParticipation(data as Record<string, unknown>);
        setMyParticipation((prev) => [...prev, participation]);
        return true;
      } catch {
        return false;
      }
    },
    [user?.id, myParticipation],
  );

  const claimRewards = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      const participation = myParticipation.find((p) => p.eventId === eventId);
      if (!participation || participation.rewardsClaimed) return false;

      try {
        const { error } = await supabase
          .from('event_participation')
          .update({ rewards_claimed: true })
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) return false;

        setMyParticipation((prev) =>
          prev.map((p) =>
            p.eventId === eventId ? { ...p, rewardsClaimed: true } : p,
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [user?.id, myParticipation],
  );

  return {
    activeEvents,
    upcomingEvents,
    myParticipation,
    loading,
    joinEvent,
    claimRewards,
  };
}
