/**
 * runtimeTier — self-correcting device tier based on frames we actually rendered.
 *
 * `useDevicePerformance` classifies devices from static hints (cores, deviceMemory,
 * UA keywords). Those hints misclassify the exact devices we care about:
 *   - a budget MediaTek phone reports 8 cores + 8GB and reads as HIGH-END,
 *   - iOS/Safari never exposes `deviceMemory`, so no iPhone ever trips the memory rule,
 *   - the UA keyword list only matches Android 2–5, which no shipping phone reports.
 *
 * Rather than extend the heuristic treadmill, watch real frame timings and downgrade
 * when the device demonstrably cannot hold the budget. Field data (2026-07-25):
 * Android mobile INP p75 476ms vs iOS 218ms — the static tier was not catching them.
 *
 * The watcher is deliberately cheap and self-terminating: one rAF doing two
 * subtractions per frame, and it stops for good as soon as it reaches a verdict.
 */

/** A frame slower than this misses a 45fps budget. */
export const SLOW_FRAME_MS = 22;

/** How many *consecutive* slow frames count as "this device is struggling".
 *  Consecutive (not cumulative) so a single GC pause or a route transition
 *  cannot condemn a capable device. */
export const CONSECUTIVE_SLOW_FRAMES = 20;

/** Give up watching after this long. A device that held the budget this
 *  entire time is not the low-end case we are correcting for. */
export const MAX_WATCH_MS = 20_000;

let downgraded = false;
let watching = false;
let rafId: number | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getRuntimeDowngrade(): boolean {
  return downgraded;
}

/** Server snapshot — SSR never has frame data, so never downgrade there. */
export function getRuntimeDowngradeServer(): boolean {
  return false;
}

export function subscribeRuntimeTier(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function stopWatching() {
  watching = false;
  if (rafId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(rafId);
  }
  rafId = null;
}

/**
 * Begin watching frame timings. Idempotent — repeat calls are no-ops, so every
 * component using `useDevicePerformance` can call it without spawning loops.
 *
 * Call this AFTER the app has settled (see useDevicePerformance): measuring during
 * hydration would read load jank as a slow device and downgrade capable hardware.
 */
export function startFrameWatch(): void {
  if (watching || downgraded) return;
  if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') return;

  watching = true;
  let lastTs: number | null = null;
  let startTs: number | null = null;
  let slowStreak = 0;

  const tick = (ts: number) => {
    rafId = null;
    if (!watching) return;

    if (startTs === null) startTs = ts;

    // A hidden tab throttles rAF to seconds-long gaps. Those are not slow frames —
    // drop the baseline so the next visible frame starts a fresh delta.
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden) {
      lastTs = null;
      slowStreak = 0;
    } else if (lastTs !== null) {
      const delta = ts - lastTs;
      slowStreak = delta > SLOW_FRAME_MS ? slowStreak + 1 : 0;

      if (slowStreak >= CONSECUTIVE_SLOW_FRAMES) {
        downgraded = true;
        stopWatching();
        notify();
        return;
      }
      lastTs = ts;
    } else {
      lastTs = ts;
    }

    if (ts - startTs >= MAX_WATCH_MS) {
      stopWatching();
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

/** Test-only: clear module state between cases. */
export function resetRuntimeTierForTests(): void {
  downgraded = false;
  watching = false;
  rafId = null;
  listeners.clear();
}
