'use client';

import React from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface WinStreakBadgeProps {
  streak: number;
  t: TFunction;
  /** Optional key to trigger re-animate on change */
  animateKey?: string | number;
}

function getStreakEmoji(streak: number): string {
  if (streak >= 10) return '💎';
  if (streak >= 5) return '⚡';
  return '🔥';
}

export const WinStreakBadge: React.FC<WinStreakBadgeProps> = ({ streak, t, animateKey }) => {
  if (streak < 2) return null;

  const emoji = getStreakEmoji(streak);
  const label = t('multiplayer.winStreak', { count: streak });

  return (
    <AdaptiveMotion.span
      key={animateKey ?? streak}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-neo border-neo border-black bg-neo-navy-light px-2 py-0.5 text-sm font-bold text-neo-white shadow-hard-sm"
    >
      <span>{emoji}</span>
      <span>{streak}</span>
    </AdaptiveMotion.span>
  );
};
