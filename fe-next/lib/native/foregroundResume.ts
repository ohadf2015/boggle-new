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
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('focus', onVisible);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
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
