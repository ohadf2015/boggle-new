'use client';

import { useEffect, useRef } from 'react';

/**
 * Auto-dismiss a transient toast/banner after `ms`, robustly.
 *
 * The footgun this fixes: the obvious inline pattern detects an event AND
 * schedules the dismiss in ONE effect keyed on a fast-changing value (e.g.
 * `game.heightM`). On the next tick React runs that effect's cleanup —
 * `clearTimeout`, cancelling the pending dismiss — then re-runs the body, which
 * early-returns because no NEW event fired, so it never reschedules. The toast
 * freezes on screen until the next event of the same kind. (WordTowerRivalRail
 * documents the same trap.)
 *
 * The fix is a SEPARATE effect keyed only on the toast value: it schedules the
 * dismiss when the value goes truthy and is cancelled only when the value
 * itself changes — never by unrelated re-renders. `clear` is read through a ref
 * so a fresh callback identity each render can't reset the timer.
 *
 * @param token  the active toast value (null/undefined ⇒ nothing showing). A
 *               NEW reference/value reschedules; the SAME value does not.
 * @param clear  called once when the dismiss fires (e.g. `() => setToast(null)`).
 * @param ms     lifespan in milliseconds.
 */
/** Bounded self-heal for a dismiss callback that THROWS (see `fire`). */
const DISMISS_RETRIES = 8;
const DISMISS_RETRY_MS = 150;

export function useAutoDismiss(token: unknown, clear: () => void, ms: number): void {
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    if (token == null) return;
    let done = false;
    let raf = 0;
    let attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const start = now();
    const fire = () => {
      if (done) return;
      try {
        // Latch `done` ONLY after the purge actually lands. The old code set it
        // BEFORE calling clear(), so a callback that threw (a transient render
        // error during the dismiss — the "animation callback fails to fire" case)
        // escaped uncaught in the timer and stranded the toast on screen forever,
        // with the next compliments piling on top of it (founder screenshot).
        clearRef.current();
        done = true;
        if (raf) cancelAnimationFrame(raf);
        clearTimeout(timer);
        if (retry) clearTimeout(retry);
      } catch (err) {
        // Never a silent no-op on an error path (repo pitfall Class 4): report it,
        // then retry the purge on a bounded schedule so a phantom banner can never
        // survive a one-off throw. If it keeps failing we stop after a few tries
        // rather than hammer the main thread — the effect's own teardown still
        // clears it the moment the token next changes.
        // eslint-disable-next-line no-console
        console.error('[useAutoDismiss] dismiss callback threw; retrying purge', err);
        if (retry) clearTimeout(retry);
        if (attempts++ < DISMISS_RETRIES) retry = setTimeout(fire, DISMISS_RETRY_MS);
        else done = true;
      }
    };
    // Primary path: a plain setTimeout.
    const timer = setTimeout(fire, ms);
    // Watchdog: on a busy mobile webview the Pixi render loop can STARVE
    // setTimeout, leaving a celebration toast "stuck" on screen (founder report
    // 2026-06-20: "messages stay stuck — the plus-height + encouragement"). rAF
    // is pumped every animation frame while the page is visible, so this fires
    // the dismiss on time even when the timer lags. Whichever wins is idempotent.
    if (typeof requestAnimationFrame !== 'undefined') {
      const tick = () => {
        if (done) return;
        if (now() - start >= ms) { fire(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    // Backgrounding the app (app-switch / screen-lock) PAUSES both setTimeout and
    // rAF, so a banner shown right before the switch can still be on screen on
    // return — the founder's "notifications stay stuck" report, repro'd by
    // photographing the game after coming back to it. The moment we're visible
    // again, fire if the lifespan already elapsed while hidden.
    const onVisible = () => { if (document.visibilityState === 'visible' && now() - start >= ms) fire(); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      done = true;
      clearTimeout(timer);
      if (retry) clearTimeout(retry);
      if (raf) cancelAnimationFrame(raf);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, ms]);
}
