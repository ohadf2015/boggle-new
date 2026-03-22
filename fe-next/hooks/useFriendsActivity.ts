/**
 * useFriendsActivity Hook
 *
 * Fetches recent activity from friends via Supabase REST.
 * Returns formatted events for the FriendsActivityFeed landing card.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface FriendActivityEvent {
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  friendAvatarConfig: CustomAvatarConfig | null;
  actionKey: string;
  actionParams: Record<string, unknown>;
  timeAgo: string;
  mode: string;
  beatPlayer: boolean;
}

interface RawSession {
  user_id: string;
  mode: string;
  score: number;
  words_found: number;
  created_at: string;
  daily_number: number | null;
  adventure_world: number | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_image: string | null;
    avatar_config: CustomAvatarConfig | null;
  };
}

/** Format relative time from ISO timestamp */
function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'justNow';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Map a game session row to an activity event */
function mapSessionToEvent(row: RawSession): FriendActivityEvent {
  const profile = row.profiles;
  const friendName = profile.display_name || profile.username;

  let actionKey = 'friendsActivity.scored';
  let actionParams: Record<string, unknown> = { score: row.score, number: row.daily_number ?? 0 };

  if (row.mode === 'blast') {
    actionKey = 'friendsActivity.blastWords';
    actionParams = { count: row.words_found };
  } else if (row.mode === 'adventure' && row.adventure_world) {
    actionKey = 'friendsActivity.reachedWorld';
    actionParams = { world: row.adventure_world };
  }

  return {
    friendId: row.user_id,
    friendName,
    friendAvatar: profile.avatar_image,
    friendAvatarConfig: profile.avatar_config,
    actionKey,
    actionParams,
    timeAgo: formatTimeAgo(row.created_at),
    mode: row.mode,
    beatPlayer: false,
  };
}

const MAX_EVENTS = 5;

export function useFriendsActivity() {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<FriendActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !supabase) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchActivity() {
      try {
        // Step 1: Get friend IDs
        const { data: friendRows, error: friendsError } = await supabase!
          .from('friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(50);

        if (cancelled) return;
        if (friendsError || !friendRows || friendRows.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        // Extract unique friend IDs
        const friendIds = [...new Set(
          friendRows.map((r: { user_id: string; friend_id: string }) =>
            r.user_id === user!.id ? r.friend_id : r.user_id
          )
        )];

        // Step 2: Get recent game sessions from friends
        const { data: sessions, error: sessionsError } = await supabase!
          .from('game_sessions')
          .select('user_id, mode, score, words_found, created_at, daily_number, adventure_world, profiles!inner(username, display_name, avatar_image, avatar_config)')
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .limit(MAX_EVENTS);

        if (cancelled) return;
        if (sessionsError || !sessions) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const mapped = (sessions as unknown as RawSession[]).map(mapSessionToEvent);
        setEvents(mapped);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchActivity();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { events, loading };
}
