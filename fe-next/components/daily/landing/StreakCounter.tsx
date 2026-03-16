'use client';

import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StreakCounterProps {
  streak: number;
}

/**
 * Streak display pill between quest cards.
 * Shows flame icon with day count and motivational subtext.
 * Hidden when streak is 0.
 */
export function StreakCounter({ streak }: StreakCounterProps) {
  const { t } = useLanguage();

  if (streak <= 0) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-1.5"
      data-testid="streak-counter"
    >
      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-neo-navy-light border-3 border-black rounded-full shadow-hard-sm">
        <Flame
          className="w-4 h-4 text-neo-orange animate-flame-pulse"
          aria-hidden="true"
        />
        <span className="font-black text-white text-xs uppercase tracking-wide">
          {t('daily.streakDays', { count: streak })}
        </span>
      </div>
      <span className="text-[9px] font-bold text-neo-lime uppercase tracking-widest">
        {t('daily.keepFireBurning')}
      </span>
    </div>
  );
}
