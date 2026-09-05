/**
 * Teacher pause — the client's single source of truth for "the round is frozen".
 *
 * Written ONLY by the socket layer (`gamePaused` / `gameResumed` / every
 * `startGame` payload). Read by the paused overlay AND by every local countdown
 * ticker (PlayerView, MultiplayerInGameView) plus the timer-stall watchdogs.
 * One store, not a prop threaded through three view trees, so the overlay and
 * the frozen clock can never disagree and a paused round is never mistaken for
 * a stalled one that needs `requestGameState` recovery.
 *
 * Module-level (not React context) so it survives view remounts and needs no
 * provider — MP views are lazy-loaded islands under PageClient.
 */
import { useSyncExternalStore } from 'react';

let paused = false;
const listeners = new Set<() => void>();

export function getTeacherPaused(): boolean {
  return paused;
}

export function setTeacherPaused(next: boolean): void {
  if (paused === next) return;
  paused = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getServerSnapshot = (): boolean => false;

export function useTeacherPaused(): boolean {
  return useSyncExternalStore(subscribe, getTeacherPaused, getServerSnapshot);
}
