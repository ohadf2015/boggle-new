import { useLayoutEffect, useRef, useState } from 'react';

export const HOW_TO_SEEN_KEY = 'lc:wheel-howto-seen';

// The ready card can remount while the page settles (late locale bundle); keep it open for this visit.
let shownThisVisit = false;

/**
 * Opens the hands-on how-to once for a first-time player. The flag is written when it is
 * SHOWN, so a reload before finishing it does not pop it again.
 */
export function useWheelHowTo(autoShow: boolean) {
  const [open, setOpen] = useState(false);
  const decidedRef = useRef(false);

  useLayoutEffect(() => {
    if (!autoShow || decidedRef.current) return;
    decidedRef.current = true;
    if (shownThisVisit) { setOpen(true); return; }
    let seen = false;
    try { seen = localStorage.getItem(HOW_TO_SEEN_KEY) === '1'; } catch { /* storage off */ }
    if (seen) return;
    shownThisVisit = true;
    setOpen(true);
    try { localStorage.setItem(HOW_TO_SEEN_KEY, '1'); } catch { /* storage off */ }
  }, [autoShow]);

  return { open, show: () => setOpen(true) };
}
