import { useEffect, useRef, useState } from 'react';

export interface WheelClock {
  timeLeft: () => number;
  subscribe: (listener: () => void) => () => void;
}

interface UseWheelTimerArgs {
  duration: number;
  running: boolean;
  onExpire: () => void;
  /** Each of the final nine seconds, once, and only the current one after a background gap. */
  onTick: (secondsLeft: number) => void;
  onWarning: () => void;
}

const TICK_MS = 250;
const WARNING_AT = 10;

/** Deadline-based countdown: a throttled background tab cannot gain time, and only subscribers re-render per second. */
export function useWheelTimer({ duration, running, onExpire, onTick, onWarning }: UseWheelTimerArgs) {
  const callbacks = useRef({ onExpire, onTick, onWarning });
  callbacks.current = { onExpire, onTick, onWarning };
  const state = useRef({ remainingMs: duration * 1000, shown: duration, warned: false, expired: false });
  const listeners = useRef(new Set<() => void>());
  const [clock] = useState<WheelClock>(() => ({
    timeLeft: () => state.current.shown,
    subscribe: (listener) => {
      listeners.current.add(listener);
      return () => { listeners.current.delete(listener); };
    },
  }));

  useEffect(() => {
    const s = state.current;
    if (!running || s.expired) return;
    const deadline = Date.now() + s.remainingMs;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      s.remainingMs = Math.max(0, deadline - Date.now());
      const secs = Math.ceil(s.remainingMs / 1000);
      if (secs === s.shown) return;
      s.shown = secs;
      listeners.current.forEach(l => l());
      if (secs <= WARNING_AT && !s.warned) {
        s.warned = true;
        callbacks.current.onWarning();
      }
      if (secs <= 0) {
        s.expired = true;
        if (id) clearInterval(id);
        callbacks.current.onExpire();
        return;
      }
      if (secs < WARNING_AT) callbacks.current.onTick(secs);
    };
    id = setInterval(tick, TICK_MS);
    return () => {
      if (id) clearInterval(id);
      if (!s.expired) s.remainingMs = Math.max(0, deadline - Date.now());
    };
  }, [running]);

  return { clock };
}
