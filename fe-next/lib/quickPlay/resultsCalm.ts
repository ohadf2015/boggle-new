'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { claimOverlayQuietZone } from '@/lib/overlayQuietZone';

// Why: the global signup nudge fires seconds after any result; held from the
// buzzer until the quick-play celebration has played so it never sheets over the reveal.
let holders = 0;
/** Ceiling on the buzzer-to-results gap; a submit slower than this lets the nudge through. */
const SUBMIT_BRIDGE_MS = 15_000;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function isQuickResultsOnScreen(): boolean {
  return holders > 0;
}

export function holdQuickResultsCalm(ms: number): () => void {
  holders += 1;
  emit();
  const releaseZone = claimOverlayQuietZone('quick-results');
  let done = false;
  const release = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    holders = Math.max(0, holders - 1);
    emit();
    releaseZone();
  };
  const timer = setTimeout(release, ms);
  return release;
}

export function resetQuickResultsCalmForTests(): void {
  holders = 0;
  emit();
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

/** Start holding at the buzzer; let go once the results screen (which holds on its own) has landed. */
export function useQuickResultsCalmBridge(resultsLanded: boolean): () => void {
  const release = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!resultsLanded) return;
    release.current?.();
    release.current = null;
  }, [resultsLanded]);
  useEffect(() => () => release.current?.(), []);
  return useCallback(() => {
    release.current?.();
    release.current = holdQuickResultsCalm(SUBMIT_BRIDGE_MS);
  }, []);
}
