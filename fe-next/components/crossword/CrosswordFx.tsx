'use client';

// One-shot confetti for the solve celebration, drawn on the shared FX canvas.
// Reduced-motion users get nothing.

import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { attachFxLayer } from '@/lib/pixiFx/fxLayers';

// Neo palette confetti.
const COLORS = [0xbfff00, 0xff1493, 0x00ffff, 0x8b5cf6, 0xffe135];
const DURATION_MS = 2600;

export interface CrosswordFxProps {
  /** Changing this to a new truthy value fires a burst. */
  burstKey: number;
}

export function CrosswordFx({ burstKey }: CrosswordFxProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!burstKey || reduced) return;

    return attachFxLayer(({ pixi, container }) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const pieces: Array<{ g: InstanceType<typeof pixi.Graphics>; vx: number; vy: number; vr: number }> = [];
      const count = Math.min(140, Math.floor(w / 6));
      for (let i = 0; i < count; i++) {
        const g = new pixi.Graphics();
        const sw = 6 + Math.random() * 8;
        g.rect(-sw / 2, -sw / 4, sw, sw / 2).fill(COLORS[i % COLORS.length]);
        g.x = Math.random() * w;
        g.y = -20 - Math.random() * h * 0.3;
        g.rotation = Math.random() * Math.PI;
        container.addChild(g);
        pieces.push({
          g,
          vx: (Math.random() - 0.5) * 3,
          vy: 3 + Math.random() * 4,
          vr: (Math.random() - 0.5) * 0.3,
        });
      }

      let elapsed = 0;
      return {
        update(deltaMS) {
          elapsed += deltaMS;
          for (const p of pieces) {
            p.vy += 0.08; // gravity, per frame like the original
            p.g.x += p.vx;
            p.g.y += p.vy;
            p.g.rotation += p.vr;
          }
          return elapsed < DURATION_MS;
        },
      };
    });
  }, [burstKey, reduced]);

  return null;
}
