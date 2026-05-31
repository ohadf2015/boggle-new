'use client';

import { useEffect } from 'react';
import { useAnimationControls } from 'framer-motion';
import { useNewErrorSignal } from './useNewErrorSignal';

/**
 * Brand "neo-shake" played on a form field when validation fails. Mirrors the
 * decaying horizontal wobble used by rejected-word toasts (NeoToast) so error
 * feedback feels consistent across the app.
 */
const SHAKE = {
  x: [0, -6, 6, -5, 5, -3, 3, 0],
  transition: { duration: 0.4, ease: 'easeInOut' as const },
};

/**
 * Returns framer-motion controls that play a shake whenever `error` becomes a
 * NEW message. Spread onto an `m.div` wrapping the input: `<m.div animate={controls}>`.
 *
 * Detection is delegated to {@link useNewErrorSignal} (mount-with-error and
 * error-clear are silent). Reduced-motion is enforced globally by
 * MotionConfigProvider (`reducedMotion="always"` disables transforms), so this
 * hook needs no extra media-query gate.
 */
export function useErrorShake(error: string | null | undefined) {
  const signal = useNewErrorSignal(error);
  const controls = useAnimationControls();

  useEffect(() => {
    if (signal > 0) {
      void controls.start(SHAKE);
    }
  }, [signal, controls]);

  return controls;
}
