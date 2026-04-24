/**
 * RewardDisplay Primitive
 *
 * Animated reward items (gold, XP, etc.) display.
 * Extracted from BossDefeatCinematic's rewards section.
 */

import React from 'react';
import { spring } from 'remotion';
import { fredokaFamily, rubikFamily } from '../fonts';

export interface RewardItem {
  /** Display label (e.g., "GOLD", "XP") */
  label: string;
  /** Display value (e.g., 100) */
  value: number;
  /** Value color (hex) */
  color: string;
}

export interface RewardDisplayProps {
  /** Rewards to show */
  rewards: RewardItem[];
  /** Current frame (relative to sequence start) */
  frame: number;
  /** Frames per second */
  fps: number;
  /** Frame offset before animation starts (default: 0) */
  startFrame?: number;
}

export const RewardDisplay: React.FC<RewardDisplayProps> = ({
  rewards,
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
      data-testid="reward-display"
      style={{
        position: 'absolute',
        bottom: '15%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 60,
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 30}px)`,
      }}
    >
      {rewards.map((reward, i) => (
        <div key={`reward-${i}-${reward.label}`} style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: fredokaFamily,
              fontSize: 48,
              fontWeight: 700,
              color: reward.color,
              textShadow: '3px 3px 0 black',
            }}
          >
            +{reward.value}
          </div>
          <div
            style={{
              fontFamily: rubikFamily,
              fontSize: 20,
              color: 'white',
              textShadow: '2px 2px 0 black',
            }}
          >
            {reward.label}
          </div>
        </div>
      ))}
    </div>
  );
};

RewardDisplay.displayName = 'RewardDisplay';
