import { useCallback, useRef } from 'react';

/**
 * Holds a finished result on the board for a beat, then delivers it once.
 * The timer is deliberately not cancelled on unmount: a finished run must always be reported.
 */
export function useFinishHold<T>(deliver: (result: T) => void) {
  const pending = useRef<{ result: T; id: ReturnType<typeof setTimeout> } | null>(null);
  const deliverRef = useRef(deliver);
  deliverRef.current = deliver;

  const skip = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    clearTimeout(p.id);
    deliverRef.current(p.result);
  }, []);

  const hold = useCallback((result: T, ms: number) => {
    pending.current = { result, id: setTimeout(skip, ms) };
  }, [skip]);

  return { hold, skip };
}
