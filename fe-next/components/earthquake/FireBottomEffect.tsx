'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Canvas covers full viewport for particles to float freely */
const PIXEL_SIZE = 5;
const TARGET_FPS = 20;
const MAX_PARTICLES = 40;
const PARTICLE_SPAWN_RATE = 3;

/**
 * Ember palette — warm colors from deep red through orange to yellow.
 * Each entry is [R, G, B, A].
 */
const PALETTE: [number, number, number, number][] = [
  [0, 0, 0, 0],        // 0: transparent
  [0, 0, 0, 0],        // 1: transparent
  [56, 12, 0, 200],    // 2: deep ember
  [112, 20, 0, 210],   // 3
  [168, 36, 0, 220],   // 4
  [212, 52, 0, 230],   // 5
  [240, 68, 0, 235],   // 6
  [255, 92, 0, 240],   // 7
  [255, 124, 0, 240],  // 8
  [255, 156, 4, 235],  // 9
  [255, 184, 20, 230], // 10
  [255, 212, 60, 220], // 11
  [255, 232, 124, 210],// 12
  [255, 248, 220, 200],// 13: bright ember
];

const MAX_HEAT = PALETTE.length - 1;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heat: number;
  life: number;
  size: number;
}

interface FireBottomEffectProps {
  isActive: boolean;
}

/**
 * FireBottomEffect — Floating ember particles that rise from screen edges.
 *
 * Particles spawn along the bottom and sides, drifting upward with
 * random horizontal movement, cooling as they rise. Rendered on a
 * low-res canvas with `image-rendering: pixelated` for a chunky retro look.
 *
 * Rendered via portal to escape ancestor stacking contexts.
 * pointer-events-none so it never blocks interaction.
 */
export const FireBottomEffect: React.FC<FireBottomEffectProps> = ({ isActive }) => {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState(
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 400, h: 800 }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cols = Math.ceil(dimensions.w / PIXEL_SIZE);
  const rows = Math.ceil(dimensions.h / PIXEL_SIZE);

  useEffect(() => {
    if (!isActive || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    const imageData = ctx.createImageData(cols, rows);
    let lastTime = 0;
    const interval = 1000 / TARGET_FPS;

    const tick = (time: number) => {
      animFrameRef.current = requestAnimationFrame(tick);

      if (time - lastTime < interval) return;
      lastTime = time;

      // --- Spawn ember particles from bottom edge ---
      const spawnCount = Math.min(PARTICLE_SPAWN_RATE, MAX_PARTICLES - particles.length);
      for (let i = 0; i < spawnCount; i++) {
        const spawnX = Math.random() * cols;
        const spawnY = rows - 1 - Math.random() * 3;
        particles.push({
          x: spawnX,
          y: spawnY,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -(Math.random() * 1.5 + 0.8),
          heat: Math.floor(Math.random() * 6) + (MAX_HEAT - 6),
          life: 20 + Math.floor(Math.random() * 30),
          size: Math.random() < 0.3 ? 2 : 1,
        });
      }

      // --- Update particles ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.01; // accelerate upward slightly
        p.vx += (Math.random() - 0.5) * 0.4; // horizontal drift
        p.life--;
        if (Math.random() < 0.15) {
          p.heat = Math.max(0, p.heat - 1);
        }

        if (p.life <= 0 || p.heat <= 1 || p.y < 0 || p.x < -2 || p.x >= cols + 2) {
          particles.splice(i, 1);
        }
      }

      // --- Render to image data ---
      const data = imageData.data;
      data.fill(0);

      for (const p of particles) {
        const color = PALETTE[p.heat];
        // Draw particle (1x1 or 2x2 pixel blocks)
        for (let dy = 0; dy < p.size; dy++) {
          for (let dx = 0; dx < p.size; dx++) {
            const px = Math.round(p.x) + dx;
            const py = Math.round(p.y) + dy;
            if (px < 0 || px >= cols || py < 0 || py >= rows) continue;
            const off = (py * cols + px) * 4;
            data[off] = Math.max(data[off], color[0]);
            data[off + 1] = Math.max(data[off + 1], color[1]);
            data[off + 2] = Math.max(data[off + 2], color[2]);
            data[off + 3] = Math.max(data[off + 3], color[3]);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, prefersReducedMotion, cols, rows]);

  if (!isActive || prefersReducedMotion) return null;

  const content = (
    <div
      data-testid="fire-bottom-effect"
      className="fixed inset-0 z-30 pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        width={cols}
        height={rows}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
};
