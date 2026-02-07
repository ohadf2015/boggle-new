/**
 * StatsPanel Primitive
 *
 * Container panel for StatItem rows.
 * Shared between Victory and Defeat cinematics.
 */

import React from 'react';
import { spring } from 'remotion';

export interface StatsPanelProps {
  /** Border color for the panel (hex) */
  borderColor: string;
  /** StatItem children */
  children: React.ReactNode;
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Frame to start reveal animation (default: 0) */
  startFrame?: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  borderColor,
  children,
  frame,
  fps,
  startFrame = 0,
}) => {
  const reveal = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <div
      data-testid="stats-panel"
      style={{
        position: 'absolute',
        bottom: '15%',
        left: '50%',
        transform: `translateX(-50%) translateY(${(1 - reveal) * 20}px)`,
        width: '500px',
        padding: '30px',
        backgroundColor: '#00000088',
        border: `3px solid ${borderColor}`,
        borderRadius: '4px',
        opacity: reveal,
      }}
    >
      {children}
    </div>
  );
};

StatsPanel.displayName = 'StatsPanel';
