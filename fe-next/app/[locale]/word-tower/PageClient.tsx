'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Pixi touches `window` at import time, so the game must never be server
 * rendered. `ssr: false` is only legal inside a Client Component, which is what
 * this wrapper exists to provide — the same shape v1 uses.
 */
const WordTowerV2 = dynamic(() => import('@/components/wordTowerV2/WordTowerV2'), {
  ssr: false,
});

/**
 * Word Tower v2 — now public (GA).
 * The physics rebuild is now the default Word Tower for all players.
 */
export function WordTowerV2PageClient({ daily = false }: { daily?: boolean } = {}) {
  const { loading, user, profile } = useAuth();

  // No gate — Word Tower v2 is now public for all players.
  // Still wait for auth to resolve so the UI state is consistent.
  const resolving = loading || (!!user && !profile);

  if (resolving) return null;

  return <WordTowerV2 daily={daily} />;
}
