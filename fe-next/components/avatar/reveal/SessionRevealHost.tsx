'use client';

import { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import {
  clearPublishedReveal,
  getPublishedReveal,
  subscribeReveal,
} from '@/lib/avatar/revealTrigger';

const ConnectedUnlockReveal = dynamic(() => import('./ConnectedUnlockReveal'), { ssr: false });

const getServerSnapshot = () => null;

/**
 * Shows the reveal for a level-up published to lib/avatar/revealTrigger
 * (surfaces without a results modal queue, e.g. singleplayer, where the
 * level-up arrives from /api/stats/record-game after the results screen).
 * Renders nothing — and loads nothing — until something is published.
 */
export default function SessionRevealHost() {
  const reveal = useSyncExternalStore(subscribeReveal, getPublishedReveal, getServerSnapshot);
  if (!reveal) return null;
  return <ConnectedUnlockReveal key={reveal.key} reveal={reveal} onClose={clearPublishedReveal} />;
}
