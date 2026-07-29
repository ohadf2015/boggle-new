/**
 * useAdventureTimerStore
 *
 * A lightweight pub/sub store that mirrors the adventure timer's timeRemaining
 * value. The reducer (via TICK) remains the source of truth; this store is kept
 * in sync and used by AdventureTimer via useSyncExternalStore.
 *
 * This isolates per-second re-renders to AdventureTimer only, preventing
 * unnecessary re-renders of sibling components (GameGridArea, GameSidebar, etc.)
 * when the timer changes.
 *
 * Usage:
 *   // In useAdventureGame:
 *   const timerStore = useAdventureTimerStore(initialSeconds);
 *   // Call timerStore.notify(newValue) each time timeRemaining changes.
 *
 *   // In AdventureTimer:
 *   const time = useAdventureTimerValue(timerStore);
 */

import { useRef, useEffect, useSyncExternalStore } from 'react';

// ==============================================
// TYPES
// ==============================================

export interface AdventureTimerStore {
  /** Get current timeRemaining */
  getSnapshot: () => number;
  /** Subscribe to changes — returns unsubscribe fn */
  subscribe: (cb: () => void) => () => void;
  /** Update the stored value and notify subscribers */
  notify: (timeRemaining: number) => void;
  /** Destroy and clear all subscribers */
  destroy: () => void;
}

// ==============================================
// FACTORY
// ==============================================

export function createAdventureTimerStore(initialSeconds: number): AdventureTimerStore {
  let timeRemaining = initialSeconds;
  const subscribers = new Set<() => void>();

  return {
    getSnapshot() {
      return timeRemaining;
    },

    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },

    notify(newValue: number) {
      if (timeRemaining !== newValue) {
        timeRemaining = newValue;
        subscribers.forEach(cb => cb());
      }
    },

    destroy() {
      subscribers.clear();
    },
  };
}

// ==============================================
// HOOKS
// ==============================================

/**
 * Subscribe to the timer store's timeRemaining value.
 * Only the component using this hook re-renders when the timer changes.
 */
export function useAdventureTimerValue(store: AdventureTimerStore): number {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/**
 * Create a stable timer store instance for an adventure game session.
 * The store is created once per mount and destroyed on unmount.
 */
export function useAdventureTimerStore(initialSeconds: number): AdventureTimerStore {
  const storeRef = useRef<AdventureTimerStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAdventureTimerStore(initialSeconds);
  }

  useEffect(() => {
    return () => {
      storeRef.current?.destroy();
    };
  }, []);

  return storeRef.current;
}
