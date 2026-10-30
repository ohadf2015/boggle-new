'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Milliseconds of active play: starts at `initialMs`, stops while `paused`. */
export function useActiveTime(initialMs: number, paused: boolean): () => number {
  const accumulated = useRef(initialMs);
  const since = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      if (since.current != null) accumulated.current += Date.now() - since.current;
      since.current = null;
    } else if (since.current == null) {
      since.current = Date.now();
    }
  }, [paused]);

  return useCallback(() => accumulated.current + (since.current != null ? Date.now() - since.current : 0), []);
}
