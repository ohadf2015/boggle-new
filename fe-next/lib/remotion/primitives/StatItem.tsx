/**
 * StatItem Primitive
 *
 * Single stat row used in stats panels (Victory, Defeat cinematics).
 * Animates in with spring reveal and horizontal slide.
 */

import React from 'react';
import { spring } from 'remotion';
import { fredokaFamily, rubikFamily } from '../fonts';

export interface StatItemProps {
  /** Stat label text (translated) */
  label: string;
  /** Stat value */
  value: number | string;
  /** Frame delay before reveal starts */
  delay: number;
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Label text color (default: '#FFE135') */
  labelColor?: string;
}

export const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  delay,
  frame,
  fps,
  labelColor = '#FFE135',
}) => {
  const reveal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <div
      data-testid="stat-item"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '2px solid #333',
        opacity: reveal,
        transform: `translateX(${(1 - reveal) * 30}px)`,
      }}
    >
      <span
        style={{
          fontFamily: rubikFamily,
          fontSize: 24,
          color: labelColor,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: fredokaFamily,
          fontSize: 28,
          fontWeight: 700,
          color: 'white',
        }}
      >
        {value}
      </span>
    </div>
  );
};

StatItem.displayName = 'StatItem';
