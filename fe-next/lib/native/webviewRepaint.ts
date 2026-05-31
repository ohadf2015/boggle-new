'use client';

/**
 * Force the Android WebView to repaint after a fullscreen native ad Activity
 * tears down.
 *
 * WHY: AdMob interstitials & rewarded videos are NATIVE Android Activities
 * composited *over* the Capacitor WebView. When that Activity finishes, the
 * WebView occasionally fails to re-acquire and repaint its GPU surface, leaving
 * a blank WHITE frame (the cleared surface) on top of the still-mounted React
 * tree. No DOM mutation and no JS error occur, so it never reaches Sentry, and
 * it only happens on native — matching the "exit MP results → white screen in
 * the app" report. The existing brand washes only *cover* the gap; they don't
 * make the surface repaint.
 *
 * FIX: briefly promote `<html>` to its own composite layer (`translateZ(0)`),
 * force a synchronous reflow, then restore on the next frame. The promote +
 * reflow makes the WebView invalidate and redraw the compositor surface.
 *
 * Dependency-injectable (`doc`, `schedule`) so the DOM logic is unit-testable
 * without a real browser or requestAnimationFrame.
 */

export interface RepaintOptions {
  /** Document to operate on. Defaults to the global `document`. */
  doc?: Document | null;
  /** Schedules the restore callback. Defaults to rAF (setTimeout fallback). */
  schedule?: (cb: () => void) => void;
}

function defaultSchedule(cb: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(cb);
  } else {
    setTimeout(cb, 0);
  }
}

/**
 * Kick the WebView into repainting. Returns true if the kick was applied,
 * false if there was no document to operate on (SSR / non-DOM environments).
 */
export function kickWebViewRepaint(opts: RepaintOptions = {}): boolean {
  const doc =
    opts.doc !== undefined
      ? opts.doc
      : typeof document !== 'undefined'
        ? document
        : null;
  const el = doc?.documentElement;
  if (!el) return false;

  const schedule = opts.schedule ?? defaultSchedule;
  const prev = el.style.transform;

  el.style.transform = 'translateZ(0)';
  // Force a synchronous reflow so the layer promotion is flushed before restore.
  void el.offsetHeight;

  schedule(() => {
    el.style.transform = prev;
  });

  return true;
}

export default kickWebViewRepaint;
