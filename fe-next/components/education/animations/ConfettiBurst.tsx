'use client';

/**
 * ConfettiBurst — canvas confetti explosion on lesson completion
 *
 * Renders a fixed full-screen canvas overlay (pointer-events-none, z-9999).
 * Animation fires when `trigger` transitions to true; auto-clears when all
 * particles fade. Gravity (vy += 0.4 per frame) and rotation give each
 * rectangle a natural tumble.
 *
 * Zero dependencies. Respects prefers-reduced-motion.
 */

import { useRef, useEffect } from 'react';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
  rotation: number;
  rv: number;
}

// Neo-brutalist celebration palette
const DEFAULT_COLORS = ['#FFE135', '#FF6B35', '#00FFFF', '#FF1493', '#6bcb77'];

interface ConfettiBurstProps {
  trigger: boolean;
  particleCount?: number;
  colors?: string[];
  className?: string;
}

export function ConfettiBurst({
  trigger,
  particleCount = 60,
  colors = DEFAULT_COLORS,
  className = '',
}: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Skip animation for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Burst from screen centre — works regardless of scroll position
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const particles: ConfettiParticle[] = Array.from(
      { length: particleCount },
      () => ({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 18,
        vy: Math.random() * -20 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        size: Math.random() * 7 + 4,
        rotation: Math.random() * 360,
        rv: (Math.random() - 0.5) * 12,
      })
    );

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.life -= 0.014;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.rotation += p.rv;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        // Rectangular confetti piece (aspect ratio 1:0.6)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      if (alive) rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger, particleCount, colors]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-canvas"
      className={`pointer-events-none fixed inset-0 z-60 ${className}`}
    />
  );
}
