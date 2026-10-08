'use client';

import { useEffect, useState } from 'react';
import { isReducedMotionPreferred } from '@/utils/accessibility';

const FRAME_MS = 16;

export function useCountUp(target: number, durationMs = 600): number {
  const [reduced] = useState(() => isReducedMotionPreferred());
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const start = Date.now();
    let timer = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) timer = window.setTimeout(tick, FRAME_MS);
    };
    timer = window.setTimeout(tick, FRAME_MS);
    return () => window.clearTimeout(timer);
  }, [target, durationMs, reduced]);

  return reduced ? target : shown;
}
