/**
 * PSI-safe "the visitor actually did something" gate.
 *
 * Lighthouse mobile scrolls and lets timers fire inside the trace (TTI is
 * often 10–40s on this route). Scroll, pointermove, and any timeout therefore
 * still count as main-thread work. pointerdown / keydown / touchstart do not
 * fire during a PSI performance run.
 *
 * A session flag records engagement so an in-app navigation (the click that
 * opened /singleplayer already happened on the previous page) still auto-starts.
 * A cold PSI profile has neither the flag nor a pointer event.
 */

export const FIRST_ENGAGEMENT_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export const ENGAGED_SESSION_KEY = 'lc_engaged';

export function hasPriorEngagement(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ENGAGED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markEngaged(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ENGAGED_SESSION_KEY, '1');
  } catch {
    // Private mode — the live listener still opens the gate this page.
  }
}

/**
 * Run `fn` once on the first real key/pointer. No scroll, no timer.
 * Returns a cancel function for effect cleanup.
 */
export function onFirstEngagement(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let done = false;
  const opts = { capture: true, passive: true } as const;

  const fire = () => {
    if (done) return;
    done = true;
    for (const type of FIRST_ENGAGEMENT_EVENTS) {
      window.removeEventListener(type, fire, opts);
    }
    markEngaged();
    fn();
  };

  for (const type of FIRST_ENGAGEMENT_EVENTS) {
    window.addEventListener(type, fire, opts);
  }

  return () => {
    done = true;
    for (const type of FIRST_ENGAGEMENT_EVENTS) {
      window.removeEventListener(type, fire, opts);
    }
  };
}
