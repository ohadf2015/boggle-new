'use client';

import { useEffect, useRef } from 'react';
import { subscribeMascotEvents } from '@/lib/blast/mascotBus';
import { idlePhase } from '@/lib/mascot/idle';

const TICK_MS = 1000;

/** Calls onIdle once per quiet stretch; any word, even a short one, resets it. */
export function useIdleTrigger(enabled: boolean, onIdle: () => void): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let lastWordAt = Date.now();
    let fired = false;
    const unsubscribe = subscribeMascotEvents((event) => {
      if (event.kind !== 'word-submitted') return;
      lastWordAt = Date.now();
      fired = false;
    });
    const timer = setInterval(() => {
      if (fired || idlePhase(lastWordAt, Date.now()) === 'awake') return;
      fired = true;
      onIdleRef.current();
    }, TICK_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [enabled]);
}
