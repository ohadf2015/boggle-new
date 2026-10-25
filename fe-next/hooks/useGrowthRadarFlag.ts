'use client';

import { useEffect, useState } from 'react';

type GrFlagReader = { getFlag?: (key: string) => string | null | undefined };
type GrQueue = { push: (cb: (gr: GrFlagReader) => void) => unknown };

/**
 * Variant served by a Growth Radar experiment flag, or null (control / not
 * loaded yet / gr.js blocked). gr.js is lazyOnload, so the read goes through
 * window.grq, which runs the callback once flags are in.
 *
 * getFlag is what logs the exposure, so pass enabled=false until the user
 * actually reaches the surface under test.
 */
export function useGrowthRadarFlag(key: string, enabled = true): string | null {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let active = true;
    try {
      const w = window as unknown as { grq?: GrQueue };
      w.grq = w.grq || ([] as unknown as GrQueue);
      w.grq.push((gr) => {
        const value = gr?.getFlag?.(key);
        if (active) setVariant(typeof value === 'string' ? value : null);
      });
    } catch {
      // Experiments must never break the page: fall back to control.
    }
    return () => {
      active = false;
    };
  }, [key, enabled]);

  return variant;
}
