'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Total height of the effect region (fire + particle headroom) */
const EFFECT_HEIGHT = 160;
/** How tall the fire automaton portion is (bottom section) */
const FIRE_HEIGHT = 110;
const PIXEL_SIZE = 5;
const TARGET_FPS = 20;
const MAX_PARTICLES = 25;
const PARTICLE_SPAWN_CHANCE = 0.25;

/**
 * Classic "Doom fire" palette — 37 colors from transparent/black
 * through deep red -> orange -> yellow -> white-hot.
 * Each entry is [R, G, B, A].
 */
const PALETTE: [number, number, number, number][] = [
  [0, 0, 0, 0],        // 0: transparent
  [0, 0, 0, 0],        // 1: transparent
  [28, 8, 0, 255],     // 2: deep ember
  [56, 12, 0, 255],    // 3
  [84, 16, 0, 255],    // 4
  [112, 20, 0, 255],   // 5
  [140, 28, 0, 255],   // 6
  [168, 36, 0, 255],   // 7
  [192, 44, 0, 255],   // 8
  [212, 52, 0, 255],   // 9
  [228, 60, 0, 255],   // 10
  [240, 68, 0, 255],   // 11
  [248, 80, 0, 255],   // 12
  [255, 92, 0, 255],   // 13
  [255, 108, 0, 255],  // 14
  [255, 124, 0, 255],  // 15
  [255, 140, 0, 255],  // 16
  [255, 156, 4, 255],  // 17
  [255, 172, 12, 255], // 18
  [255, 184, 20, 255], // 19
  [255, 196, 32, 255], // 20
  [255, 204, 44, 255], // 21
  [255, 212, 60, 255], // 22
  [255, 218, 76, 255], // 23
  [255, 224, 92, 255], // 24
  [255, 228, 108, 255],// 25
  [255, 232, 124, 255],// 26
  [255, 236, 140, 255],// 27
  [255, 240, 160, 255],// 28
  [255, 242, 176, 255],// 29
  [255, 244, 192, 255],// 30
  [255, 246, 208, 255],// 31
  [255, 248, 220, 255],// 32
  [255, 250, 232, 255],// 33
  [255, 252, 240, 255],// 34
  [255, 254, 248, 255],// 35
  [255, 255, 255, 255],// 36: white-hot core
];

const MAX_HEAT = PALETTE.length - 1;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heat: number;
  life: number;
}

interface FireBottomEffectProps {
  isActive: boolean;
}

/**
 * FireBottomEffect — Pixelated "Doom fire" + spraying ember particles.
 *
 * The fire base uses a cellular automaton (bottom row = max heat, propagates
 * upward with decay). On top of that, ember particles spawn from hot zones
 * and spray upward with drift, cooling as they rise.
 *
 * Both fire and particles render on the same low-res canvas with
 * `image-rendering: pixelated` for a chunky retro look.
 *
 * Rendered via portal to escape ancestor stacking contexts.
 * pointer-events-none so it never blocks tile interaction.
 */
export const FireBottomEffect: React.FC<FireBottomEffectProps> = ({ isActive }) => {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 400
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cols = Math.ceil(width / PIXEL_SIZE);
  const totalRows = Math.ceil(EFFECT_HEIGHT / PIXEL_SIZE);
  const fireRows = Math.ceil(FIRE_HEIGHT / PIXEL_SIZE);
  // Fire grid occupies the bottom portion of the canvas
  const fireRowOffset = totalRows - fireRows;

  useEffect(() => {
    if (!isActive || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fireCells = cols * fireRows;
    const fireData = new Uint8Array(fireCells);

    // Ignite bottom row
    for (let x = 0; x < cols; x++) {
      fireData[(fireRows - 1) * cols + x] = MAX_HEAT;
    }

    const particles: Particle[] = [];

    const imageData = ctx.createImageData(cols, totalRows);
    let lastTime = 0;
    const interval = 1000 / TARGET_FPS;

    const tick = (time: number) => {
      animFrameRef.current = requestAnimationFrame(tick);

      if (time - lastTime < interval) return;
      lastTime = time;

      // --- Fire automaton ---
      for (let y = 0; y < fireRows - 1; y++) {
        for (let x = 0; x < cols; x++) {
          const spread = Math.round(Math.random() * 3) - 1;
          const srcX = Math.min(Math.max(x + spread, 0), cols - 1);
          const decay = Math.round(Math.random() * 1.5);
          fireData[y * cols + x] = Math.max(0, fireData[(y + 1) * cols + srcX] - decay);
        }
      }

      // --- Spawn ember particles from hot zones near fire top ---
      if (particles.length < MAX_PARTICLES && Math.random() < PARTICLE_SPAWN_CHANCE) {
        // Scan the top few rows of the fire for hot pixels
        const scanRows = Math.min(6, fireRows);
        for (let sy = 0; sy < scanRows; sy++) {
          for (let sx = 0; sx < cols; sx += 3) {
            const heat = fireData[sy * cols + sx];
            if (heat > 18 && Math.random() < 0.02 && particles.length < MAX_PARTICLES) {
              particles.push({
                x: sx,
                y: fireRowOffset + sy,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -(Math.random() * 1.0 + 0.5),
                heat: Math.min(heat, MAX_HEAT),
                life: 10 + Math.floor(Math.random() * 12),
              });
            }
          }
        }
      }

      // --- Update particles ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // slight gravity pull
        p.vx += (Math.random() - 0.5) * 0.3; // horizontal drift
        p.life--;
        p.heat = Math.max(0, p.heat - Math.round(Math.random() * 2));

        if (p.life <= 0 || p.heat <= 1 || p.y < 0 || p.x < 0 || p.x >= cols) {
          particles.splice(i, 1);
        }
      }

      // --- Render to image data ---
      const data = imageData.data;

      // Clear entire canvas
      data.fill(0);

      // Draw fire (offset to bottom portion)
      for (let y = 0; y < fireRows; y++) {
        for (let x = 0; x < cols; x++) {
          const heat = fireData[y * cols + x];
          if (heat <= 1) continue;
          const color = PALETTE[heat];
          const canvasY = fireRowOffset + y;
          const off = (canvasY * cols + x) * 4;
          data[off] = color[0];
          data[off + 1] = color[1];
          data[off + 2] = color[2];
          data[off + 3] = color[3];
        }
      }

      // Draw particles as single pixels (pixelated ember blocks)
      for (const p of particles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        if (px < 0 || px >= cols || py < 0 || py >= totalRows) continue;
        const color = PALETTE[p.heat];
        const off = (py * cols + px) * 4;
        // Additive-ish: take the brighter value so embers glow over fire
        data[off] = Math.max(data[off], color[0]);
        data[off + 1] = Math.max(data[off + 1], color[1]);
        data[off + 2] = Math.max(data[off + 2], color[2]);
        data[off + 3] = Math.max(data[off + 3], color[3]);
      }

      ctx.putImageData(imageData, 0, 0);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, prefersReducedMotion, cols, totalRows, fireRows, fireRowOffset]);

  if (!isActive || prefersReducedMotion) return null;

  const content = (
    <div
      data-testid="fire-bottom-effect"
      className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"
      style={{ height: `${EFFECT_HEIGHT}px` }}
    >
      <canvas
        ref={canvasRef}
        width={cols}
        height={totalRows}
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
