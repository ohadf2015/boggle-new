'use client';

import { useEffect, useRef } from 'react';

const MAX_DT = 0.1;

export function useArcadeLoop(tick: (dt: number) => void, running: boolean): void {
  const cb = useRef(tick);
  useEffect(() => {
    cb.current = tick;
  });

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      cb.current(Math.min(MAX_DT, Math.max(0, (now - last) / 1000)));
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
