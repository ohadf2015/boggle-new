/**
 * FlashEffect Primitive
 *
 * White screen flash for impact moments.
 * Should be rendered inside a Remotion Sequence for timing control.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';

export interface FlashEffectProps {
  /** Flash brightness (0-1) */
  intensity: number;
}

export const FlashEffect: React.FC<FlashEffectProps> = ({ intensity }) => (
  <AbsoluteFill
    data-testid="flash-effect"
    style={{
      backgroundColor: 'white',
      opacity: intensity,
    }}
  />
);

FlashEffect.displayName = 'FlashEffect';
