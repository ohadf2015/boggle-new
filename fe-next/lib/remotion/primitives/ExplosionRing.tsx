/**
 * ExplosionRing Primitive
 *
 * Expanding ring effect for impact moments.
 * Extracted from BossDefeatCinematic.
 */

import React from 'react';
import { interpolate } from 'remotion';

export interface ExplosionRingProps {
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Ring color (hex) */
  color: string;
  /** Frame delay before ring starts expanding */
  delay: number;
  /** Base ring size in px */
  size: number;
}

export const ExplosionRing: React.FC<ExplosionRingProps> = ({
  frame,
  color,
  delay,
  size,
}) => {
  const adjustedFrame = Math.max(0, frame - delay);
  const progress = interpolate(adjustedFrame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = 1 + progress * 3;
  const opacity = 1 - progress;
  const ringSize = size * scale;

  return (
    <div
      data-testid="explosion-ring"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: ringSize,
        height: ringSize,
        marginLeft: -ringSize / 2,
        marginTop: -ringSize / 2,
        borderRadius: '50%',
        border: `6px solid ${color}`,
        opacity,
        boxShadow: `
          0 0 20px ${color},
          inset 0 0 20px ${color}44
        `,
        pointerEvents: 'none',
      }}
    />
  );
};

ExplosionRing.displayName = 'ExplosionRing';
