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
}

export default function WordWheelPixiRing({
  selectedIndices, radius, combo, pointerPosRef, isDraggingRef,
}: WordWheelPixiRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ selectedIndices, radius, combo, pointerPosRef, isDraggingRef });
  stateRef.current = { selectedIndices, radius, combo, pointerPosRef, isDraggingRef };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
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

      const orbitGfx = new Graphics();
      const lineGfx = new Graphics();
      const glowGfx = new Graphics();
      app.stage.addChild(glowGfx, lineGfx, orbitGfx);

      let angle = 0;
      const cx = w / 2;
      const cy = h / 2;

      app.ticker.add((ticker) => {
        // Guard: a ticker tick already queued in the rAF loop can fire AFTER the
        // unmount cleanup calls app.destroy({children:true}), which nulls each
        // Graphics' internal context. Touching .clear() then throws
        // "Cannot read properties of null (reading 'clear')" (Sentry 1CW, route
        // /daily/word-wheel). Mirrors the post-destroy guards added in a39f63378
        // for the blast renderers.
        if (destroyed || orbitGfx.destroyed || lineGfx.destroyed || glowGfx.destroyed) return;
        const dt = ticker.deltaMS / 1000;
        const { selectedIndices: sel, radius: r, combo: c, pointerPosRef: ppRef, isDraggingRef: dragRef } = stateRef.current;
        angle += dt * 0.5;

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
            const rad = (idx * 60 * Math.PI) / 180;
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
            const canvasEl = app.canvas as HTMLCanvasElement;
            const cr = canvasEl.getBoundingClientRect();
            const lx = pp.x - cr.left;
            const ly = pp.y - cr.top;
            const last = pts[pts.length - 1];
            lineGfx.moveTo(last.x, last.y);
            lineGfx.lineTo(lx, ly);
            lineGfx.stroke({ color: 0xbfff00, width: 3, alpha: 0.5, cap: 'round', join: 'round' });
          }
        }

        // ── Center energy pulse ──
        glowGfx.clear();
        const boost = Math.min(c * 0.06, 0.3);
        const pulse = 1 + 0.12 * Math.sin(angle * 2.5);
        const gr = 32 * pulse;
        glowGfx.circle(cx, cy, gr);
        glowGfx.fill({ color: 0xbfff00, alpha: 0.03 + boost * 0.08 });
        if (c >= 2) {
          glowGfx.circle(cx, cy, gr * 0.65);
          glowGfx.fill({ color: 0x00ffff, alpha: 0.04 + boost * 0.1 });
        }
      });
    };

    setup();

    return () => {
      destroyed = true;
      try { app.destroy(true, { children: true }); } catch { /* */ }
      while (el.firstChild) el.removeChild(el.firstChild);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      style={{ top: -30, right: -30, bottom: -30, left: -30, zIndex: 0 }}
    />
  );
}
