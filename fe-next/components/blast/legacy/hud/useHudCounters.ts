'use client';

import { useEffect, useRef, useState } from 'react';

/** Counts the displayed score up to the target (ease-out) and flags a short pulse. */
export function useAnimatedScore(target: number) {
  const [display, setDisplay] = useState(target);
  const [pulse, setPulse] = useState(false);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === prevRef.current) return;
    const start = prevRef.current;
    const delta = target - start;
    const duration = Math.min(400, Math.abs(delta) * 10);
    const startTime = performance.now();
    prevRef.current = target;

    setPulse(true);
    const pulseTimer = setTimeout(() => setPulse(false), 200);

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(pulseTimer);
    };
  }, [target]);

  return { display, pulse };
}

/** Fires a short pulse + the delta whenever the cleared count jumps. */
export function useClearPulse(value: number) {
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value > prevRef.current) {
      setDelta(value - prevRef.current);
      setPulse(true);
      setBurstKey(k => k + 1);
      prevRef.current = value;
      const id = setTimeout(() => setPulse(false), 650);
      return () => clearTimeout(id);
    }
    prevRef.current = value;
    return undefined;
  }, [value]);

  return { pulse, delta, burstKey };
}
