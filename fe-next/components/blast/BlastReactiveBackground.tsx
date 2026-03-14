'use client';

import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

interface BlastReactiveBackgroundProps {
  /** Game intensity 0-5 */
  intensity: number;
}

import { NEBULA_COLORS, BACKGROUND_PARTICLE_COLORS as PARTICLE_COLORS } from './blastColorTokens';

function getNebulaColor(intensity: number): string {
  return NEBULA_COLORS[Math.min(Math.max(Math.round(intensity), 0), 5)] ?? NEBULA_COLORS[0];
}

function getParticleCount(intensity: number): number {
  if (intensity < 2) return 0;
  if (intensity < 3) return 8;
  if (intensity < 5) return 12;
  return 15;
}

function getGridOpacity(intensity: number): number {
  return 0.03 + (Math.min(intensity, 5) - 1) * 0.0125;
}

function getNebulaSpeed(intensity: number): string {
  const base = 30;
  const speed = base - intensity * 4;
  return `${Math.max(speed, 10)}s`;
}

export function BlastReactiveBackground({ intensity }: BlastReactiveBackgroundProps): React.ReactElement {
  const reducedMotion = useReducedMotion();

  const particles = useMemo(() => {
    const count = getParticleCount(intensity);
    return Array.from({ length: count }, (_, i) => {
      const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
      const size = 2 + (i % 3);
      const left = (i * 7 + 5) % 100;
      const delay = (i * 1.3) % 8;
      const duration = 8 + (i % 5) * 2;
      const drift = ((i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 5));
      const opacity = 0.15 + (i % 4) * 0.08;
      return { color, size, left, delay, duration, drift, opacity, key: i };
    });
  }, [intensity]);

  const gridOpacity = intensity >= 1 ? getGridOpacity(intensity) : 0;
  const waveDuration = intensity >= 5 ? '1s' : '2s';

  return (
    <div
      data-testid="blast-reactive-bg"
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ contain: 'strict' }}
    >
      {/* Layer 1: Nebula glow */}
      <div
        data-testid="blast-nebula"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="w-[70vmax] h-[70vmax] rounded-full"
          style={{
            background: `radial-gradient(circle, ${getNebulaColor(intensity)} 0%, transparent 70%)`,
            filter: 'blur(80px)',
            willChange: reducedMotion ? undefined : 'transform, opacity',
            animation: reducedMotion ? 'none' : `blast-nebula-drift ${getNebulaSpeed(intensity)} ease-in-out infinite`,
          }}
        />
      </div>

      {/* Layer 2: Grid lines */}
      {!reducedMotion && intensity >= 1 && (
        <div
          data-testid="blast-grid"
          className="absolute inset-0"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 59px,
                rgba(0,255,255,${gridOpacity}) 59px,
                rgba(0,255,255,${gridOpacity}) 60px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 59px,
                rgba(0,255,255,${gridOpacity}) 59px,
                rgba(0,255,255,${gridOpacity}) 60px
              )
            `,
            animation: `blast-grid-pulse ${3 - intensity * 0.3}s ease-in-out infinite`,
            willChange: 'opacity',
          }}
        />
      )}

      {/* Layer 3: Ambient particles */}
      {!reducedMotion && intensity >= 2 && (
        <div data-testid="blast-particles" className="absolute inset-0">
          {particles.map((p) => (
            <div
              key={p.key}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.left}%`,
                bottom: '-10px',
                backgroundColor: p.color,
                filter: 'blur(2px)',
                willChange: 'transform, opacity',
                animation: `blast-particle-rise ${p.duration}s linear ${p.delay}s infinite`,
                ['--particle-opacity' as string]: p.opacity,
                ['--drift' as string]: `${p.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 4: Energy waves */}
      {!reducedMotion && intensity >= 4 && (
        <div
          data-testid="blast-waves"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="w-[100px] h-[100px] rounded-full border border-cyan-400/30"
            style={{
              willChange: 'transform, opacity',
              animation: `blast-energy-wave ${waveDuration} ease-out infinite`,
            }}
          />
          <div
            className="absolute w-[100px] h-[100px] rounded-full border border-pink-400/20"
            style={{
              willChange: 'transform, opacity',
              animation: `blast-energy-wave ${waveDuration} ease-out 0.5s infinite`,
            }}
          />
        </div>
      )}

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes blast-nebula-drift {
          0% { transform: translate(-10%, -10%) scale(1); }
          33% { transform: translate(10%, 5%) scale(1.1); }
          66% { transform: translate(-5%, 10%) scale(0.95); }
          100% { transform: translate(-10%, -10%) scale(1); }
        }

        @keyframes blast-grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes blast-particle-rise {
          0% { transform: translateY(100vh) translateX(0); opacity: 0; }
          10% { opacity: var(--particle-opacity); }
          90% { opacity: var(--particle-opacity); }
          100% { transform: translateY(-20px) translateX(var(--drift)); opacity: 0; }
        }

        @keyframes blast-energy-wave {
          0% { transform: scale(0); opacity: 0.3; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default BlastReactiveBackground;
