'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * First-run "have they seen the how-to-play yet" flag, backed by localStorage.
 *
 * Starts `seen=true` so SSR and the first client render agree (no card in the
 * markup → no hydration mismatch). An effect then flips it to `false` for
 * first-timers, so the card animates in just after mount. `markSeen()`
 * persists the dismissal so it never shows again on that device.
 */
export function useFirstRunSeen(key: string): { seen: boolean; markSeen: () => void } {
  const storageKey = `lexi-howto-seen-${key}`;
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) !== '1') setSeen(false);
    } catch {
      /* storage blocked (private mode) — just leave the card hidden */
    }
  }, [storageKey]);

  const markSeen = useCallback(() => {
    setSeen(true);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore persistence failure */
    }
  }, [storageKey]);

  return { seen, markSeen };
}
