'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FriendsHomeData } from '@/lib/friends/home/types';

export const POLL_MS = 30_000;
const DEDUPE_MS = 1_000;

let inflight: { key: string; at: number; promise: Promise<FriendsHomeData> } | null = null;

function fetchFriendsHome(suggestions: boolean, force: boolean): Promise<FriendsHomeData> {
  const url = suggestions ? '/api/friends/home?suggestions=1' : '/api/friends/home';
  const now = Date.now();
  if (!force && inflight && inflight.key === url && now - inflight.at < DEDUPE_MS) return inflight.promise;
  const promise = fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(async (res) => {
    if (!res.ok) throw new Error(`friends-home ${res.status}`);
    return (await res.json()) as FriendsHomeData;
  });
  const entry = { key: url, at: now, promise };
  inflight = entry;
  promise.catch(() => {
    if (inflight === entry) inflight = null;
  });
  return promise;
}

export function resetFriendsHomeForTests(): void {
  inflight = null;
}

/** The signed-in player's crew (friends, presence, requests, suggestions), refreshed every 30s while the tab is visible. */
export function useFriendsHome(enabled: boolean, opts: { suggestions?: boolean } = {}) {
  const suggestions = !!opts.suggestions;
  const [data, setData] = useState<FriendsHomeData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    (force = false) => {
      if (!enabled) return Promise.resolve();
      return fetchFriendsHome(suggestions, force).then(
        (d) => {
          setData(d);
          setError(false);
        },
        () => setError(true),
      );
    },
    [enabled, suggestions],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, load]);

  const refresh = useCallback(() => load(true), [load]);
  return { data, error, loading: enabled && !data && !error, refresh };
}
