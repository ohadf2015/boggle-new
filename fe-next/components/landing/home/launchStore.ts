import { useSyncExternalStore } from 'react';
import type { LaunchTone } from './HomeLaunch';

/** A launch whose navigation never leaves the page is dropped after this. */
export const DEAD_NAV_MS = 15000;
/** Longest the curtain stays over the next route while that route still shows its loader. */
export const ARRIVAL_CAP_MS = 10000;

export interface LaunchCover {
  id: string;
  tone: LaunchTone;
  title?: string;
  art?: string;
  origin?: { x: number; y: number } | null;
  testId?: string;
  /** The raiser drops it while still on its own page (no dead-navigation timeout). */
  sticky?: boolean;
  /** location.pathname when raised; set by raiseLaunch. */
  from?: string;
}

let cover: LaunchCover | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function raiseLaunch(next: LaunchCover): void {
  cover = { ...next, from: typeof window === 'undefined' ? '' : window.location.pathname };
  emit();
}

/** With an id, drops only that launch, so a page never clears someone else's curtain. */
export function dropLaunch(id?: string): void {
  if (!cover || (id && cover.id !== id)) return;
  cover = null;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useLaunchCover(): LaunchCover | null {
  return useSyncExternalStore(
    subscribe,
    () => cover,
    () => null,
  );
}
