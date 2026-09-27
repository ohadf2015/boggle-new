'use client';

import { useCallback, useRef } from 'react';

/**
 * useSubmitGuard — ref-based one-shot guard against double-submit races.
 *
 * Party handlers fire `onSendInput` then `setState`. React state updates are
 * async, so two fast taps both read the same stale "not yet submitted" state
 * and emit duplicate actions to the backend. A ref flips synchronously, so the
 * second tap in the same tick is blocked before any re-render happens.
 *
 * Usage:
 *   const submit = useSubmitGuard();
 *   const onClick = () => submit.run(() => onSendInput(...));
 *   // re-arm when a new round/phase begins:
 *   useEffect(() => submit.reset(), [round]);
 */
export function useSubmitGuard() {
  const lockedRef = useRef(false);

  const run = useCallback(<T>(fn: () => T): T | undefined => {
    if (lockedRef.current) return undefined;
    lockedRef.current = true;
    return fn();
  }, []);

  const reset = useCallback(() => {
    lockedRef.current = false;
  }, []);

  const isLocked = useCallback(() => lockedRef.current, []);

  return { run, reset, isLocked };
}
