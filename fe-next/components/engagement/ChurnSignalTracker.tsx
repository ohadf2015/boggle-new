'use client';

import { useChurnSignals } from '@/hooks/useChurnSignals';

/**
 * Invisible component that tracks session engagement signals.
 * Mount once in the root layout — no UI rendered.
 */
export function ChurnSignalTracker() {
  useChurnSignals();
  return null;
}
