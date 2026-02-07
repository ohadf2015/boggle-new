/**
 * TitleReveal Primitive
 *
 * Animated title text with spring scale and optional pulse.
 * Common pattern across all cinematics for headline moments.
 */

import React from 'react';
import { spring, interpolate } from 'remotion';
import { fredokaFamily } from '../fonts';

export interface TitleRevealProps {
  /** Title text (translated) */
  text: string;
  /** Text color (hex) */
  color: string;
  /** Font size in px */
  fontSize: number;
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Frame offset before animation starts (default: 0) */
  startFrame?: number;
  /** Spring config override */
  springConfig?: { damping: number; stiffness: number };
  /** Letter spacing (default: '0.1em') */
  letterSpacing?: string;
}

export const TitleReveal: React.FC<TitleRevealProps> = ({
  text,
  color,
  fontSize,
  frame,
  fps,
  startFrame = 0,
  springConfig = { damping: 10, stiffness: 100 },
  letterSpacing = '0.1em',
}) => {
  const adjustedFrame = frame - startFrame;

  const scale = spring({
    frame: adjustedFrame,
    fps,
    config: springConfig,
  });

  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      data-testid="title-reveal"
      style={{
        textAlign: 'center',
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <h1
        style={{
          fontFamily: fredokaFamily,
          fontSize,
          fontWeight: 700,
          color,
          textShadow: `
            ${Math.max(4, fontSize / 16)}px ${Math.max(4, fontSize / 16)}px 0 black,
            -${Math.max(2, fontSize / 32)}px -${Math.max(2, fontSize / 32)}px 0 black,
            0 0 ${Math.max(30, fontSize / 3)}px ${color}
          `,
          letterSpacing,
          margin: 0,
        }}
      >
        {text}
      </h1>
    </div>
  );
};

TitleReveal.displayName = 'TitleReveal';
