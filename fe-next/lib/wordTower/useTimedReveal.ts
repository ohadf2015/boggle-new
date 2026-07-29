import { useEffect, useRef, useState } from 'react';

/**
 * Reveal-on-event gate. Returns `true` for `ms` after `triggerKey` increments,
 * then flips back to `false`. A `triggerKey` of 0 means "nothing has fired yet"
 * (stays hidden on mount). A fresh bump restarts the window.
 *
 * Used to surface the Word Tower mascot only when the player completes a word
 * (founder: the mascot was huge and always on-screen) — it pops in, celebrates,
 * and tucks away again.
 */
export function useTimedReveal(triggerKey: number, ms: number): boolean {
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (triggerKey === 0) return; // initial mount — no event yet
    setRevealed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRevealed(false), ms);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [triggerKey, ms]);

  return revealed;
}
