'use client';

import { useSyncExternalStore } from 'react';

// Why: the global signup nudge fires ~3s after any result and sheets over the
// quick-play results hero. This flag lets that screen hold it back.
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

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useQuickResultsOnScreen(): boolean {
  return useSyncExternalStore(subscribe, isQuickResultsOnScreen, () => false);
}
