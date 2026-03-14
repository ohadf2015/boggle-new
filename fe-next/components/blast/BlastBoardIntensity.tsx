'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';

interface BlastBoardIntensityProps {
  intensity: number;
  children: React.ReactNode;
}

const GLOW_CONFIG: Record<number, { boxShadow: string; pulseDuration: string }> = {
  1: { boxShadow: '0 0 8px rgba(0,255,255,0.15)', pulseDuration: '3s' },
  2: { boxShadow: '0 0 15px rgba(0,255,255,0.25)', pulseDuration: '2s' },
  3: { boxShadow: '0 0 20px rgba(255,225,53,0.3), 0 0 40px rgba(255,225,53,0.1)', pulseDuration: '1.5s' },
  4: { boxShadow: '0 0 25px rgba(255,107,53,0.35), 0 0 50px rgba(255,20,147,0.15)', pulseDuration: '1s' },
  5: { boxShadow: '0 0 30px rgba(255,107,53,0.4), 0 0 60px rgba(255,20,147,0.2)', pulseDuration: '0.5s' },
};

const VIGNETTE_CONFIG: Record<number, { base: number; peak: number }> = {
  2: { base: 0.3, peak: 0.3 },
  3: { base: 0.4, peak: 0.4 },
  4: { base: 0.4, peak: 0.6 },
  5: { base: 0.5, peak: 0.7 },
};

const KEYFRAMES_STYLE = `
@keyframes blast-border-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes blast-rainbow-border {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
@keyframes blast-corner-flare {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.5); opacity: 0.8; }
}
@keyframes blast-vignette-pulse {
  0%, 100% { opacity: var(--vignette-base); }
  50% { opacity: var(--vignette-peak); }
}
`;

const CORNER_POSITIONS = [
  { top: 0, left: 0 },
  { top: 0, right: 0 },
  { bottom: 0, left: 0 },
  { bottom: 0, right: 0 },
] as const;

export default function BlastBoardIntensity({ intensity, children }: BlastBoardIntensityProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className="relative" data-testid="blast-board-intensity">{children}</div>;
  }

  const clampedIntensity = Math.min(Math.max(Math.round(intensity), 0), 5);
  const glow = GLOW_CONFIG[clampedIntensity];
  const vignette = VIGNETTE_CONFIG[clampedIntensity] ?? VIGNETTE_CONFIG[Math.min(clampedIntensity, 5)];
  const showGlow = clampedIntensity >= 1;
  const showVignette = clampedIntensity >= 2;
  const showCornerFlares = clampedIntensity >= 3;
  const vignetteAnimated = clampedIntensity >= 4;

  return (
    <div className="relative" data-testid="blast-board-intensity">
      <style>{KEYFRAMES_STYLE}</style>

      {showGlow && glow && (
        <div
          data-testid="blast-border-glow"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            boxShadow: clampedIntensity === 5
              ? glow.boxShadow
              : glow.boxShadow,
            animation: clampedIntensity === 5
              ? `blast-border-pulse ${glow.pulseDuration} ease-in-out infinite, blast-rainbow-border 2s linear infinite`
              : `blast-border-pulse ${glow.pulseDuration} ease-in-out infinite`,
            pointerEvents: 'none' as const,
            zIndex: 10,
          }}
        />
      )}

      {showVignette && vignette && (
        <div
          data-testid="blast-vignette"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
            opacity: vignette.base,
            animation: vignetteAnimated
              ? `blast-vignette-pulse 2s ease-in-out infinite`
              : undefined,
            ['--vignette-base' as string]: vignette.base,
            ['--vignette-peak' as string]: vignette.peak,
            pointerEvents: 'none' as const,
            zIndex: 10,
          }}
        />
      )}

      {showCornerFlares && (
        <div data-testid="blast-corner-flares" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' as const, zIndex: 10 }}>
          {CORNER_POSITIONS.map((pos, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                ...pos,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: clampedIntensity >= 5
                  ? 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,200,50,0.4))'
                  : 'radial-gradient(circle, rgba(255,255,255,0.7), rgba(255,225,53,0.3))',
                boxShadow: clampedIntensity >= 5
                  ? '0 0 12px rgba(255,200,50,0.6)'
                  : '0 0 6px rgba(255,225,53,0.4)',
                animation: `blast-corner-flare ${clampedIntensity >= 5 ? '0.8s' : '1.5s'} ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
