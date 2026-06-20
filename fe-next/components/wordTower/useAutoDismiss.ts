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
export function useAutoDismiss(token: unknown, clear: () => void, ms: number): void {
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    if (token == null) return;
    let done = false;
    let raf = 0;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const start = now();
    const fire = () => {
      if (done) return;
      done = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearRef.current();
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
    return () => { done = true; clearTimeout(timer); if (raf) cancelAnimationFrame(raf); };
  }, [token, ms]);
}
