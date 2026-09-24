'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hands the homepage's "open quick play" action (PageClient →
 * LandingView.onStartOnboarding) to the finale PLAY, which lives outside that
 * React subtree: page.tsx renders it last, inside HomepageContentSection, so
 * the closing PLAY is the page's actual ending (fresh.shell.ending.test).
 *
 * LandingView writes; the finale reads. Server render and hydration read
 * `undefined` (getServerSnapshot), so the PLAY is a plain `<a href>` until
 * LandingView's effect runs; only the click handler changes after that, never
 * the markup, so there is nothing to shift and nothing to mismatch.
 */
type Play = (() => void) | undefined;

let current: Play;
const listeners = new Set<() => void>();

export function setFreshPlay(play: Play): void {
  if (current === play) return;
  current = play;
  listeners.forEach((notify) => notify());
}

export function getFreshPlay(): Play {
  return current;
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const getServerSnapshot = (): Play => undefined;

/** The registered play action, or undefined (server, no JS, returning visitor). */
export function useFreshPlay(): Play {
  return useSyncExternalStore(subscribe, getFreshPlay, getServerSnapshot);
}
