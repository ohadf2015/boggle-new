'use client';

import type { ReactNode } from 'react';

/** Clipped strip along the top HUD row so edge gags can slide off-screen without page scroll. */
const STAGE_BASE = 'absolute inset-x-0 overflow-hidden z-40 pointer-events-none [&_*]:pointer-events-none';
const STAGE_TOP = 'top-[calc(env(safe-area-inset-top,0px)+2rem)] sm:top-2 h-32';
export const MASCOT_EDGE_STAGE_CLASS = `${STAGE_BASE} ${STAGE_TOP}`;

/** `className` replaces the strip's position and height, for a mode whose top row is its clues. */
export function MascotEdgeStage({ children, className = STAGE_TOP }: { children: ReactNode; className?: string }) {
  return <div className={`${STAGE_BASE} ${className}`} aria-hidden="true">{children}</div>;
}

export function edgeSign(): 1 | -1 {
  if (typeof document === 'undefined') return 1;
  return document.documentElement.dir === 'rtl' ? -1 : 1;
}
