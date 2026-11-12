'use client';

import { useCallback, useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { trackGrowthEvent } from '@/utils/growthTracking';

/** Friend-request sends from crew surfaces, tracked with the surface's source. */
export function useCrewAdd(source: string, onSent?: () => void) {
  const { sendRequest } = useFriends();
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const add = useCallback(
    async (userId: string) => {
      setBusy(userId);
      try {
        const res = await sendRequest(userId);
        if (!res.success) return false;
        setSent((prev) => new Set(prev).add(userId));
        trackGrowthEvent('friend_request_sent', { source, surface: source });
        onSent?.();
        return true;
      } finally {
        setBusy(null);
      }
    },
    [sendRequest, source, onSent],
  );

  return { add, sent, busy };
}
