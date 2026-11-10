/**
 * Shared admin data plumbing: an authed JSON fetch and a poll that runs on mount, on an
 * interval, and when the tab becomes visible again, but never while the tab is hidden
 * (no server load for dashboards nobody is looking at).
 */

import { useEffect, useRef } from 'react';

export async function fetchAdminJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** Runs `run` now, every `intervalMs` while visible, and on becoming visible. Restarts when `key` changes. */
export function useAdminPoll(run: () => void | Promise<void>, intervalMs: number, key: unknown): void {
  // Stable ref so the interval and visibility listener never go stale.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    void runRef.current();
    const tick = () => {
      if (!isHidden()) void runRef.current();
    };
    const interval = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [key, intervalMs]);
}
