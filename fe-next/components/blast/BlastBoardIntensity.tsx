'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';

interface BlastBoardIntensityProps {
  intensity: number;
  children: React.ReactNode;
}

// Subtler glow — AAA games use gentle ambient borders, not aggressive box-shadows
const GLOW_CONFIG: Record<number, { boxShadow: string; pulseDuration: string }> = {
  1: { boxShadow: '0 0 6px rgba(0,255,255,0.08)', pulseDuration: '4s' },
  2: { boxShadow: '0 0 8px rgba(0,255,255,0.12)', pulseDuration: '3s' },
  3: { boxShadow: '0 0 12px rgba(255,225,53,0.15)', pulseDuration: '2.5s' },
  4: { boxShadow: '0 0 15px rgba(255,107,53,0.2)', pulseDuration: '2s' },
  5: { boxShadow: '0 0 18px rgba(255,107,53,0.25)', pulseDuration: '1.5s' },
};

// Lighter vignette — enough to frame the board without darkening gameplay
const VIGNETTE_CONFIG: Record<number, { base: number; peak: number }> = {
  2: { base: 0.15, peak: 0.15 },
  3: { base: 0.2, peak: 0.2 },
  4: { base: 0.25, peak: 0.3 },
  5: { base: 0.3, peak: 0.4 },
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
@keyframes blast-vignette-pulse {
  0%, 100% { opacity: var(--vignette-base); }
  50% { opacity: var(--vignette-peak); }
}
`;


export default function BlastBoardIntensity({ intensity, children }: BlastBoardIntensityProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className="relative" data-testid="blast-board-intensity">{children}</div>;
  }

  const clampedIntensity = Math.min(Math.max(Math.round(intensity), 0), 5);
  const glow = GLOW_CONFIG[clampedIntensity];
  const vignette = VIGNETTE_CONFIG[clampedIntensity] ?? VIGNETTE_CONFIG[Math.min(clampedIntensity, 5)];
  const showGlow = clampedIntensity >= 1;
  const showVignette = clampedIntensity >= 3; // Raised threshold — vignette only at high intensity
  const vignetteAnimated = clampedIntensity >= 5; // Only pulse at max

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

      {/* Corner flares removed — too subtle to notice, but added DOM noise */}

      {children}
    </div>
  );
}
