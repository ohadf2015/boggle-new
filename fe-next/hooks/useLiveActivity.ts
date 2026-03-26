'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { ActivityEvent } from '@/app/api/activity/recent/route';

/**
 * useLiveActivity — Fetches recent game activity for the landing page ticker.
 * Refetches every 60s via TanStack Query.
 */
export function useLiveActivity(): { events: ActivityEvent[]; loading: boolean } {
  const { data, isLoading } = useQuery<{ events: ActivityEvent[] }>({
    queryKey: queryKeys.activity.recent(),
    queryFn: async () => {
      const res = await fetch('/api/activity/recent');
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const events = Array.isArray(data?.events) ? data.events : [];

  return { events, loading: isLoading };
}
