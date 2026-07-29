'use client';

import { m } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface StreakCounterProps {
  streak: number;
}

/** Streak intensity tiers for visual escalation */
function getStreakTier(streak: number) {
  if (streak >= 30) return { label: 'legendary', color: 'text-neo-pink', glow: 'shadow-[0_0_12px_rgba(255,20,147,0.4)]', bg: 'bg-neo-pink/10 border-neo-pink/40' };
  if (streak >= 14) return { label: 'blazing', color: 'text-neo-cyan', glow: 'shadow-[0_0_10px_rgba(0,255,255,0.3)]', bg: 'bg-neo-cyan/10 border-neo-cyan/40' };
  if (streak >= 7) return { label: 'hot', color: 'text-neo-lime', glow: 'shadow-[0_0_8px_rgba(191,255,0,0.3)]', bg: 'bg-neo-lime/10 border-neo-lime/40' };
  return { label: 'warm', color: 'text-neo-white', glow: '', bg: 'bg-neo-navy-light border-black' };
}

/**
 * Streak display with tiered visual intensity.
 * The fire grows hotter as the streak increases — warm → hot → blazing → legendary.
 * Each tier gets a different accent color and glow to reward long streaks.
 */
export function StreakCounter({ streak }: StreakCounterProps) {
  const { t } = useLanguage();

  if (streak <= 0) return null;

  const tier = getStreakTier(streak);

  return (
    <m.div
      className="flex flex-col items-center gap-1 py-2"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
      data-testid="streak-counter"
    >
      <div className={cn(
        'flex items-center gap-2 px-5 py-2 rounded-xl border-3 shadow-hard-sm',
        tier.bg, tier.glow
      )}>
        {/* Animated flame stack — more flames for higher streaks */}
        <div className="relative">
          <Flame
            className={cn('w-5 h-5 animate-flame-pulse', tier.color)}
            aria-hidden="true"
          />
          {streak >= 7 && (
            <Flame
              className={cn('absolute -top-1.5 start-0.5 w-4 h-4 opacity-40 animate-flame-pulse', tier.color)}
              style={{ animationDelay: '0.15s' }}
              aria-hidden="true"
            />
          )}
        </div>

        <span className={cn('font-neo-display font-black text-lg tabular-nums', tier.color)}>
          {streak}
        </span>
        <span className="font-black text-neo-white text-xs uppercase tracking-wide">
          {t('daily.streakDays', { count: streak })}
        </span>
      </div>

      <span className="text-[9px] font-bold text-neo-lime/60 uppercase tracking-widest">
        {t('daily.keepFireBurning')}
      </span>
    </m.div>
  );
}
