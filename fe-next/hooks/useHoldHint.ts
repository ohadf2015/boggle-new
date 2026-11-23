'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BURST_TAPS = 3;
const BURST_WINDOW_MS = 1500;
const SHOW_MS = 2500;

/**
 * Hold-to-clear has no visual cue, so players rub a wrong word out one tap at a
 * time. After a quick burst of backspace taps, show "hold to clear" once.
 */
export function useHoldHint() {
  const [show, setShow] = useState(false);
  const taps = useRef<number[]>([]);
  const done = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const noteTap = useCallback(() => {
    if (done.current) return;
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < BURST_WINDOW_MS), now];
    if (taps.current.length < BURST_TAPS) return;
    done.current = true;
    setShow(true);
    hideTimer.current = setTimeout(() => setShow(false), SHOW_MS);
  }, []);

  const noteHold = useCallback(() => {
    done.current = true;
    setShow(false);
  }, []);

  return { show, noteTap, noteHold };
}
