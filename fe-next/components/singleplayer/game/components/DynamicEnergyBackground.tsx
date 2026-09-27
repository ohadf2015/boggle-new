'use client';

import React from 'react';
import { Circle, Triangle, Square, Sparkles } from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

const DELAY_1S_STYLE = { animationDelay: '1s' } as const;
const DELAY_2S_STYLE = { animationDelay: '2s' } as const;
const DELAY_3S_STYLE = { animationDelay: '3s' } as const;

/**
 * DynamicEnergyBackground - Animated background for Single Player mode
 * Features vortex rotation, aurora waves, floating particles, and scanlines.
 *
 * Self-gates on device capability: the 200%×200% rotating vortex layer is a
 * dominant GPU compositor cost. On low-end Android / reduced-motion sessions
 * the layer combo would keep repainting while the player drags on the grid,
 * showing up as drag-selection stutter. Returns null in those cases.
 */
export function DynamicEnergyBackground(): React.ReactElement | null {
  const { isLowEnd, prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  if (isLowEnd || prefersReducedMotion || !enableComplexAnimations) return null;

  return (
    <>
      {/* Vortex Layer - Slow rotating radial gradient */}
      <div
        className="energy-vortex-layer"
        aria-hidden="true"
      />

      {/* Aurora Layer - Vertical wave animation */}
      <div
        className="energy-aurora-layer"
        aria-hidden="true"
      />

      {/* Scanline Overlay - Subtle CRT effect */}
      <div
        className="energy-scanline-layer z-50"
        aria-hidden="true"
      />

      {/* Floating Particles */}
      <Circle
        className="absolute top-1/4 left-10 text-cyan-400 w-5 h-5 animate-particle-float opacity-20"
        aria-hidden="true"
      />
      <Triangle
        className="absolute top-1/2 right-12 text-pink-400 w-4 h-4 animate-particle-float opacity-20"
        style={DELAY_1S_STYLE}
        aria-hidden="true"
      />
      <Square
        className="absolute bottom-1/4 left-20 text-lime-400 w-3 h-3 animate-particle-float opacity-20"
        style={DELAY_2S_STYLE}
        aria-hidden="true"
      />
      <Sparkles
        className="absolute top-20 right-1/4 text-white w-4 h-4 animate-particle-float opacity-20"
        style={DELAY_3S_STYLE}
        aria-hidden="true"
      />
    </>
  );
}
