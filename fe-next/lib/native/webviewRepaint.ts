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

/**
 * Delay (ms) after which the timer fallback force-restores the transform if rAF
 * hasn't already. translateZ(0) is visually invisible (a layer hint, no
 * movement), so a brief stuck window is imperceptible — this only needs to be
 * short enough to un-stick the layout well before it's noticed.
 */
const RESTORE_FALLBACK_MS = 100;

/**
 * Schedule the restore. We arm BOTH rAF and a timer, and the restore runs
 * whichever fires first (idempotent).
 *
 * WHY the timer fallback: when a native ad SurfaceView (banner / interstitial /
 * rewarded) composites over the WebView, the WebView's requestAnimationFrame can
 * be throttled or DROPPED. An rAF-only restore then never fires, leaving
 * translateZ(0) permanently on <html>. A stuck transform makes <html> the
 * containing block for every `position: fixed` element — the side-menu drawer
 * (fixed top-0 bottom-0) sizes to DOCUMENT height instead of the viewport, so
 * its overflow-y-auto content never overflows and the menu can't scroll (same
 * failure class as the bottom-nav reparenting). A setTimeout fires even while
 * rAF is paused, so the transform is always restored.
 */
function defaultSchedule(cb: () => void): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(run);
  }
  if (typeof setTimeout === 'function') {
    setTimeout(run, RESTORE_FALLBACK_MS);
  } else if (typeof requestAnimationFrame !== 'function') {
    // No scheduler at all — restore synchronously so we never leave it stuck.
    run();
  }
}

const KICK_TRANSFORM = 'translateZ(0)';

/**
 * Remembers the *true* pre-kick transform of an element while a kick is in
 * flight. WHY: two kicks can overlap (e.g. an interstitial teardown and a
 * hideBanner both fire on exiting MP results). Without this, the 2nd kick reads
 * the 1st kick's own `translateZ(0)` as "previous" and its restore re-applies it
 * — leaving `<html>` permanently transformed, which reparents every
 * `position: fixed` element (the bottom nav) so it scrolls away instead of
 * sticking. Keying on the element preserves any genuine prior transform.
 */
const pendingOriginal = new WeakMap<object, string>();

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
  // If a kick is already in flight, the real original is the one we stashed —
  // NOT the translateZ(0) a prior kick applied and hasn't restored yet.
  const original = pendingOriginal.has(el)
    ? (pendingOriginal.get(el) as string)
    : el.style.transform;
  pendingOriginal.set(el, original);

  el.style.transform = KICK_TRANSFORM;
  // Force a synchronous reflow so the layer promotion is flushed before restore.
  void el.offsetHeight;

  schedule(() => {
    el.style.transform = original;
    pendingOriginal.delete(el);
  });

  return true;
}

export default kickWebViewRepaint;
