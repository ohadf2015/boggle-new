'use client';

import { useState, useEffect } from 'react';

const REWARD_AD_ACTIVE_EVENT = 'rewardAdActiveChange';

/**
 * Announce whether a fullscreen rewarded ad is currently on screen.
 *
 * Rewarded-ad CTAs call this around the native ad lifecycle (true on
 * ad-started, false on reward / error / dismiss). Game timers listen via
 * {@link useRewardAdPause} and freeze while the ad covers the game — otherwise
 * the clock ticks to zero behind the ad, the game ends, and the granted reward
 * (e.g. +30s) arrives too late to matter (the "ad stuck, no reward" report).
 */
export function emitRewardAdActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(REWARD_AD_ACTIVE_EVENT, { detail: { active } }),
  );
}

/**
 * Returns true while a rewarded ad is on screen. Mirrors useGiftModalPause:
 * an event-bus pause that feeds useGameTimer's `isExternallyPaused`, so the
 * clock freezes WITHOUT setting the user-pause flag (`isPaused`) — which would
 * hide the in-game ad CTA mid-ad and unmount its hook.
 */
export function useRewardAdPause(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handle = (event: CustomEvent<{ active: boolean }>) => {
      setActive(event.detail.active);
    };

    window.addEventListener(REWARD_AD_ACTIVE_EVENT, handle as EventListener);
    return () => {
      window.removeEventListener(REWARD_AD_ACTIVE_EVENT, handle as EventListener);
    };
  }, []);

  return active;
}
