import { useCallback, useSyncExternalStore } from 'react';

export type FirstPlayedMode =
  | 'wordWheel'
  | 'wordHunt'
  | 'boggle'
  | 'connections'
  | 'blast'
  | 'wheelRushMp';

export const FIRST_PLAYED_LS_KEY = 'lc_first_played_modes_v1';

type FlagMap = Partial<Record<FirstPlayedMode, boolean>>;

// In-memory mirror so React subscribers re-render across instances without
// relying on the storage event (which doesn't fire in the same tab).
let cache: FlagMap | null = null;
const subscribers = new Set<() => void>();

function readStorage(): FlagMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FIRST_PLAYED_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as FlagMap;
    }
  } catch {
    // malformed JSON or storage disabled — treat as empty
  }
  return {};
}

function writeStorage(next: FlagMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_PLAYED_LS_KEY, JSON.stringify(next));
  } catch {
    // quota or disabled — silently drop
  }
}

function getCache(): FlagMap {
  if (cache === null) cache = readStorage();
  return cache;
}

function notifyAll(): void {
  subscribers.forEach((fn) => fn());
}

export function hasPlayedMode(mode: FirstPlayedMode): boolean {
  return getCache()[mode] === true;
}

export function markPlayedMode(mode: FirstPlayedMode): void {
  const current = getCache();
  if (current[mode]) return;
  const next: FlagMap = { ...current, [mode]: true };
  cache = next;
  writeStorage(next);
  notifyAll();
}

export function resetAllFirstPlayedFlags(): void {
  // Drop the in-memory cache so the next read pulls fresh from localStorage.
  // Keeps tests honest about what's actually persisted vs. cached.
  cache = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(FIRST_PLAYED_LS_KEY);
    } catch {
      // noop
    }
  }
  notifyAll();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export interface FirstPlayedFlagAPI {
  hasPlayed: boolean;
  shouldShowTutorial: boolean;
  markPlayed: () => void;
}

export function useFirstPlayedFlag(mode: FirstPlayedMode): FirstPlayedFlagAPI {
  const hasPlayed = useSyncExternalStore(
    subscribe,
    () => hasPlayedMode(mode),
    () => false
  );

  const markPlayed = useCallback(() => markPlayedMode(mode), [mode]);

  return {
    hasPlayed,
    shouldShowTutorial: !hasPlayed,
    markPlayed,
  };
}
