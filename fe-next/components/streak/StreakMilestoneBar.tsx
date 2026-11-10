'use client';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CoinArt } from '@/components/ui/CoinArt';
import type { NextMilestone } from '@/lib/daily/streakRewards';

interface StreakMilestoneBarProps {
  current: number;
  next: NextMilestone;
  className?: string;
}

/** Always a visible goal: how far to the next milestone and what it pays. */
export function StreakMilestoneBar({ current, next, className }: StreakMilestoneBarProps) {
  const { t } = useLanguage();
  const span = Math.max(1, next.days - next.from);
  const pct = Math.round((Math.min(Math.max(current - next.from, 0), span) / span) * 100);

  return (
    <div data-testid="streak-next-reward" className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2 font-neo-display text-xs font-bold md:text-sm">
        <span className="text-neo-cream">
          {t('dailyStreak.flame.rewardAt', { days: next.days })}
          <span className="text-neo-cream/60"> · {t('dailyStreak.flame.toGo', { n: next.remaining })}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-neo-yellow tabular-nums">
          <CoinArt size={16} />+{next.coins}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={next.from}
        aria-valuemax={next.days}
        aria-valuenow={Math.min(current, next.days)}
        aria-label={t('dailyStreak.flame.rewardAt', { days: next.days })}
        className="h-3.5 overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy"
      >
        <div className="h-full rounded-full bg-neo-yellow transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default StreakMilestoneBar;
