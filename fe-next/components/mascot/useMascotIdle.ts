'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeMascotEvents } from '@/lib/blast/mascotBus';
import { idlePhase, type IdlePhase } from '@/lib/mascot/idle';

const TICK_MS = 1000;

export function useMascotIdle(enabled: boolean, onDoze: () => void): IdlePhase {
  const [phase, setPhase] = useState<IdlePhase>('awake');
  const phaseRef = useRef<IdlePhase>('awake');
  const lastWordAt = useRef(0);
  const onDozeRef = useRef(onDoze);
  onDozeRef.current = onDoze;

  useEffect(() => {
    phaseRef.current = 'awake';
    setPhase('awake');
    if (!enabled) return;
    lastWordAt.current = Date.now();
    const unsubscribe = subscribeMascotEvents((event) => {
      if (event.kind !== 'word-submitted') return;
      lastWordAt.current = Date.now();
      phaseRef.current = 'awake';
      setPhase('awake');
    });
    const timer = setInterval(() => {
      const next = idlePhase(lastWordAt.current, Date.now());
      if (next === phaseRef.current) return;
      if (next === 'doze') onDozeRef.current();
      phaseRef.current = next;
      setPhase(next);
    }, TICK_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [enabled]);

  return phase;
}
