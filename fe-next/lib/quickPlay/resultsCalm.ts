'use client';

import { useSyncExternalStore } from 'react';

// Why: the global signup nudge fires seconds after any result; held until the
// quick-play celebration has played so it never sheets over the reveal.
let onScreen = false;
const listeners = new Set<() => void>();

export function setQuickResultsOnScreen(next: boolean): void {
  if (onScreen === next) return;
  onScreen = next;
  listeners.forEach((l) => l());
}

export function isQuickResultsOnScreen(): boolean {
  return onScreen;
}

export function holdQuickResultsCalm(ms: number): () => void {
  setQuickResultsOnScreen(true);
  const timer = setTimeout(() => setQuickResultsOnScreen(false), ms);
  return () => {
    clearTimeout(timer);
    setQuickResultsOnScreen(false);
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useQuickResultsOnScreen(): boolean {
  return useSyncExternalStore(subscribe, isQuickResultsOnScreen, () => false);
}
