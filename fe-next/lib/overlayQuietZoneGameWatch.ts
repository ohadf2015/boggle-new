'use client';

/**
 * Opens the overlay quiet zone the instant a round ends — before anything has
 * mounted to claim it.
 *
 * This closes the one hole a claim-based design cannot close on its own. The
 * sequence that shipped the bug: the game ends, `gameActive` flips false, and
 * `PlayerStyleOnboardingWrapper` starts an 800ms timer. The classroom recap
 * that would claim the zone arrives in a `next/dynamic` chunk. If the chunk
 * loses that race the modal opens over the podium AND writes its one-shot
 * "shown" marker, so the loss is permanent — a race between a network chunk and
 * a timer decides whether a child sees their own result.
 *
 * Here the zone is raised from the transition itself, so the pessimistic state
 * is the one rendered while the late source resolves (pitfalls class 1). The
 * recap's own claim then takes over and holds it for as long as it is on screen.
 *
 * Mounted once, at the layout level, by `DeferredLayoutWidgets` — the same place
 * every gated prompt is mounted, so the signal and its consumers cannot drift
 * apart. The game store is a global zustand singleton, so no provider is needed.
 */

import { useEffect, useRef } from 'react';
import { useGameActive, useWaitingForResults } from '@/hooks/gameState/store';
import { noteOverlayQuietZoneGameOver } from './overlayQuietZone';

export function useOverlayQuietZoneGameWatch(): void {
  const gameActive = useGameActive();
  const waitingForResults = useWaitingForResults();
  // Only a game that actually STARTED can end. Without this, every mount on a
  // menu page (gameActive already false) would open a quiet zone for nothing.
  const playedRef = useRef(false);

  useEffect(() => {
    if (gameActive) {
      playedRef.current = true;
      return;
    }
    if (!playedRef.current) return;
    playedRef.current = false;
    noteOverlayQuietZoneGameOver();
  }, [gameActive]);

  // The results are being computed — the recap is about to paint. Same moment,
  // reached from the other side (pitfalls class 3: two paths to one outcome
  // must behave identically, so both raise the zone).
  useEffect(() => {
    if (!waitingForResults) return;
    noteOverlayQuietZoneGameOver();
  }, [waitingForResults]);
}

export default useOverlayQuietZoneGameWatch;
