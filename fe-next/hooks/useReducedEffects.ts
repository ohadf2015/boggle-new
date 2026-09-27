'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * useReducedEffects — opt-out switch for the daily challenge's heavy visual
 * effects (particle bursts, screen flashes, confetti).
 *
 * Effects stay ON by default; players who find them overwhelming can switch
 * them off in-game and the choice is remembered. Backed by a tiny module-level
 * store so the in-game toggle and the gameplay surface that reads the flag stay
 * in sync without prop-drilling or a context provider, and synced across tabs.
 */

const STORAGE_KEY = 'boggle_reduce_effects';

const listeners = new Set<() => void>();
let cached: boolean | null = null;
let storageBound = false;

function readFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getSnapshot(): boolean {
  if (cached === null) cached = readFromStorage();
  return cached;
}

function getServerSnapshot(): boolean {
  return false;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Imperatively set the reduced-effects preference (used by the toggle). */
export function setReducedEffects(value: boolean): void {
  cached = value;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // Storage disabled/full — keep the in-memory value so the UI stays live.
    }
  }
  emit();
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  cached = event.newValue === 'true';
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageBound && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
    storageBound = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storageBound && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      storageBound = false;
    }
  };
}

/**
 * @returns `[reduced, toggle]` — `reduced` is true when heavy effects should be
 * suppressed; `toggle` flips the preference and persists it.
 */
export function useReducedEffects(): [boolean, () => void] {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    setReducedEffects(!getSnapshot());
  }, []);
  return [reduced, toggle];
}
