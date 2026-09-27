'use client';

import React from 'react';

interface StreakFreezeIndicatorProps {
  freezeCount: number;
  t: (key: string) => string;
  className?: string;
}

const MAX_SLOTS = 3;

/**
 * StreakFreezeIndicator - Shows ice crystal icons for available streak freezes (0-3)
 * Filled = available, outline = empty slot
 */
export function StreakFreezeIndicator({ freezeCount, t, className = '' }: StreakFreezeIndicatorProps) {
  const tooltip = t('daily.streakFreezeTooltip');

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      title={tooltip}
      role="img"
      aria-label={t('daily.streakFreezesAvailable').replace('{count}', String(freezeCount))}
    >
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const isFilled = i < freezeCount;
        return (
          <span
            key={`slot-${i}`}
            data-testid={isFilled ? 'freeze-slot-filled' : 'freeze-slot-empty'}
            className={`text-lg transition-opacity ${isFilled ? 'opacity-100' : 'opacity-30'}`}
          >
            {isFilled ? '\u2744\uFE0F' : '\u2744'}
          </span>
        );
      })}
    </div>
  );
}
