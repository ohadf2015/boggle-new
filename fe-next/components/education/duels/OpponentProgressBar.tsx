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

  // A label over a sliver of the other colour is unreadable; hide it until its side has room.
  const MIN_LABEL_PCT = 18;
  return (
    <div
      className="relative h-8 border-[2px] border-neo-cream rounded-neo shadow-hard overflow-hidden bg-neo-pink"
      data-testid="opponent-progress-bar"
    >
      {/* Fill animates scaleX (compositor-only); animating width re-lays-out every frame. */}
      <m.div
        data-side="player"
        aria-hidden="true"
        className="absolute inset-0 origin-left rtl:origin-right bg-neo-cyan"
        initial={{ scaleX: 0.5 }}
        animate={{ scaleX: myPercentage / 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      <div data-side="opponent" className="relative flex h-full items-center justify-between gap-2 px-3 font-neo-body text-sm font-bold">
        <span className={cn('flex min-w-0 items-center gap-2 text-neo-black', myPercentage < MIN_LABEL_PCT && 'invisible')}>
          <span className="truncate">{myName}</span>
          <span>{myScore}</span>
        </span>
        <span className={cn('flex min-w-0 items-center gap-2 text-neo-white', opponentPercentage < MIN_LABEL_PCT && 'invisible')}>
          <span>{opponentScore}</span>
          <span className="truncate">{opponentName}</span>
        </span>
      </div>
    </div>
  );
}
