/**
 * TitleReveal Primitive
 *
 * Animated title text with spring scale and optional pulse.
 * Common pattern across all cinematics for headline moments.
 */

import React from 'react';
import { spring, interpolate, useVideoConfig } from 'remotion';
import { fredokaFamily } from '../fonts';

export interface TitleRevealProps {
  /** Title text (translated) */
  text: string;
  /** Text color (hex) */
  color: string;
  /**
   * Font size in px. When omitted, scales responsively based on
   * useVideoConfig().width at 7% of composition width (capped at 1280px basis).
   */
  fontSize?: number;
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
  const { width } = useVideoConfig();

  // Scale font size with composition width when not explicitly provided.
  // 7% of width gives ~90px at 1280px (standard) and ~27px at 390px (portrait mobile).
  const resolvedFontSize = fontSize ?? Math.round(width * 0.07);

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
        data-testid="title-text"
        style={{
          fontFamily: fredokaFamily,
          fontSize: resolvedFontSize,
          fontWeight: 700,
          color,
          textShadow: `
            ${Math.max(4, resolvedFontSize / 16)}px ${Math.max(4, resolvedFontSize / 16)}px 0 black,
            -${Math.max(2, resolvedFontSize / 32)}px -${Math.max(2, resolvedFontSize / 32)}px 0 black,
            0 0 ${Math.max(30, resolvedFontSize / 3)}px ${color}
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
