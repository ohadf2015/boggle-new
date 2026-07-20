'use client';

// ─── Word Wheel PixiJS Decorations ────────────────────────────────────
// Lightweight PixiJS canvas co-located with the wheel div.
// Renders: orbital particle rings, letter connection lines, center pulse.
// Purely decorative — pointer-events: none, transparent background.

import React, { useEffect, useRef } from 'react';
import { Application, Graphics } from 'pixi.js';

interface WordWheelPixiRingProps {
  /** Ordered list of selected wheel indices (-1 = center, 0-7 = outer) */
  selectedIndices: number[];
  /** Outer letter orbit radius in px */
  radius: number;
  /** Current combo level (0 = none) */
  combo: number;
  /** Current pointer screen position during drag — read each frame, no re-renders */
  pointerPosRef?: React.RefObject<{ x: number; y: number } | null>;
  /** Whether a drag gesture is currently active */
  isDraggingRef?: React.RefObject<boolean>;
  /** Number of outer wheel slots the caller lays tiles on (default 6, the daily
   * wheel's hexagon). Sealed Bid's 7-letter wheel must pass 7 — otherwise this
   * ring's connection-line/drag-trail math (which used to hardcode 60° = 360/6)
   * draws at the wrong angle and visually detaches from the actual tiles. */
  outerCount?: number;
  /** When true, disable ambient orbital motion and center pulse for users who
   * prefer reduced motion. Functional feedback (connection lines) still draws. */
  reducedMotion?: boolean;
}

export default function WordWheelPixiRing({
  selectedIndices, radius, combo, pointerPosRef, isDraggingRef, outerCount = 6,
  reducedMotion = false,
}: WordWheelPixiRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ selectedIndices, radius, combo, pointerPosRef, isDraggingRef, outerCount });
  stateRef.current = { selectedIndices, radius, combo, pointerPosRef, isDraggingRef, outerCount };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    let removeRectListeners: (() => void) | null = null;
    let rafId: number | null = null;
    let visibilityPaused = false;
    // Hoisted so the visibilitychange handler (outer scope) can re-schedule the
    // loop; the frame closure itself is created inside setup() once Pixi is ready.
    let frame: ((time: number) => void) | null = null;
    const app = new Application();

    const setup = async () => {
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w === 0 || h === 0) return;

      await app.init({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) { try { app.destroy(true, { children: true }); } catch { /* already destroyed by cleanup */ } return; }
      el.appendChild(app.canvas);

      // Pixi's TickerPlugin registers its OWN render-every-tick listener on
      // app.ticker, outside our control — that internal listener is what still
      // threw "Cannot read properties of null (reading 'clear')" after destroy
      // (Sentry 1PV) even though OUR callback below was already guarded: it
      // runs Application's internal render on a Graphics context Pixi nulled
      // out mid-teardown, and there's no hook to guard someone else's listener.
      // Stop it immediately and drive our own rAF loop instead, so cleanup can
      // cancelAnimationFrame() our own pending frame directly instead of hoping
      // a destroyed-flag check wins a race against an already-queued tick.
      app.ticker.stop();

      // Cache the canvas screen rect OUTSIDE the ticker. It only moves on
      // scroll/resize, so reading it per-frame (during a drag) was a forced
      // reflow every ~16ms. Refresh it on those events instead.
      const canvasEl = app.canvas as HTMLCanvasElement;
      let canvasRect = canvasEl.getBoundingClientRect();
      const refreshRect = () => { canvasRect = canvasEl.getBoundingClientRect(); };
      window.addEventListener('scroll', refreshRect, { passive: true, capture: true });
      window.addEventListener('resize', refreshRect, { passive: true });
      removeRectListeners = () => {
        window.removeEventListener('scroll', refreshRect, { capture: true } as EventListenerOptions);
        window.removeEventListener('resize', refreshRect);
      };

      const orbitGfx = new Graphics();
      const lineGfx = new Graphics();
      const glowGfx = new Graphics();
      app.stage.addChild(glowGfx, lineGfx, orbitGfx);

      let angle = 0;
      const cx = w / 2;
      const cy = h / 2;
      let lastTime = performance.now();

      frame = function frameLoop(time: number) {
        // If the tab is hidden, pause the loop entirely rather than scheduling
        // continuous no-op frames. We resume on visibilitychange.
        if (typeof document !== 'undefined' && document.hidden) {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          visibilityPaused = true;
          lastTime = time;
          return;
        }

        // Schedule the next frame so long as we're still mounted.
        if (!destroyed && rafId === null) rafId = requestAnimationFrame(frameLoop);

        // Guard: cleanup calls cancelAnimationFrame on unmount (below), but a
        // frame already dispatched by the browser before that call still runs
        // once more. Bail before touching any Graphics — this is belt, the
        // cancelAnimationFrame is suspenders (Sentry 1CW/1PV, /daily/word-wheel).
        if (destroyed || orbitGfx.destroyed || lineGfx.destroyed || glowGfx.destroyed) return;
        try {
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        const { selectedIndices: sel, radius: r, combo: c, pointerPosRef: ppRef, isDraggingRef: dragRef, outerCount: oc } = stateRef.current;
        // Ambient motion is decorative: disable it when reduced motion is
        // preferred. Connection lines and drag trails still update below.
        if (!reducedMotion) angle += dt * 0.5;

        // ── Orbital ring 1: lime dots ──
        orbitGfx.clear();
        const orbit1 = r + 16;
        for (let i = 0; i < 20; i++) {
          const a = angle + (i / 20) * Math.PI * 2;
          const px = cx + Math.cos(a) * orbit1;
          const py = cy + Math.sin(a) * orbit1;
          const al = 0.25 + 0.12 * Math.sin(angle * 3 + i * 0.8);
          const sz = 1.5 + 0.5 * Math.sin(angle * 2 + i);
          orbitGfx.circle(px, py, sz);
          orbitGfx.fill({ color: 0xbfff00, alpha: al });
        }

        // ── Orbital ring 2: cyan, counter-rotating ──
        const orbit2 = r + 26;
        for (let i = 0; i < 12; i++) {
          const a = -angle * 0.7 + (i / 12) * Math.PI * 2;
          const px = cx + Math.cos(a) * orbit2;
          const py = cy + Math.sin(a) * orbit2;
          const al = 0.15 + 0.08 * Math.sin(angle * 2 + i);
          orbitGfx.circle(px, py, 1.2);
          orbitGfx.fill({ color: 0x00ffff, alpha: al });
        }

        // ── Connection lines between selected letters ──
        lineGfx.clear();
        if (sel.length >= 1) {
          const pts = sel.map(idx => {
            if (idx === -1) return { x: cx, y: cy };
            const rad = (idx * (360 / oc) * Math.PI) / 180;
            return { x: cx + Math.sin(rad) * r, y: cy - Math.cos(rad) * r };
          });

          if (pts.length >= 2) {
            // Glow line (wider, translucent)
            lineGfx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) lineGfx.lineTo(pts[i].x, pts[i].y);
            lineGfx.stroke({ color: 0xbfff00, width: 10, alpha: 0.35, cap: 'round', join: 'round' });

            // Core line
            lineGfx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) lineGfx.lineTo(pts[i].x, pts[i].y);
            lineGfx.stroke({ color: 0xbfff00, width: 4, alpha: 0.85, cap: 'round', join: 'round' });
          }

          // Vertex dots
          for (const p of pts) {
            lineGfx.circle(p.x, p.y, 3.5);
            lineGfx.fill({ color: 0xbfff00, alpha: 0.8 });
          }

          // ── Live drag line: last committed letter → current pointer ──
          const pp = ppRef?.current ?? null;
          const isDrag = dragRef?.current ?? false;
          if (isDrag && pp) {
            const lx = pp.x - canvasRect.left;
            const ly = pp.y - canvasRect.top;
            const last = pts[pts.length - 1];
            lineGfx.moveTo(last.x, last.y);
            lineGfx.lineTo(lx, ly);
            lineGfx.stroke({ color: 0xbfff00, width: 3, alpha: 0.5, cap: 'round', join: 'round' });
          }
        }

        // ── Center energy pulse ──
        glowGfx.clear();
        const boost = Math.min(c * 0.06, 0.3);
        // Freeze the pulse amplitude when reduced motion is preferred.
        const pulse = reducedMotion ? 1 : 1 + 0.12 * Math.sin(angle * 2.5);
        const gr = 32 * pulse;
        glowGfx.circle(cx, cy, gr);
        glowGfx.fill({ color: 0xbfff00, alpha: 0.03 + boost * 0.08 });
        if (c >= 2) {
          glowGfx.circle(cx, cy, gr * 0.65);
          glowGfx.fill({ color: 0x00ffff, alpha: 0.04 + boost * 0.1 });
        }

        app.render();
        } catch { /* post-destroy null-context race — skip this frame (Sentry 1PV) */ }
      };

      const startFrame = frame;
      if (startFrame) rafId = requestAnimationFrame(startFrame);
    };

    setup();

    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      const resumeFrame = frame;
      if (!document.hidden && visibilityPaused && rafId === null && !destroyed && resumeFrame) {
        visibilityPaused = false;
        rafId = requestAnimationFrame(resumeFrame);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      destroyed = true;
      removeRectListeners?.();
      document.removeEventListener('visibilitychange', handleVisibility);
      // Cancel our own pending rAF frame directly, rather than relying solely
      // on the destroyed-flag check inside it to win a race.
      if (rafId !== null) cancelAnimationFrame(rafId);
      try { app.ticker?.stop(); } catch { /* */ }
      try { app.destroy(true, { children: true }); } catch { /* */ }
      while (el.firstChild) el.removeChild(el.firstChild);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      style={{ top: -30, right: -30, bottom: -30, left: -30, zIndex: 0 }}
    />
  );
}
