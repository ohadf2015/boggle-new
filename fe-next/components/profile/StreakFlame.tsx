'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface StreakFlameProps {
  days: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Streak badge — neo-orange (semantic "streak fire") chip with a live flicker.
 * Hidden entirely when the streak is cold so it never reads as "0-day streak".
 */
export function StreakFlame({ days, className, size = 'md' }: StreakFlameProps): React.ReactNode {
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  if (!days || days <= 0) return null;

  const isMd = size === 'md';

  return (
    <span
      aria-label={`${days} ${t('profile.streakDays')}`}
      className={cn(
        'inline-flex items-center gap-1 font-neo-display font-black tabular-nums',
        'bg-neo-orange text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm',
        isMd ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        className,
      )}
    >
      <m.span
        aria-hidden
        animate={reduced ? undefined : { scale: [1, 1.18, 0.96, 1.08, 1], rotate: [0, -4, 3, -2, 0] }}
        transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="flex"
      >
        <Flame strokeWidth={2.75} className={isMd ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill="currentColor" />
      </m.span>
      {days}
    </span>
  );
}

export default StreakFlame;
