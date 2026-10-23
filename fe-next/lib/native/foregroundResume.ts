/**
 * Resume work that dies when a native fullscreen overlay (AdMob rewarded
 * Activity) hides the Capacitor WebView.
 *
 * Chrome/Android drops pending requestAnimationFrame callbacks while the
 * document is hidden instead of deferring them — so a rAF game loop that was
 * running when the ad opened never schedules its next frame after dismiss.
 * Pixi's ticker similarly stays stopped. Pointer capture taken before the
 * overlay is never released because pointerup never reaches the WebView.
 *
 * Production: player a07bbd2c, 2026-09-17 — two `hint` rewarded ads on
 * /en/daily/word-tower completed cleanly (`rewarded` + `ad_closed` terminal
 * clean + `show_resolved`), then zero further game events until they killed
 * the app (~70s) and reported "its stuck and have to restart."
 */

export function subscribeForegroundResume(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    cb();
  };

  document.addEventListener('visibilitychange', onVisible);
  // Capacitor's bridge fires a Cordova-style `resume` on the document when the
  // Activity returns — the one signal that still arrives when an ad Activity
  // covered the WebView without ever flipping visibilityState.
  document.addEventListener('resume', onVisible);
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('focus', onVisible);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('resume', onVisible);
    window.removeEventListener('pageshow', onVisible);
    window.removeEventListener('focus', onVisible);
  };
}

/** Drop pointer captures that survived a WebView pause (no pointerup). */
export function releaseStuckPointers(el: HTMLElement | null, ids: Iterable<number>): void {
  if (!el) return;
  for (const id of ids) {
    try {
      el.releasePointerCapture(id);
    } catch {
      /* never claimed, or already released */
    }
  }
}

/** How long a visible page may go without a frame before the loop is presumed dead. */
export const RAF_STALL_MS = 1500;
const RAF_WATCHDOG_INTERVAL_MS = 1000;

/**
 * Keep a self-rescheduling requestAnimationFrame game loop alive across a
 * WebView pause (rewarded / interstitial ad Activity, app switch, lock screen).
 *
 * The 2026-09-17 Word Tower freeze: the Android WebView DROPS the pending rAF
 * while hidden, so a loop of the form `tick = () => { raf = rAF(tick); ... }`
 * never runs again after the ad closes and the game looks frozen until the
 * player force-quits. The fix used to live inside each scene; this is the
 * shared version every loop should use.
 *
 * Call `beat()` at the top of every frame. `restart()` must be idempotent —
 * cancel the in-flight frame and schedule a fresh one (and reset any `lastTs`
 * so the first frame back does not see a huge dt). It runs:
 *  - on every foreground signal (visibility / pageshow / focus / Capacitor resume), and
 *  - from a 1s watchdog whenever the page is visible but no frame has run for
 *    RAF_STALL_MS — the backstop for a resume signal the WebView never sent.
 *
 * Returns the stop function for the effect cleanup.
 */
export function keepRafLoopAlive(restart: () => void): { beat: () => void; stop: () => void } {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let lastFrame = now();
  let stopped = false;
  const safeRestart = () => {
    if (stopped) return;
    lastFrame = now();
    try { restart(); } catch { /* scene torn down mid-restart */ }
  };
  const stopResume = subscribeForegroundResume(safeRestart);
  const watchdog = typeof window === 'undefined'
    ? null
    : window.setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          // Hidden pages legitimately get no frames; don't count the gap.
          lastFrame = now();
          return;
        }
        if (now() - lastFrame > RAF_STALL_MS) safeRestart();
      }, RAF_WATCHDOG_INTERVAL_MS);
  return {
    beat: () => { lastFrame = now(); },
    stop: () => {
      stopped = true;
      stopResume();
      if (watchdog !== null) window.clearInterval(watchdog);
    },
  };
}

/**
 * Re-arm a RUNNING Pixi ticker after a WebView pause.
 *
 * Pixi's Ticker holds the id of its pending rAF; when the WebView drops that
 * frame the ticker still reports `started` and never requests another, so
 * `start()` alone is a no-op. stop()+start() cancels the dead id and requests a
 * fresh frame. A ticker the scene stopped on purpose (autoStart:false loops that
 * render from their own rAF) is left alone.
 */
export function restartPixiTicker(app: { ticker?: { started?: boolean; start: () => void; stop: () => void } } | null | undefined): void {
  try {
    const t = app?.ticker;
    if (!t || t.started !== true) return;
    t.stop();
    t.start();
  } catch { /* ticker destroyed */ }
}
