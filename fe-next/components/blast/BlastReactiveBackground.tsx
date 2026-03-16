'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

interface BlastReactiveBackgroundProps {
  /** Game intensity 0-5 */
  intensity: number;
}

import { NEBULA_COLORS, BACKGROUND_PARTICLE_COLORS as PARTICLE_COLORS } from './blastColorTokens';

function getNebulaColor(intensity: number): string {
  return NEBULA_COLORS[Math.min(Math.max(Math.round(intensity), 0), 5)] ?? NEBULA_COLORS[0];
}

/** Secondary nebula color for dual-glow effect at high intensity */
function getNebulaSecondaryColor(intensity: number): string {
  const SECONDARY: Record<number, string> = {
    0: 'transparent', 1: 'transparent', 2: 'transparent',
    3: '#1a0a3e', 4: '#4a0e4e', 5: '#ff1493',
  };
  return SECONDARY[Math.min(Math.max(Math.round(intensity), 0), 5)] ?? 'transparent';
}

// More particles earlier — creates more atmosphere at lower intensities
function getParticleCount(intensity: number): number {
  if (intensity < 2) return 0;
  if (intensity < 3) return 3;
  if (intensity < 5) return 7;
  return 12;
}

function getGridOpacity(intensity: number): number {
  return 0.03 + (Math.min(intensity, 5) - 1) * 0.015;
}

function getNebulaSpeed(intensity: number): string {
  const base = 25;
  const speed = base - intensity * 3;
  return `${Math.max(speed, 8)}s`;
}

export function BlastReactiveBackground({ intensity }: BlastReactiveBackgroundProps): React.ReactElement {
  const reducedMotion = useReducedMotion();
  const prevIntensityRef = useRef(intensity);
  const pulseRef = useRef<HTMLDivElement>(null);

  // Memoize by particle COUNT TIER (0/3/7/12) not raw intensity.
  // Prevents DOM node destruction/recreation on every intensity integer change,
  // which was resetting CSS animations mid-cycle and causing visual discontinuity.
  const particleCount = getParticleCount(intensity);
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
      const size = 2 + (i % 4); // Slightly larger range
      const left = (i * 7 + 5) % 100;
      const delay = (i * 1.1) % 6;
      const duration = 6 + (i % 5) * 2; // Faster rise
      // Sine-wave drift for organic floating motion
      const drift = ((i % 2 === 0 ? 1 : -1) * (15 + (i % 4) * 8));
      const opacity = 0.2 + (i % 4) * 0.1;
      return { color, size, left, delay, duration, drift, opacity, key: i };
    });
  }, [particleCount]);

  // Energy pulse ring when intensity increases
  // Track timer IDs for cleanup on unmount (prevents DOM node leaks in long sessions)
  const pulseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (reducedMotion) return;
    if (intensity > prevIntensityRef.current && pulseRef.current) {
      const ring = document.createElement('div');
      ring.className = 'blast-energy-pulse-ring';
      pulseRef.current.appendChild(ring);
      const timerId = setTimeout(() => ring.remove(), 1200);
      pulseTimersRef.current.push(timerId);
    }
    prevIntensityRef.current = intensity;
  }, [intensity, reducedMotion]);

  // Cleanup all pulse rings + timers on unmount
  useEffect(() => {
    const timers = pulseTimersRef.current;
    const pulseEl = pulseRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
      // Remove any lingering pulse ring DOM nodes
      if (pulseEl) {
        while (pulseEl.firstChild) {
          pulseEl.removeChild(pulseEl.firstChild);
        }
      }
    };
  }, []);

  const gridOpacity = intensity >= 1 ? getGridOpacity(intensity) : 0;
  const secondaryColor = getNebulaSecondaryColor(intensity);

  return (
    <div
      data-testid="blast-reactive-bg"
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ contain: 'strict' }}
    >
      {/* Layer 1: Primary nebula glow */}
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

      {/* Layer 1b: Secondary nebula (offset, counter-rotates) — creates depth at high intensity */}
      {!reducedMotion && intensity >= 3 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-[50vmax] h-[50vmax] rounded-full"
            style={{
              background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 60%)`,
              filter: 'blur(60px)',
              opacity: 0.5,
              willChange: 'transform',
              animation: `blast-nebula-drift-reverse ${getNebulaSpeed(intensity)} ease-in-out infinite`,
            }}
          />
        </div>
      )}

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

      {/* Layer 3: Ambient particles — now appears earlier for more atmosphere */}
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
                filter: `blur(${p.size > 4 ? 3 : 1}px)`,
                willChange: 'transform, opacity',
                animation: `blast-particle-rise-wave ${p.duration}s linear ${p.delay}s infinite`,
                ['--particle-opacity' as string]: p.opacity,
                ['--drift' as string]: `${p.drift}px`,
                ['--wave-amp' as string]: `${8 + (p.key % 3) * 4}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Layer 4: Energy pulse container — rings spawn on intensity increase */}
      {!reducedMotion && (
        <div
          ref={pulseRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes blast-nebula-drift {
          0% { transform: translate(-10%, -10%) scale(1); }
          33% { transform: translate(10%, 5%) scale(1.1); }
          66% { transform: translate(-5%, 10%) scale(0.95); }
          100% { transform: translate(-10%, -10%) scale(1); }
        }

        @keyframes blast-nebula-drift-reverse {
          0% { transform: translate(8%, 8%) scale(0.95); }
          33% { transform: translate(-8%, -3%) scale(1.05); }
          66% { transform: translate(4%, -8%) scale(1); }
          100% { transform: translate(8%, 8%) scale(0.95); }
        }

        @keyframes blast-grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes blast-particle-rise-wave {
          0% { transform: translateY(100vh) translateX(0); opacity: 0; }
          5% { opacity: var(--particle-opacity); }
          25% { transform: translateY(75vh) translateX(var(--wave-amp)); }
          50% { transform: translateY(50vh) translateX(calc(var(--drift) * -0.5)); }
          75% { transform: translateY(25vh) translateX(var(--wave-amp)); }
          90% { opacity: var(--particle-opacity); }
          100% { transform: translateY(-20px) translateX(var(--drift)); opacity: 0; }
        }

        :global(.blast-energy-pulse-ring) {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid rgba(0, 255, 255, 0.6);
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1);
          animation: blast-energy-pulse 1.2s ease-out forwards;
          pointer-events: none;
        }

        @keyframes blast-energy-pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default BlastReactiveBackground;
