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
  shape: 'square' | 'triangle' | 'circle' | 'star' | 'diamond';
  opacity: number;
  /** Trail: previous positions for motion blur effect */
  trail: { x: number; y: number; opacity: number }[];
  /** Age in seconds — used for glow intensity curve */
  age: number;
  /** Initial burst scale — particles start big and shrink */
  scale: number;
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

const MAX_PARTICLES = 120;
const PARTICLES_PER_TILE_MIN = 8;
const PARTICLES_PER_TILE_MAX = 16;
const GRAVITY = 450; // px/s² — slower gravity = particles float longer for more visual presence
const AIR_RESISTANCE = 0.97; // Per-frame velocity damping — creates natural deceleration
const LIFETIME = 0.7; // seconds — longer lifetime for more satisfying trails
const GLOW_FADE_POWER = 1.8; // Exponential fade for glow — stays bright longer, then snaps off

const SHAPES: ShatterParticle['shape'][] = ['square', 'triangle', 'circle', 'star', 'diamond'];

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
    // Radial burst pattern — particles fly outward from center in all directions
    const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const speed = rand(120, 280);
    particles.push({
      id: `${trigger.id}-${i}`,
      triggerId: trigger.id,
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(50, 150), // Upward bias
      rotation: rand(0, 360),
      rotationSpeed: rand(-540, 540), // Faster spin
      size: rand(3, 10),
      color: pick(colors),
      shape: pick(SHAPES),
      opacity: 1,
      trail: [],
      age: 0,
      scale: rand(1.2, 1.8), // Start oversized, shrink over lifetime
    });
  }
  return particles;
}

/** Draw a 5-pointed star path */
function drawStarPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: ShatterParticle) {
  const scaledSize = p.size * p.scale;
  const half = scaledSize / 2;

  // Draw motion trail (fading ghost positions)
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    ctx.save();
    ctx.globalAlpha = t.opacity * 0.3;
    ctx.fillStyle = p.color;
    ctx.translate(t.x, t.y);
    const trailSize = half * (0.3 + (i / p.trail.length) * 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, trailSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw glow halo (stays bright longer via exponential curve)
  const glowAlpha = Math.pow(p.opacity, GLOW_FADE_POWER) * 0.4;
  if (glowAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = scaledSize * 2;
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.arc(0, 0, half * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw main particle
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);

  if (p.shape === 'square') {
    ctx.fillRect(-half, -half, scaledSize, scaledSize);
  } else if (p.shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, half);
    ctx.lineTo(-half, half);
    ctx.closePath();
    ctx.fill();
  } else if (p.shape === 'star') {
    drawStarPath(ctx, half);
    ctx.fill();
  } else if (p.shape === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half * 0.6, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half * 0.6, 0);
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

      // Store trail position before updating (max 4 trail points)
      if (p.trail.length >= 4) p.trail.shift();
      p.trail.push({ x: p.x, y: p.y, opacity: p.opacity });

      // Physics: air resistance + gravity
      p.vx *= AIR_RESISTANCE;
      p.vy *= AIR_RESISTANCE;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += GRAVITY * dt;
      p.rotation += p.rotationSpeed * dt;
      p.age += dt;
      p.opacity -= dt / LIFETIME;
      // Scale shrinks over lifetime (starts big, ends tiny)
      p.scale = Math.max(0.2, p.scale - dt * 1.2);

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
