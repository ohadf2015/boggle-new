'use client';

import { useSyncExternalStore } from 'react';

const DESKTOP = '(min-width: 1024px)';

type SheetSide = 'bottom' | 'end';

function desktopQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP) : null;
}

function subscribe(onChange: () => void): () => void {
  const mq = desktopQuery();
  mq?.addEventListener?.('change', onChange);
  return () => mq?.removeEventListener?.('change', onChange);
}

const getSide = (): SheetSide => (desktopQuery()?.matches ? 'end' : 'bottom');
const getServerSide = (): SheetSide => 'bottom';

/**
 * Which side an entry MpSheet docks to: a bottom sheet on phone, a 560px end
 * panel from `lg` up (DESIGN §b.2). Read during render because an invite link
 * opens the sheet with no tap, and a post-paint correction counts as a layout shift.
 */
export function useSheetSide(): SheetSide {
  return useSyncExternalStore(subscribe, getSide, getServerSide);
}
