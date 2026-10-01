'use client';

import { useSyncExternalStore } from 'react';
import { useReducedEffects } from '@/hooks/useReducedEffects';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

// No matchMedia (SSR, jsdom) reads as reduced: numbers snap to their value.
const snapshot = () => (typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia(QUERY).matches);

/** Reduced motion without framer-motion: OS preference OR the in-app effects switch. */
export function useCalmMotion(): boolean {
  const os = useSyncExternalStore(subscribe, snapshot, () => true);
  const [app] = useReducedEffects();
  return os || app;
}

export default useCalmMotion;
