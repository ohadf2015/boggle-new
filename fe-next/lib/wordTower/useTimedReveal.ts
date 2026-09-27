import { useEffect, useRef, useState } from 'react';
import { useAutoDismiss } from '@/components/wordTower/useAutoDismiss';

/**
 * Reveal-on-event gate. Returns `true` for `ms` after `triggerKey` increments,
 * then flips back to `false`. A `triggerKey` of 0 means "nothing has fired yet"
 * (stays hidden on mount). A fresh bump restarts the window.
 *
 * Used to surface the Word Tower mascot only when the player completes a word
 * (founder: the mascot was huge and always on-screen) — it pops in, celebrates,
 * and tucks away again.
 *
 * Dismiss is delegated to {@link useAutoDismiss} (rAF watchdog + visibilitychange
 * recovery) instead of a bare `setTimeout` — this hook used to strand the mascot
 * on screen the same way the pre-fix toasts did (see useAutoDismiss's docstring).
 */
export function useTimedReveal(triggerKey: number, ms: number): boolean {
  const [revealed, setRevealed] = useState(false);
  const prevKey = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey === 0 || triggerKey === prevKey.current) return; // no new event
    prevKey.current = triggerKey;
    setRevealed(true);
  }, [triggerKey]);

  useAutoDismiss(revealed ? triggerKey : null, () => setRevealed(false), ms);

  return revealed;
}
