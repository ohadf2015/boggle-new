/**
 * mascotBus — module-level pub/sub for the Blast HUD mascot.
 *
 * Decorative-only feedback: keeping it on a singleton bus avoids drilling a
 * `fireMascot` callback through BlastView → BlastGame → useBlastWordHandler →
 * useBlastCascade. Subscribers are short-lived (mount during `playing` phase,
 * unmount on phase change) and the mascot has no business logic, so the
 * singleton risk is bounded.
 *
 * Tests reset via `_resetMascotBus()` so subscriptions don't bleed between
 * test cases.
 */
import type { MascotEvent } from './mascotState';

type Listener = (event: MascotEvent) => void;

const listeners = new Set<Listener>();

export function emitMascotEvent(event: MascotEvent): void {
  for (const listener of listeners) listener(event);
}

export function subscribeMascotEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only reset. Do not call from production code. */
export function _resetMascotBus(): void {
  listeners.clear();
}
