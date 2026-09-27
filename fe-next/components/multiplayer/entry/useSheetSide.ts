'use client';

import { useEffect, useState } from 'react';

const DESKTOP = '(min-width: 1024px)';

/**
 * Which side an entry MpSheet docks to: a bottom sheet on phone, a 560px end
 * panel from `lg` up (DESIGN §b.2). Sheets only open after a tap, so reading
 * matchMedia in an effect never affects first paint (pitfall class 1).
 */
export function useSheetSide(): 'bottom' | 'end' {
  const [side, setSide] = useState<'bottom' | 'end'>('bottom');
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(DESKTOP);
    const apply = () => setSide(mq.matches ? 'end' : 'bottom');
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return side;
}
