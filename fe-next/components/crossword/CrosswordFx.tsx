'use client';

// One-shot Pixi confetti for the solve celebration. Self-contained: dynamic-imports pixi.js,
// runs for a fixed duration, then tears down. Reduced-motion users get nothing. Guards follow
// the codebase's null-context discipline (a cancelled flag + destroyed checks each frame) so a
// late ticker tick can never touch a destroyed renderer.

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Neo palette confetti.
const COLORS = [0xbfff00, 0xff1493, 0x00ffff, 0x8b5cf6, 0xffe135];
const DURATION_MS = 2600;

export interface CrosswordFxProps {
  /** Changing this to a new truthy value fires a burst. */
  burstKey: number;
}

export function CrosswordFx({ burstKey }: CrosswordFxProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!burstKey || reduced) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let app: import('pixi.js').Application | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      app = new PIXI.Application();
      await app.init({ width: w, height: h, backgroundAlpha: 0, antialias: true });
      if (cancelled) {
        app.destroy(true, { children: true });
        app = null;
        return;
      }
      app.canvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
      host.appendChild(app.canvas);

      const pieces: Array<{
        g: InstanceType<typeof PIXI.Graphics>;
        vx: number;
        vy: number;
        vr: number;
      }> = [];
      const count = Math.min(140, Math.floor(w / 6));
      for (let i = 0; i < count; i++) {
        const g = new PIXI.Graphics();
        const c = COLORS[i % COLORS.length];
        const sw = 6 + Math.random() * 8;
        g.rect(-sw / 2, -sw / 4, sw, sw / 2).fill(c);
        g.x = Math.random() * w;
        g.y = -20 - Math.random() * h * 0.3;
        g.rotation = Math.random() * Math.PI;
        app.stage.addChild(g);
        pieces.push({
          g,
          vx: (Math.random() - 0.5) * 3,
          vy: 3 + Math.random() * 4,
          vr: (Math.random() - 0.5) * 0.3,
        });
      }

      const tick = () => {
        if (cancelled || !app || app.stage?.destroyed) return;
        for (const p of pieces) {
          if (p.g.destroyed) continue;
          p.vy += 0.08; // gravity
          p.g.x += p.vx;
          p.g.y += p.vy;
          p.g.rotation += p.vr;
        }
      };
      app.ticker.add(tick);

      timeout = setTimeout(() => {
        if (cancelled || !app) return;
        app.destroy(true, { children: true });
        app = null;
      }, DURATION_MS);
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch {
          /* already torn down */
        }
        app = null;
      }
    };
  }, [burstKey, reduced]);

  return <div ref={hostRef} aria-hidden />;
}
