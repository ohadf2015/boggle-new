import { useEffect, useRef, useState } from 'react';

/**
 * Returns an incrementing signal each time `error` changes to a NEW non-empty
 * value. The signal stays constant when the error is cleared, repeated, or the
 * component merely re-renders — and it never fires on a mount that already has
 * an error (avoids shaking a field that re-opens with a stale message).
 *
 * Use the returned number to re-arm a feedback animation (e.g. a shake) via a
 * framer-motion `useAnimationControls().start(...)` in an effect keyed on it.
 * Reduced-motion is handled downstream by the global MotionConfigProvider, so
 * this hook stays purely about *detecting* a fresh error.
 *
 * @example
 * const shakeSignal = useNewErrorSignal(emailError);
 * useEffect(() => { if (shakeSignal) controls.start(SHAKE); }, [shakeSignal]);
 */
export function useNewErrorSignal(error: string | null | undefined): number {
  const [signal, setSignal] = useState(0);
  // Seed with the initial error so a field that mounts already-errored is silent.
  const previous = useRef<string>(error || '');

  useEffect(() => {
    const current = error || '';
    if (current && current !== previous.current) {
      setSignal((s) => s + 1);
    }
    previous.current = current;
  }, [error]);

  return signal;
}
