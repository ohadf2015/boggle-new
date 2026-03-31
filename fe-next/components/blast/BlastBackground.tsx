'use client';

import { useMemo } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { NEBULA_COLORS, BACKGROUND_PARTICLE_COLORS } from './blastColorTokens';

interface BlastBackgroundProps {
  /** Chain intensity level 0-5 */
  intensity: number;
}

const PARTICLE_COUNT = 10;

/**
 * BlastBackground — reactive radial-gradient background that shifts
 * through NEBULA_COLORS based on chain intensity, with floating ambient dots.
 */
export function BlastBackground({ intensity }: BlastBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clampedIntensity = Math.min(5, Math.max(0, Math.round(intensity)));

  const nebulaColor = NEBULA_COLORS[clampedIntensity] ?? NEBULA_COLORS[0];
  const bgStyle = useMemo(() => ({
    background: `radial-gradient(ellipse at 50% 40%, ${nebulaColor} 0%, #0a0a1a 80%)`,
    transition: 'background 0.5s ease',
  }), [nebulaColor]);

  // Pre-compute particle positions/delays deterministically
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const color = BACKGROUND_PARTICLE_COLORS[i % BACKGROUND_PARTICLE_COLORS.length];
      // Spread across the container using a golden-ratio-ish distribution
      const left = ((i * 37 + 13) % 100);
      const top = ((i * 53 + 7) % 100);
      const size = 2 + (i % 3);
      const delay = (i * 0.7) % 5;
      const duration = 4 + (i % 4);
      return { color, left, top, size, delay, duration };
    });
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={bgStyle}
      data-testid="blast-background"
      aria-hidden="true"
    >
      {!reducedMotion && particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full blast-ambient-dot"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: 0.4,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
