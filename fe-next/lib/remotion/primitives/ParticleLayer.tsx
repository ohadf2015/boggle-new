/**
 * ParticleLayer Primitive
 *
 * Decorative rising particle layer for cinematics.
 * Uses seeded random for deterministic rendering.
 */

import React, { useMemo } from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { generateParticleArray } from '../utils/seededRandom';

export interface ParticleLayerProps {
  /** Number of particles */
  count: number;
  /** Particle color (hex) */
  color: string;
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** PRNG seed (default: 42) */
  seed?: number;
  /** [min, max] particle size (default: [4, 12]) */
  sizeRange?: [number, number];
}

export const ParticleLayer: React.FC<ParticleLayerProps> = ({
  count,
  color,
  frame,
  width,
  height,
  seed = 42,
  sizeRange = [4, 12],
}) => {
  const { width: compositionWidth } = useVideoConfig();

  // Scale particle count proportionally with composition width.
  // Fewer particles on smaller screens avoids overdraw and improves performance.
  const scale = Math.min(1, compositionWidth / 1280);
  const scaledCount = Math.round(count * scale);

  const particles = useMemo(
    () => generateParticleArray(scaledCount, width, height, seed, sizeRange),
    [scaledCount, width, height, seed, sizeRange],
  );

  return (
    <>
      {particles.map((p) => {
        const adjustedFrame = Math.max(0, frame - p.delay);
        const opacity = interpolate(adjustedFrame, [0, 30], [0, 0.8], {
          extrapolateRight: 'clamp',
        });
        const yOffset = adjustedFrame * p.speed;
        const fadeOut = 1 - yOffset / height;

        if (fadeOut <= 0) return null;

        return (
          <div
            key={p.id}
            data-testid="particle"
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y - yOffset,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: opacity * Math.max(0, fadeOut),
              boxShadow: `0 0 ${p.size}px ${color}`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
};

ParticleLayer.displayName = 'ParticleLayer';
