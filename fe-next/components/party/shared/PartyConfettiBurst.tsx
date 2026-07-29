'use client';

import { useEffect, useRef } from 'react';
import { useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { confettiColors } from '@/lib/party/confetti';

/**
 * PartyConfettiBurst — a TV-only celebration popper for winner / crown moments.
 *
 * Neo-brutalist on purpose: HARD-EDGED solid squares (antialias off, no blur,
 * no glow), in the game's electric accent palette. A confetti-cannon burst
 * pops from the top-centre and gravity rains it down, then the ticker stops
 * once every piece has fallen off-screen so it costs nothing afterwards.
 *
 * Mount it on the crown/game-over screen; it bursts once on mount. It renders
 * nothing when animations are skipped (cosy mode / low-end device / OS
 * reduced-motion) and is purely decorative (pointer-events: none).
 */

interface PartyConfettiBurstProps {
  /** Mode accent token, e.g. 'neo-pink'. Drives the dominant confetti color. */
  accent?: string;
  /** Number of confetti pieces. Default 120 — plenty without taxing a TV. */
  count?: number;
  className?: string;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  color: number;
}

export function PartyConfettiBurst({ accent, count = 120, className = '' }: PartyConfettiBurstProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const skip = useSkipAnimations();

  useEffect(() => {
    if (skip) return;
    const holder = holderRef.current;
    if (!holder) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled || !holderRef.current) return;

      const width = holder.clientWidth || 800;
      const height = holder.clientHeight || 600;

      const app = new PIXI.Application();
      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: false, // hard pixel edges — neo-brutalist, no soft blur
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (cancelled) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }
      holder.appendChild(app.canvas);

      const colors = confettiColors(accent);
      // Confetti-cannon: pieces erupt from the top-centre with a wide horizontal
      // spread and an upward kick, then gravity rains them down.
      const originX = width / 2;
      const pieces: Piece[] = Array.from({ length: count }, () => {
        const angle = (Math.random() - 0.5) * Math.PI * 0.9; // fan around straight-up
        const speed = 6 + Math.random() * 9;
        return {
          x: originX + (Math.random() - 0.5) * width * 0.3,
          y: height * 0.18 + Math.random() * 40,
          vx: Math.sin(angle) * speed,
          vy: -Math.cos(angle) * speed - 2, // initial upward pop
          size: 8 + Math.random() * 12,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.4,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      });

      const gfx = new PIXI.Graphics();
      app.stage.addChild(gfx);

      const GRAVITY = 0.35;
      const DRAG = 0.99;
      const tick = (ticker: { deltaTime: number }) => {
        const dt = ticker.deltaTime;
        gfx.clear();
        let alive = 0;
        for (const p of pieces) {
          p.vy += GRAVITY * dt;
          p.vx *= DRAG;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;
          if (p.y - p.size > height) continue; // fallen off the bottom
          alive++;
          // Draw a rotated square as a hard quad (no rounded corners, no blur).
          const c = Math.cos(p.rot) * p.size * 0.5;
          const s = Math.sin(p.rot) * p.size * 0.5;
          gfx
            .poly([
              p.x - c + s, p.y - s - c,
              p.x + c + s, p.y + s - c,
              p.x + c - s, p.y + s + c,
              p.x - c - s, p.y - s + c,
            ])
            .fill(p.color);
        }
        if (alive === 0) app.ticker.remove(tick); // settle → stop spending CPU
      };
      app.ticker.add(tick);

      cleanup = () => {
        app.ticker.remove(tick);
        app.destroy({ removeView: true }, { children: true });
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Burst once per mount; accent/count are read at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  if (skip) return null;

  return (
    <div
      ref={holderRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    />
  );
}

export default PartyConfettiBurst;
