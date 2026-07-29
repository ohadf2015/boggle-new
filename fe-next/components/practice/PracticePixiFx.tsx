'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

export interface PracticePixiFxHandle {
  /** Spawn a particle burst at canvas-local (x, y). Optional color (0xRRGGBB). */
  burst: (x: number, y: number, color?: number) => void;
  /** DOM-driven shake — implemented in usePracticeJuice. */
  shake: () => void;
  /** Fullscreen multi-color celebration burst from canvas center. */
  goalCelebrate: () => void;
}

type PixiApp = {
  destroy: () => void;
  stage: { addChild: (g: unknown) => void; removeChild: (g: unknown) => void };
  ticker: { add: (fn: (delta: number) => void) => void; remove: (fn: (delta: number) => void) => void };
  screen: { width: number; height: number };
};

type PixiGraphics = {
  x: number;
  y: number;
  alpha: number;
  scale: { set: (s: number) => void };
  circle: (cx: number, cy: number, r: number) => PixiGraphics;
  fill: (color: { color: number; alpha?: number } | number) => PixiGraphics;
  destroy: () => void;
};

interface Particle {
  g: PixiGraphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  step: (delta: number) => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PRACTICE_BURST_PARTICLE_COUNT = 14;
const PRACTICE_GOAL_PARTICLE_COUNT = 60;
const GOAL_PALETTE = [0xbfff00, 0x00ffff, 0xff1493, 0x8b5cf6];

/**
 * Pixi overlay above the practice grid. Mounts a transparent canvas with
 * pointer-events:none, lifecycle managed via dynamic-import so SSR stays clean.
 * Skips Pixi entirely when prefers-reduced-motion is reduce.
 *
 * Implements imperative `burst` and `goalCelebrate` — small particle bursts
 * (mode-colored sparkles) for word-found and a fullscreen multi-color burst
 * for goal-completion. Shake is DOM-driven via usePracticeJuice.
 */
const PracticePixiFx = forwardRef<PracticePixiFxHandle, object>(function PracticePixiFx(_, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApp | null>(null);
  const GraphicsCtorRef = useRef<(new () => PixiGraphics) | null>(null);
  const particlesRef = useRef<Set<Particle>>(new Set());

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const particles = particlesRef.current;
    let cancelled = false;
    (async () => {
      const pixi = await import('pixi.js');
      if (cancelled) return;
      const app = new pixi.Application();
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: containerRef.current ?? undefined,
      });
      if (cancelled) {
        app.destroy();
        return;
      }
      appRef.current = app as unknown as PixiApp;
      GraphicsCtorRef.current = pixi.Graphics as unknown as new () => PixiGraphics;
      containerRef.current?.appendChild(app.canvas);
    })();
    return () => {
      cancelled = true;
      const app = appRef.current;
      if (app) {
        app.destroy();
        appRef.current = null;
      }
      particles.clear();
    };
  }, []);

  const spawnParticle = (
    app: PixiApp,
    Graphics: new () => PixiGraphics,
    x: number,
    y: number,
    color: number,
    radius: number,
    speed: number,
    angle: number,
    maxLife: number,
  ): Particle => {
    const g = new Graphics();
    g.circle(0, 0, radius).fill({ color, alpha: 1 });
    g.x = x;
    g.y = y;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - speed * 0.4;
    let life = 0;
    const particle: Particle = {
      g,
      vx,
      vy,
      life,
      maxLife,
      step: (delta: number) => {
        life += delta;
        // Gravity pulls the spark down for a falling-confetti feel.
        particle.vy += 0.18 * delta;
        g.x += particle.vx * delta * 0.18;
        g.y += particle.vy * delta * 0.18;
        const t = life / maxLife;
        g.alpha = Math.max(0, 1 - t * t);
        const scale = Math.max(0.05, 1 - t * 0.6);
        g.scale.set(scale);
        if (life >= maxLife) {
          app.ticker.remove(particle.step);
          app.stage.removeChild(g);
          g.destroy();
          particlesRef.current.delete(particle);
        }
      },
    };
    app.stage.addChild(g);
    app.ticker.add(particle.step);
    particlesRef.current.add(particle);
    return particle;
  };

  const burst = useCallback<PracticePixiFxHandle['burst']>((x, y, color = 0x00ffff) => {
    if (prefersReducedMotion()) return;
    const app = appRef.current;
    const Graphics = GraphicsCtorRef.current;
    if (!app || !Graphics) return;
    // Translate viewport coords (from getBoundingClientRect) to canvas-local
    // so callers don't have to know about the FX layer's offset.
    const rect = containerRef.current?.getBoundingClientRect();
    const localX = rect ? x - rect.left : x;
    const localY = rect ? y - rect.top : y;
    for (let i = 0; i < PRACTICE_BURST_PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PRACTICE_BURST_PARTICLE_COUNT + Math.random() * 0.4;
      const speed = 1.6 + Math.random() * 2.4;
      const radius = 2 + Math.random() * 2.5;
      const maxLife = 36 + Math.random() * 12;
      spawnParticle(app, Graphics, localX, localY, color, radius, speed, angle, maxLife);
    }
  }, []);

  const goalCelebrate = useCallback<PracticePixiFxHandle['goalCelebrate']>(() => {
    if (prefersReducedMotion()) return;
    const app = appRef.current;
    const Graphics = GraphicsCtorRef.current;
    if (!app || !Graphics) return;
    const cx = app.screen.width / 2;
    const cy = app.screen.height / 2;
    for (let i = 0; i < PRACTICE_GOAL_PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const radius = 2.5 + Math.random() * 3.5;
      const maxLife = 60 + Math.random() * 30;
      const color = GOAL_PALETTE[i % GOAL_PALETTE.length];
      spawnParticle(app, Graphics, cx, cy, color, radius, speed, angle, maxLife);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    burst,
    shake: () => { /* DOM-driven via usePracticeJuice */ },
    goalCelebrate,
  }), [burst, goalCelebrate]);

  return (
    <div
      ref={containerRef}
      data-testid="practice-pixi-fx"
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    />
  );
});

export default PracticePixiFx;
