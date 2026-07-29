import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'lc.seen_kb_demo';

interface Options {
  enabled: boolean;
}

/**
 * Gates a one-time keyboard-input intro (3-second auto-demo) on the first
 * desktop MP game an account ever plays. Persists the "seen" flag to
 * localStorage so it survives reload + offline.
 *
 * `enabled` lets the caller suppress the demo without consuming the seen flag,
 * e.g. on mobile (where keyboard isn't relevant). Once the user lands on a
 * desktop MP game with `enabled=true`, the demo plays once forever.
 */
export function useFirstTouchKbDemo({ enabled }: Options) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    setShouldShow(seen !== '1');
  }, [enabled]);

  const markSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setShouldShow(false);
  }, []);

  return { shouldShow, markSeen };
}
