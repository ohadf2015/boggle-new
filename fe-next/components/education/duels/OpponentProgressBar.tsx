'use client';

/**
 * OpponentProgressBar - Animated split bar showing relative scores
 *
 * Features:
 * - Left side (neo-cyan) = player score
 * - Right side (neo-pink) = opponent score
 * - Animated transitions with Framer Motion
 * - Handles edge case: both scores 0 → 50/50 split
 * - Neo-brutalist styling
 */

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface OpponentProgressBarProps {
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
}

export function OpponentProgressBar({
  myScore,
  opponentScore,
  myName,
  opponentName,
}: OpponentProgressBarProps) {
  // Calculate percentages
  const total = myScore + opponentScore;
  const myPercentage = total === 0 ? 50 : (myScore / total) * 100;
  const opponentPercentage = total === 0 ? 50 : (opponentScore / total) * 100;

  return (
    <div
      className="h-8 border-neo rounded-neo shadow-hard overflow-hidden flex bg-neo-navy"
      data-testid="opponent-progress-bar"
    >
      {/* Player Side (Left) */}
      <m.div
        data-side="player"
        className={cn(
          // A right-edge border class in the `neo` family used to sit here. `neo`
          // is not a border COLOR (it is an @utility that sets all four borders at
          // once), so that class generated no CSS at all — verified against a real
          // Tailwind build. Removing it is a no-op visually and drops a
          // physical-direction token from the tree.
          'h-full bg-neo-cyan flex items-center justify-between px-3'
        )}
        initial={{ width: '50%' }}
        animate={{ width: `${myPercentage}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <span className="text-neo-black font-neo-body font-bold text-sm truncate">
          {myName}
        </span>
        <span className="text-neo-black font-neo-body font-bold text-sm ms-2">
          {myScore}
        </span>
      </m.div>

      {/* Opponent Side (Right) */}
      <m.div
        data-side="opponent"
        className="h-full bg-neo-pink flex items-center justify-between px-3"
        initial={{ width: '50%' }}
        animate={{ width: `${opponentPercentage}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <span className="text-neo-white font-neo-body font-bold text-sm ms-2">
          {opponentScore}
        </span>
        <span className="text-neo-white font-neo-body font-bold text-sm truncate">
          {opponentName}
        </span>
      </m.div>
    </div>
  );
}
