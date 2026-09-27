'use client';

import type { ReactNode } from 'react';

/**
 * ROUND stub: the 3-2-1-GO slot. HostView / PlayerView mount the countdown
 * (today GoRipplesAnimation, with its countdownComplete wiring) as the child;
 * it stays an overlay over the round, so this adds no frame. The ROUND piece
 * owns this file (and GoRipplesAnimation) and turns it into the full-screen
 * solid-navy countdown with the board hidden until GO.
 */
export function MpCountdown({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
