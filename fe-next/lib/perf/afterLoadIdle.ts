/**
 * Defer non-critical work until the window load event has fired, plus a short
 * quiet beat afterwards. Work that fires during the initial load window
 * (auto-game API calls, reachability probes, analytics pings) competes with
 * LCP content for throttled bandwidth and lands inside the Lighthouse trace,
 * where Lantern models it as delaying the LCP image. Waiting for load + a
 * bounded delay keeps it out of both the real first-paint window and the PSI
 * load window without changing any user-visible behavior.
 *
 * Returns a cancel function (call it from the effect cleanup).
 */
export const AFTER_LOAD_IDLE_DELAY_MS = 1500;

export function afterLoadIdle(
  fn: () => void,
  delayMs: number = AFTER_LOAD_IDLE_DELAY_MS,
): () => void {
  if (typeof window === 'undefined') return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const schedule = () => {
    if (cancelled) return;
    timer = setTimeout(() => {
      if (!cancelled) fn();
    }, delayMs);
  };

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    if (timer !== undefined) clearTimeout(timer);
  };
}
