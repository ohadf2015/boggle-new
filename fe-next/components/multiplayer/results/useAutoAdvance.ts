'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Same key the legacy StickyReadyBar used, so a player's choice carries over. */
export const AUTO_ADVANCE_CANCEL_KEY = 'mp-auto-advance-cancelled';

interface Options {
  seconds: number;
  /** Start counting only once the reveal has handed over to the footer. */
  armed: boolean;
  /** Hold (details sheet, a modal) — resumes where it stopped. */
  paused: boolean;
  /** False in a classroom: the teacher paces the room. */
  enabled: boolean;
  onFire: () => void;
  /** CrazyGames: never remember a cancel (a locked manual-ready ends sessions). */
  persistCancel?: boolean;
}

function readCancelled(persist: boolean): boolean {
  if (!persist) return false;
  try {
    return sessionStorage.getItem(AUTO_ADVANCE_CANCEL_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The intermission's auto-advance ring: one 1s interval while armed, not
 * paused and not cancelled; fires `onFire` exactly once at zero.
 */
export function useAutoAdvance({ seconds, armed, paused, enabled, onFire, persistCancel = true }: Options) {
  const [cancelled, setCancelled] = useState(() => readCancelled(persistCancel));
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const firedRef = useRef(false);
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);

  const active = enabled && !cancelled;
  const running = active && armed && !paused && secondsLeft > 0;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0 || firedRef.current || !active) return;
    firedRef.current = true;
    onFireRef.current();
  }, [secondsLeft, active]);

  const cancel = useCallback(() => {
    setCancelled(true);
    if (!persistCancel) return;
    try {
      sessionStorage.setItem(AUTO_ADVANCE_CANCEL_KEY, '1');
    } catch {
      /* storage blocked */
    }
  }, [persistCancel]);

  const clearCancel = useCallback(() => {
    try {
      sessionStorage.removeItem(AUTO_ADVANCE_CANCEL_KEY);
    } catch {
      /* storage blocked */
    }
  }, []);

  return { secondsLeft, active, cancel, clearCancel };
}
