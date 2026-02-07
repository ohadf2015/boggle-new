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
      className="flex flex-col items-center gap-0.5 py-2"
      data-testid="streak-counter"
    >
      <div className="flex items-center gap-2 px-5 py-2 bg-neo-navy-light border-4 border-black rounded-full shadow-hard">
        <Flame
          className="w-5 h-5 text-neo-orange animate-flame-pulse"
          aria-hidden="true"
        />
        <span className="font-black text-white text-sm uppercase tracking-wide">
          {t('daily.streakDays', { count: streak })}
        </span>
      </div>
      <span className="text-[10px] font-bold text-neo-lime uppercase tracking-widest">
        {t('daily.keepFireBurning')}
      </span>
    </div>
  );
}
