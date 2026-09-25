'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * true while this render is the server render or the hydration pass that adopts it.
 * Framer serialises `initial` into server HTML, and that HTML is what a student
 * stares at until hydration lands — so an entrance offset must never be part of it.
 * Client-only mounts (a client navigation, a remount) get false and may animate.
 */
export function useIsHydrating(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true,
  );
}
