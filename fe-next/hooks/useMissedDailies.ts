'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface MissedDaily {
  date: string;
  puzzleNumber: number;
}

/**
 * Fetches the daily Word Hunt challenges the player missed within the catch-up
 * window (last 3 days). Powers the post-results "catch up" suggestion.
 * Fails soft: a network/429/5xx error leaves the list empty rather than throwing.
 */
export function useMissedDailies(enabled: boolean = true): { missed: MissedDaily[]; loading: boolean } {
  const [missed, setMissed] = useState<MissedDaily[]>([]);
  const [loading, setLoading] = useState(enabled);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    fetch('/api/daily/missed')
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!mountedRef.current) return;
        if (Array.isArray(json?.missed)) setMissed(json.missed);
        setLoading(false);
      })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { missed, loading };
}
