/**
 * Confetti Primitive
 *
 * Victory confetti celebration from BossDefeatCinematic.
 * Deterministic via pre-generated particle array.
 */

import React from 'react';
import { interpolate } from 'remotion';

export interface ConfettiParticle {
  x: number;
  y: number;
  color: string;
  speed: number;
  wobble: number;
  delay: number;
}

export interface ConfettiProps {
  /** Pre-generated confetti particles */
  particles: ConfettiParticle[];
  /** Current frame (relative to sequence start) */
  frame: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ particles, frame }) => (
  <>
    {particles.map((p, i) => {
      const adjustedFrame = Math.max(0, frame - p.delay);
      const yOffset = adjustedFrame * p.speed;
      const xWobble = Math.sin(adjustedFrame * 0.1 + p.wobble) * 30;
      const rotation = adjustedFrame * 5;
      const opacity = interpolate(yOffset, [0, 500], [1, 0], {
        extrapolateRight: 'clamp',
      });

      return (
        <div
          key={`confetti-${i}`}
          data-testid="confetti-piece"
          style={{
            position: 'absolute',
            left: p.x + xWobble,
            top: p.y + yOffset,
            width: 10,
            height: 6,
            backgroundColor: p.color,
            transform: `rotate(${rotation}deg)`,
            opacity,
            pointerEvents: 'none',
          }}
        />
      );
    })}
  </>
);

Confetti.displayName = 'Confetti';
