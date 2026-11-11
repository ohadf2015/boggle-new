import { useSyncExternalStore } from 'react';

export interface HostCreateRefusal {
  code: string;
  reason: string;
}

let current: HostCreateRefusal | null = null;
const listeners = new Set<() => void>();

function publish(next: HostCreateRefusal | null): void {
  if (current === next) return;
  current = next;
  listeners.forEach((fn) => fn());
}

export const getHostCreateRefusal = (): HostCreateRefusal | null => current;
export const setHostCreateRefusal = (refusal: HostCreateRefusal): void => publish(refusal);
export const clearHostCreateRefusal = (): void => publish(null);

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The last classroom-host create the server refused (or that never had a signed-in teacher to send). */
export function useHostCreateRefusal(): HostCreateRefusal | null {
  return useSyncExternalStore(subscribe, getHostCreateRefusal, () => null);
}
