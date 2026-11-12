'use client';

import type { ReactNode } from 'react';

/** Clipped strip along the top HUD row so edge gags can slide off-screen without page scroll. */
export const MASCOT_EDGE_STAGE_CLASS =
  'absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+2rem)] sm:top-2 h-32 overflow-hidden z-40 pointer-events-none [&_*]:pointer-events-none';

export function MascotEdgeStage({ children }: { children: ReactNode }) {
  return <div className={MASCOT_EDGE_STAGE_CLASS} aria-hidden="true">{children}</div>;
}

export function edgeSign(): 1 | -1 {
  if (typeof document === 'undefined') return 1;
  return document.documentElement.dir === 'rtl' ? -1 : 1;
}
