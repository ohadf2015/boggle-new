import { useCallback, useSyncExternalStore } from 'react';
import type { ResultsXp } from './NextUnlockTeaser';

/** For results screens whose XP response lands in a hook far from the screen (dailies). */
const byKey = new Map<string, ResultsXp | null>();
const listeners = new Set<() => void>();

export function publishResultsXp(key: string, xp: ResultsXp | null): void {
  byKey.set(key, xp);
  listeners.forEach((l) => l());
}

export function resetResultsXp(): void {
  byKey.clear();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useResultsXp(key: string): ResultsXp | null {
  const get = useCallback(() => byKey.get(key) ?? null, [key]);
  return useSyncExternalStore(subscribe, get, () => null);
}
