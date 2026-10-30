'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 720px)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener?.('change', onChange);
  return () => mql.removeEventListener?.('change', onChange);
}

const getSnapshot = () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;
const getServerSnapshot = () => false;

/** Lobby desktop/tablet breakpoint; read synchronously so only one layout ever mounts. */
export function useLobbyWide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
