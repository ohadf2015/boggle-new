/**
 * BackgroundGlow Primitive
 *
 * Radial gradient background glow used across all cinematics.
 */

import React from 'react';

export interface BackgroundGlowProps {
  /** Hex color for the glow */
  color: string;
  /** Opacity of the glow layer (0-1) */
  opacity: number;
  /** Glow intensity - controls alpha channel of gradient center (default: '22') */
  intensity?: string;
  /** How far the glow spreads before fading (default: '70%') */
  spread?: string;
}

export const BackgroundGlow: React.FC<BackgroundGlowProps> = ({
  color,
  opacity,
  intensity = '22',
  spread = '70%',
}) => (
  <div
    data-testid="background-glow"
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle at 50% 50%, ${color}${intensity}, transparent ${spread})`,
      opacity,
    }}
  />
);

BackgroundGlow.displayName = 'BackgroundGlow';
