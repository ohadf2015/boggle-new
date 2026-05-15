'use client';

// Decorative Pixi canvas painted behind the wheel-rush results scene.
// Renders concentric spinning arcs + a slow particle drift to evoke the
// in-game wheel coming to rest. Pointer-events disabled, transparent bg.

import { useEffect, useRef } from 'react';
import { Application, Graphics } from 'pixi.js';

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  hue: number;
  alpha: number;
}

interface Props {
  reducedMotion?: boolean;
  // Drives final-snap rotation; the canvas always settles on this angle (radians).
  settleAngle?: number;
}

const PARTICLE_COUNT = 36;
const ARC_COUNT = 3;
const PALETTE_HUES = [180, 320, 270, 60]; // cyan, pink, purple, yellow

export default function WheelRushSpinCanvas({ reducedMotion = false, settleAngle = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    const app = new Application();
    let raf = 0;

    const setup = async () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(120, Math.floor(rect.width));
      const h = Math.max(120, Math.floor(rect.height));

      await app.init({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      el.appendChild(app.canvas);

      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.42;

      const arcGfx = new Graphics();
      const particleGfx = new Graphics();
      const centerGfx = new Graphics();
      app.stage.addChild(arcGfx, particleGfx, centerGfx);

      const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4,
        radius: baseR * (0.55 + Math.random() * 0.45),
        speed: 0.0008 + Math.random() * 0.0014,
        size: 1.6 + Math.random() * 2.4,
        hue: PALETTE_HUES[i % PALETTE_HUES.length],
        alpha: 0.35 + Math.random() * 0.45,
      }));

      // Spin starts fast, decays to settleAngle. Time scale keeps the whole
      // animation under ~2s — feels like a wheel slowing into result.
      const startTime = performance.now();
      const SPIN_DURATION = reducedMotion ? 1 : 1800;
      const initialVelocity = reducedMotion ? 0 : 14; // rad/sec at t=0

      const tick = () => {
        if (destroyed) return;
        const t = performance.now() - startTime;
        const progress = Math.min(1, t / SPIN_DURATION);
        // Ease-out cubic for the global rotation envelope
        const eased = 1 - Math.pow(1 - progress, 3);
        const globalRot = settleAngle + initialVelocity * (1 - eased) * SPIN_DURATION / 1000;

        arcGfx.clear();
        for (let i = 0; i < ARC_COUNT; i++) {
          const r = baseR * (0.7 + i * 0.13);
          const hue = PALETTE_HUES[i % PALETTE_HUES.length];
          const alpha = 0.18 + i * 0.05;
          const arcStart = globalRot * (1 - i * 0.18) + i;
          const arcLen = Math.PI * (0.55 + i * 0.12);
          arcGfx.arc(cx, cy, r, arcStart, arcStart + arcLen);
          arcGfx.stroke({ width: 2 + i, color: hslToHex(hue, 90, 60), alpha });
        }

        particleGfx.clear();
        for (const p of particles) {
          // Particles orbit slower than the global spin; fold global rotation in
          // for a coordinated "wheel slowing" feel.
          p.angle += p.speed * 16 + (1 - eased) * 0.04;
          const x = cx + Math.cos(p.angle + globalRot * 0.2) * p.radius;
          const y = cy + Math.sin(p.angle + globalRot * 0.2) * p.radius;
          particleGfx.circle(x, y, p.size);
          particleGfx.fill({ color: hslToHex(p.hue, 95, 65), alpha: p.alpha });
        }

        centerGfx.clear();
        const pulse = 1 + Math.sin(t * 0.003) * 0.06;
        centerGfx.circle(cx, cy, baseR * 0.18 * pulse);
        centerGfx.stroke({ width: 2, color: 0xbfff00, alpha: 0.3 });
        centerGfx.circle(cx, cy, baseR * 0.12 * pulse);
        centerGfx.fill({ color: 0x00ffff, alpha: 0.05 });

        if (reducedMotion && progress >= 1) return; // freeze frame for a11y
        raf = requestAnimationFrame(tick);
      };

      tick();
    };

    setup().catch(() => { /* swallow — decorative only */ });

    return () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      try { app.destroy(true, { children: true }); } catch { /* ignore */ }
    };
  }, [reducedMotion, settleAngle]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}

// Exported for tests. Must clamp every channel: Pixi v8 Color.set() throws on
// negative inputs ("Unable to convert color -N") and f(n) can dip slightly
// negative for low-lightness HSL values.
export function hslToHex(h: number, s: number, l: number): number {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toByte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255) | 0));
  return (toByte(f(0)) << 16) | (toByte(f(8)) << 8) | toByte(f(4));
}
