'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface MissedDaily {
  date: string;
  puzzleNumber: number;
}

export type DailyMode = 'word-hunt' | 'word-wheel';

/**
 * Fetches the daily challenges (Word Hunt or Word Wheel) the player missed within the catch-up
 * window (last 3 days). Powers the post-results "catch up" suggestion.
 * Fails soft: a network/429/5xx error leaves the list empty rather than throwing.
 * @param mode - Which daily mode to fetch missed challenges for (default: 'word-hunt')
 * @param enabled - Whether to fetch (default: true)
 */
export function useMissedDailies(mode: DailyMode = 'word-hunt', enabled: boolean = true): { missed: MissedDaily[]; loading: boolean } {
  const [missed, setMissed] = useState<MissedDaily[]>([]);
  const [loading, setLoading] = useState(enabled);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    fetch(`/api/daily/missed?mode=${mode}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!mountedRef.current) return;
        if (Array.isArray(json?.missed)) setMissed(json.missed);
        setLoading(false);
      })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  }, [enabled, mode]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { missed, loading };
}
