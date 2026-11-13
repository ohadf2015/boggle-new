'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getWithAuth } from '@/utils/authFetch';

export interface MissedDaily {
  date: string;
  puzzleNumber: number;
}

export type DailyMode = 'word-hunt' | 'word-wheel';

/** 'error' means the list is unknown, not empty. */
export type MissedDailiesStatus = 'idle' | 'loading' | 'ok' | 'error';

/**
 * Fetches the daily challenges (Word Hunt or Word Wheel) the player missed within the catch-up
 * window (last 3 days). Powers the post-results "catch up" suggestion.
 * Fails soft: a network/429/5xx error leaves the list empty rather than throwing.
 * @param mode - Which daily mode to fetch missed challenges for (default: 'word-hunt')
 * @param enabled - Whether to fetch (default: true)
 */
export function useMissedDailies(mode: DailyMode = 'word-hunt', enabled: boolean = true, language?: string): { missed: MissedDaily[]; loading: boolean; status: MissedDailiesStatus } {
  const [missed, setMissed] = useState<MissedDaily[]>([]);
  const [status, setStatus] = useState<MissedDailiesStatus>(enabled ? 'loading' : 'idle');
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    if (!enabled) { setStatus('idle'); return; }
    setStatus('loading');
    getWithAuth(`/api/daily/missed?mode=${mode}${language ? `&language=${language}` : ''}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!mountedRef.current) return;
        if (Array.isArray(json?.missed)) {
          setMissed(json.missed);
          setStatus('ok');
        } else {
          setStatus('error');
        }
      })
      .catch(() => { if (mountedRef.current) setStatus('error'); });
  }, [enabled, mode, language]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { missed, loading: status === 'loading', status };
}
