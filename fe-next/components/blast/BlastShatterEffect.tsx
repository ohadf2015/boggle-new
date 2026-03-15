'use client';

import { useRef, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShatterParticle {
  id: string;
  triggerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  shape: 'square' | 'triangle' | 'circle';
  opacity: number;
}

export interface ShatterTrigger {
  row: number;
  col: number;
  type: string;
  id: string;
}

export interface BlastShatterEffectProps {
  shatterTriggers: ShatterTrigger[];
  cellSize: number;
  onComplete: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_PARTICLES = 80;
const PARTICLES_PER_TILE_MIN = 6;
const PARTICLES_PER_TILE_MAX = 12;
const GRAVITY = 600; // px/s²
const LIFETIME = 0.5; // seconds

const SHAPES: ShatterParticle['shape'][] = ['square', 'triangle', 'circle'];

import { SHATTER_COLORS } from './blastColorTokens';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function colorsFor(type: string): string[] {
  return SHATTER_COLORS[type] ?? SHATTER_COLORS.standard;
}

function spawnParticles(
  trigger: ShatterTrigger,
  cellSize: number,
  budget: number,
): ShatterParticle[] {
  const cx = trigger.col * cellSize + cellSize / 2;
  const cy = trigger.row * cellSize + cellSize / 2;
  const colors = colorsFor(trigger.type);
  const count = Math.min(
    Math.floor(rand(PARTICLES_PER_TILE_MIN, PARTICLES_PER_TILE_MAX + 1)),
    budget,
  );
  const particles: ShatterParticle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: `${trigger.id}-${i}`,
      triggerId: trigger.id,
      x: cx,
      y: cy,
      vx: rand(-150, 150),
      vy: rand(-200, 50),
      rotation: rand(0, 360),
      rotationSpeed: rand(-360, 360),
      size: rand(3, 8),
      color: pick(colors),
      shape: pick(SHAPES),
      opacity: 1,
    });
  }
  return particles;
}

function drawParticle(ctx: CanvasRenderingContext2D, p: ShatterParticle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  const half = p.size / 2;

  if (p.shape === 'square') {
    ctx.fillRect(-half, -half, p.size, p.size);
  } else if (p.shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, half);
    ctx.lineTo(-half, half);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Hook: reduced motion                                               */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BlastShatterEffect({
  shatterTriggers,
  cellSize,
  onComplete,
}: BlastShatterEffectProps) {
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ShatterParticle[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Mark unmounted to prevent setState calls from stale RAF callbacks
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Size canvas to match parent container (avoid fixed 800×800 waste)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // Spawn particles for new triggers
  useEffect(() => {
    if (reducedMotion) {
      // Fire onComplete immediately for reduced motion
      shatterTriggers.forEach((t) => {
        if (!processedRef.current.has(t.id)) {
          processedRef.current.add(t.id);
          onCompleteRef.current(t.id);
        }
      });
      return;
    }

    for (const trigger of shatterTriggers) {
      if (processedRef.current.has(trigger.id)) continue;
      processedRef.current.add(trigger.id);
      const budget = MAX_PARTICLES - particlesRef.current.length;
      if (budget <= 0) {
        onCompleteRef.current(trigger.id);
        continue;
      }
      const newParticles = spawnParticles(trigger, cellSize, budget);
      particlesRef.current.push(...newParticles);
    }
  }, [shatterTriggers, cellSize, reducedMotion]);

  // Animation loop stored in ref to avoid dependency issues
  const animateRef = useRef<(time: number) => void>(undefined);
  animateRef.current = (time: number) => {
    if (!mountedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    const completed = new Set<string>();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += GRAVITY * dt;
      p.rotation += p.rotationSpeed * dt;
      p.opacity -= dt / LIFETIME;

      if (p.opacity <= 0) {
        particles.splice(i, 1);
        if (!particles.some((q) => q.triggerId === p.triggerId)) {
          completed.add(p.triggerId);
        }
        continue;
      }

      drawParticle(ctx, p);
    }

    completed.forEach((id) => onCompleteRef.current(id));

    if (particles.length > 0) {
      rafRef.current = requestAnimationFrame((t) => animateRef.current?.(t));
    } else {
      lastTimeRef.current = 0;
    }
  };

  // Start/stop loop based on particle count
  useEffect(() => {
    if (reducedMotion) return;
    if (particlesRef.current.length > 0 && !rafRef.current) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame((t) => animateRef.current?.(t));
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [shatterTriggers, reducedMotion]);

  // Nothing to show
  if (reducedMotion || shatterTriggers.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-shatter-canvas"
      className="pointer-events-none absolute inset-0 z-25"
    />
  );
}
