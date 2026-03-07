/**
 * SparkleField Primitive
 *
 * Scattered sparkle particles for cinematic ambiance.
 * Uses seeded random for deterministic Remotion rendering.
 * (Fixes the original non-seeded pseudo-random in Victory/Defeat cinematics.)
 */

import React, { useMemo } from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { createSeededRandom } from '../utils/seededRandom';

export interface SparkleFieldProps {
  /** Number of sparkles */
  count: number;
  /** Sparkle color (hex) */
  color: string;
  /** PRNG seed for deterministic placement */
  seed: number;
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Glow shadow color (defaults to same as color) */
  glowColor?: string;
  /** Sparkle size in px (default: 4) */
  size?: number;
  /** Max opacity (default: 0.8) */
  maxOpacity?: number;
  /** Fade-in duration in frames (default: 30) */
  fadeInFrames?: number;
}

export const SparkleField: React.FC<SparkleFieldProps> = ({
  count,
  color,
  seed,
  frame,
  glowColor,
  size = 4,
  maxOpacity = 0.8,
  fadeInFrames = 30,
}) => {
  const { width } = useVideoConfig();

  // Scale sparkle count proportionally with composition width.
  // Fewer sparkles on smaller screens reduces visual density and GPU overdraw.
  const scale = Math.min(1, width / 1280);
  const scaledCount = Math.round(count * scale);

  const sparkles = useMemo(() => {
    const rand = createSeededRandom(seed);
    return Array.from({ length: scaledCount }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      delay: Math.floor(rand() * 20),
    }));
  }, [scaledCount, seed]);

  const glow = glowColor ?? color;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {sparkles.map((s) => {
        const opacity = interpolate(
          frame - s.delay,
          [0, fadeInFrames],
          [0, maxOpacity],
          { extrapolateRight: 'clamp' },
        );

        return (
          <div
            key={s.id}
            data-testid="sparkle"
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
              opacity,
              boxShadow: `0 0 ${size * 2.5}px ${glow}`,
            }}
          />
        );
      })}
    </div>
  );
};

SparkleField.displayName = 'SparkleField';
