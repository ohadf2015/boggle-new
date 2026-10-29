/**
 * First-gesture loaders (gtag, feedback widget, pixi, LogRocket) listen for
 * touchstart/pointerdown, which also start every swipe, so their script
 * evaluation landed mid-scroll and the page felt stuck. Run them once scrolling
 * has been quiet for a moment, bounded so they still load for endless scrollers.
 * One loader per quiet window: released together they stacked ~1s of evaluation
 * right where the next swipe starts.
 */
export const SCROLL_QUIET_MS = 400;
export const SCROLL_SETTLE_MAX_MS = 8000;

let lastScrollAt = -Infinity;
let lastReleaseAt = -Infinity;
let tracking = false;

/** Fake clocks restart per test, so a release from the previous test would read as recent. */
export function resetScrollSettlesForTests(): void {
  lastScrollAt = -Infinity;
  lastReleaseAt = -Infinity;
}

function trackScroll(): void {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;
  window.addEventListener('scroll', () => { lastScrollAt = Date.now(); }, { capture: true, passive: true });
}

export function runWhenScrollSettles(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  trackScroll();
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    cancelled = true;
    fn();
  };
  const check = () => {
    const now = Date.now();
    const sinceRelease = now - lastReleaseAt;
    if (sinceRelease < SCROLL_QUIET_MS) {
      timer = setTimeout(check, SCROLL_QUIET_MS - sinceRelease);
      return;
    }
    const quietFor = now - lastScrollAt;
    if (quietFor >= SCROLL_QUIET_MS || now - start >= SCROLL_SETTLE_MAX_MS) {
      lastReleaseAt = now;
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(run, { timeout: 1000 });
      else run();
      return;
    }
    timer = setTimeout(check, SCROLL_QUIET_MS - quietFor);
  };
  timer = setTimeout(check, SCROLL_QUIET_MS);

  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback?.(idle);
  };
}
