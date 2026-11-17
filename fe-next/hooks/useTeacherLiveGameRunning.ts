'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type LiveGameRunning = boolean | null;

const POLL_MS = 45_000;

/**
 * Is this teacher running a live classroom game right now?
 *
 * Teacher Home holds back the Teacher Pro offer while the answer is yes — a
 * mid-class tap never converts (ur-audit 2026-11-17), the ask is post-class.
 *
 * `null` = unknown (not yet answered, signed out, or the read failed): callers
 * must treat it as "not live" so a broken check never hides the offer.
 * Disabled (no classrooms) means the question is moot and stays `false`.
 */
export function useTeacherLiveGameRunning(enabled: boolean): LiveGameRunning {
  const [live, setLive] = useState<LiveGameRunning>(enabled ? null : false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const read = useCallback(async () => {
    try {
      const res = await fetch('/api/education/classroom/live-status', { credentials: 'same-origin' });
      if (res.status === 401 || res.status === 403) {
        setLive(false);
        return;
      }
      if (!res.ok) return; // keep the last answer; a blip must not flicker the rail
      const body = (await res.json()) as { live?: unknown };
      setLive(body?.live === true);
    } catch {
      /* unknown — fail open, the offer stays */
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLive(false);
      return;
    }
    void read();
    timerRef.current = setInterval(() => void read(), POLL_MS);
    const onFocus = () => void read();
    window.addEventListener('focus', onFocus);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, read]);

  return live;
}
