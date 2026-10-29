import { useSyncExternalStore } from 'react';

export interface LiveWordStore {
  get: () => string;
  set: (word: string) => void;
  subscribe: (listener: () => void) => () => void;
}

/** The word under the finger. Readers subscribe here so a drag never re-renders the whole game screen. */
export function createLiveWord(): LiveWordStore {
  let word = '';
  const listeners = new Set<() => void>();
  return {
    get: () => word,
    set: (next) => {
      if (next === word) return;
      word = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const noop = () => () => {};
const empty = () => '';

export function useLiveWord<T>(store: LiveWordStore | undefined, select: (word: string) => T): T {
  return useSyncExternalStore(
    store?.subscribe ?? noop,
    () => select(store ? store.get() : empty()),
    () => select(''),
  );
}
