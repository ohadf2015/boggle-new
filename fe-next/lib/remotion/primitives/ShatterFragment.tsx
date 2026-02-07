/**
 * ShatterFragment Primitive
 *
 * Individual shattering fragment for defeat/destruction effects.
 * Extracted from BossDefeatCinematic.
 */

import React from 'react';
import { interpolate } from 'remotion';

export interface ShatterFragmentProps {
  /** Initial X position */
  x: number;
  /** Initial Y position */
  y: number;
  /** Fragment size in px */
  size: number;
  /** Direction angle in radians */
  rotation: number;
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Fragment color (hex) */
  color: string;
}

export const ShatterFragment: React.FC<ShatterFragmentProps> = ({
  x,
  y,
  size,
  rotation,
  frame,
  color,
}) => {
  const progress = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const xOffset = Math.cos(rotation) * progress * 400;
  const yOffset = Math.sin(rotation) * progress * 400 + progress * progress * 300;
  const scale = interpolate(progress, [0, 0.5, 1], [1, 1.2, 0]);
  const opacity = interpolate(progress, [0, 0.7, 1], [1, 0.8, 0]);
  const spin = rotation + progress * 720;

  return (
    <div
      data-testid="shatter-fragment"
      style={{
        position: 'absolute',
        left: x + xOffset,
        top: y + yOffset,
        width: size,
        height: size,
        transform: `scale(${scale}) rotate(${spin}deg)`,
        opacity,
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${color}`,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        pointerEvents: 'none',
      }}
    />
  );
};

ShatterFragment.displayName = 'ShatterFragment';
