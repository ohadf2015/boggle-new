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
  /**
   * 'session' (default): a cancel is remembered for the browser session.
   * 'screen' (exp-mp-auto-continue-v1): a cancel stops THIS results screen
   * only. A stop already on file (the host's X mid-game) still holds here,
   * then is consumed so the next results re-arm.
   */
  cancelScope?: 'session' | 'screen';
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
export function useAutoAdvance({ seconds, armed, paused, enabled, onFire, persistCancel = true, cancelScope = 'session' }: Options) {
  const [cancelled, setCancelled] = useState(() => readCancelled(persistCancel));
  const screenScoped = cancelScope === 'screen';
  useEffect(() => {
    if (!screenScoped || !persistCancel) return;
    try {
      sessionStorage.removeItem(AUTO_ADVANCE_CANCEL_KEY);
    } catch {
      /* storage blocked */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume once, on mount
  }, []);
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
    if (!persistCancel || screenScoped) return;
    try {
      sessionStorage.setItem(AUTO_ADVANCE_CANCEL_KEY, '1');
    } catch {
      /* storage blocked */
    }
  }, [persistCancel, screenScoped]);

  const clearCancel = useCallback(() => {
    try {
      sessionStorage.removeItem(AUTO_ADVANCE_CANCEL_KEY);
    } catch {
      /* storage blocked */
    }
  }, []);

  return { secondsLeft, active, cancel, clearCancel };
}
