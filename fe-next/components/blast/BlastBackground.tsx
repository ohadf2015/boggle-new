'use client';

import { useMemo } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { NEBULA_COLORS } from './blastColorTokens';

interface BlastBackgroundProps {
  /** Chain intensity level 0-5 */
  intensity: number;
}

const DUST_PARTICLE_COUNT = 15;

/** Gold dust particle colors for treasure vault atmosphere */
const GOLD_DUST_COLORS = ['#FFD700', '#BFFF00', '#00FFFF', '#FFE566', '#FFC800'];

/**
 * BlastBackground — AAA "Treasure Vault" atmosphere.
 * Deep indigo-purple radial gradient with volumetric light rays,
 * golden dust particles, and reactive nebula glow on chain intensity.
 */
export function BlastBackground({ intensity }: BlastBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clampedIntensity = Math.min(5, Math.max(0, Math.round(intensity)));

  const nebulaColor = NEBULA_COLORS[clampedIntensity] ?? NEBULA_COLORS[0];
  const bgStyle = useMemo(() => ({
    background: `
      radial-gradient(ellipse at 50% 30%, ${nebulaColor}44 0%, transparent 60%),
      radial-gradient(ellipse at 50% 50%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)
    `,
    transition: 'background 0.6s ease',
  }), [nebulaColor]);

  // Gold dust particles — slow floating specks
  const dustParticles = useMemo(() => {
    return Array.from({ length: DUST_PARTICLE_COUNT }, (_, i) => {
      const color = GOLD_DUST_COLORS[i % GOLD_DUST_COLORS.length];
      const left = ((i * 37 + 13) % 100);
      const top = ((i * 53 + 7) % 100);
      const size = 1.5 + (i % 3) * 0.5;
      const delay = (i * 1.3) % 8;
      const duration = 8 + (i % 6) * 2;
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
      {/* Volumetric light rays from top corners */}
      {!reducedMotion && (
        <>
          <div
            className="absolute top-0 left-0 w-1/2 h-3/4 opacity-[0.06]"
            style={{
              background: 'linear-gradient(160deg, rgba(255,215,0,0.4) 0%, transparent 60%)',
              filter: 'blur(30px)',
            }}
          />
          <div
            className="absolute top-0 right-0 w-1/3 h-2/3 opacity-[0.04]"
            style={{
              background: 'linear-gradient(200deg, rgba(0,255,255,0.3) 0%, transparent 50%)',
              filter: 'blur(25px)',
            }}
          />
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-2/3 h-1/3 opacity-[0.03]"
            style={{
              background: 'radial-gradient(ellipse, rgba(191,255,0,0.3) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </>
      )}

      {/* Gold dust floating particles */}
      {!reducedMotion && dustParticles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full blast-ambient-dot"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: 0.35,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
