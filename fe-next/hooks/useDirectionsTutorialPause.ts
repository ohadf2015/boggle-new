'use client';

import { useState, useEffect } from 'react';

const DIRECTIONS_TUTORIAL_ACTIVE_EVENT = 'directionsTutorialActiveChange';

/**
 * Announce whether the first-time "you can trace in ANY direction" tutorial
 * overlay is currently covering the board.
 *
 * The overlay is blocking + timed (a new player must sit with it for ~10s), so
 * the game clock has to freeze underneath it — otherwise a brand-new player's
 * very first round quietly ticks toward zero while they read the tutorial, and
 * the game is half over before they place a single letter.
 *
 * Mirrors {@link useRewardAdPause}/`useGiftModalPause`: an event-bus pause fed
 * into {@link useGameTimer}'s `isExternallyPaused`, so the clock freezes WITHOUT
 * flipping the user-pause flag (`isPaused`) — which would unmount in-game UI and
 * show the manual pause sheet.
 */
export function emitDirectionsTutorialActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DIRECTIONS_TUTORIAL_ACTIVE_EVENT, { detail: { active } }),
  );
}

/**
 * Returns true while the directions tutorial overlay is on screen. Game timers
 * listen and freeze via `useGameTimer`'s `isExternallyPaused`.
 */
export function useDirectionsTutorialPause(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handle = (event: CustomEvent<{ active: boolean }>) => {
      setActive(event.detail.active);
    };

    window.addEventListener(DIRECTIONS_TUTORIAL_ACTIVE_EVENT, handle as EventListener);
    return () => {
      window.removeEventListener(DIRECTIONS_TUTORIAL_ACTIVE_EVENT, handle as EventListener);
    };
  }, []);

  return active;
}
