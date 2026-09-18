'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/hooks/gameState/store';

/**
 * Publish PlayerView's "a round is being played" flag to the store, which is
 * what the multiplayer page reads to hide the classroom settings banner.
 *
 * PlayerView keeps its own flag because its countdown→activation effect and
 * the reconnect path depend on it flipping false→true locally (that flip is
 * what resumes the local timer); the store is where everyone else reads it.
 * Without this the page saw `false` for a whole first-join round.
 */
export function usePublishGameActive(gameActive: boolean): void {
  useEffect(() => {
    useGameStore.getState().setGameActive(gameActive);
  }, [gameActive]);

  // Leaving the room must not leave a stale `true` for the next page.
  useEffect(() => () => useGameStore.getState().setGameActive(false), []);
}
