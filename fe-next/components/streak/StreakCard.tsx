'use client';

import { Check, Gift, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAX_HELD_FREEZES, streakTier, type StreakTier } from '@/lib/daily/streakRewards';
import type { StreakView } from '@/hooks/useStreakView';
import { StreakFlame } from './StreakFlame';
import { StreakWeekStrip } from './StreakWeekStrip';
import { StreakMilestoneBar } from './StreakMilestoneBar';
import { StreakAtRiskPill } from './StreakAtRiskPill';

export type StreakCardView = Pick<StreakView, 'current' | 'playedToday' | 'atRisk' | 'freezes' | 'isGuest' | 'week' | 'milestone'>;

const TIER_TEXT: Record<StreakTier, string> = {
  none: 'text-neo-cream',
  ember: 'text-neo-orange',
  flame: 'text-neo-orange',
  blue: 'text-neo-cyan',
  violet: 'text-neo-purple-light',
  legendary: 'text-neo-yellow',
};

const TIER_BORDER: Record<StreakTier, string> = {
  none: 'border-neo-cream/40',
  ember: 'border-neo-orange',
  flame: 'border-neo-orange',
  blue: 'border-neo-cyan',
  violet: 'border-neo-purple',
  legendary: 'border-neo-yellow',
};

interface StreakCardProps {
  view: StreakCardView;
  onOpenFreezes?: () => void;
  onClaim?: () => void;
  className?: string;
}

/** The daily streak at full size: flame and count, today's status, this week, and the next reward. */
export function StreakCard({ view, onOpenFreezes, onClaim, className }: StreakCardProps) {
  const { t } = useLanguage();
  const tier = streakTier(view.current);
  const claimable = view.milestone?.claimable ?? null;
  const next = view.milestone?.next ?? null;

  return (
    <section
      data-testid="streak-card"
      data-tier={tier}
      aria-label={t('dailyStreak.badge', { count: view.current })}
      className={cn('flex flex-col gap-3 rounded-neo-lg border-[3px] bg-neo-navy-light p-3.5 shadow-hard md:gap-4 md:p-5', TIER_BORDER[tier], className)}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <StreakFlame days={view.current} size={84} mood={view.atRisk ? 'worried' : 'happy'} className="md:!h-[104px] md:!w-[83px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('font-neo-display text-5xl font-black leading-none tabular-nums md:text-6xl', TIER_TEXT[tier])}>
              {view.current}
            </span>
            <span className="font-neo-display text-base font-bold leading-tight text-neo-cream md:text-lg">
              {t('dailyStreak.flame.dayStreak')}
            </span>
          </div>
          <span className={cn('mt-1 inline-block font-neo-display text-xs font-black uppercase tracking-wide md:text-sm', TIER_TEXT[tier])}>
            {t(`dailyStreak.flame.tier.${tier}`)}
          </span>
        </div>
        <button
          type="button"
          data-testid="streak-freezes"
          onClick={onOpenFreezes}
          aria-label={t('dailyStreak.flame.freezesLabel', { n: view.freezes, max: MAX_HELD_FREEZES })}
          className="flex shrink-0 flex-col items-center gap-0.5 rounded-neo border-2 border-neo-cyan bg-neo-navy px-2.5 py-1.5 text-neo-cyan shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-none"
        >
          <Snowflake className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-neo-display text-sm font-black tabular-nums">
            {view.freezes}/{MAX_HELD_FREEZES}
          </span>
        </button>
      </div>

      {view.atRisk ? (
        <StreakAtRiskPill days={view.current} className="self-start" />
      ) : view.playedToday ? (
        <span data-testid="streak-safe" className="inline-flex items-center gap-1.5 self-start font-neo-display text-sm font-bold text-neo-lime">
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          {t('dailyStreak.flame.safe')}
        </span>
      ) : (
        <span data-testid="streak-start" className="font-neo-display text-sm font-bold text-neo-cream/80">
          {t('dailyStreak.flame.start')}
        </span>
      )}

      <StreakWeekStrip week={view.week} />

      {claimable ? (
        <button
          type="button"
          data-testid="streak-claim"
          onClick={onClaim}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow font-neo-display text-base font-black uppercase text-neo-black shadow-hard transition-transform active:translate-y-0.5 active:shadow-none"
        >
          <Gift className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          {t('dailyStreak.flame.claimReady', { days: claimable.days, coins: claimable.coins })}
        </button>
      ) : next ? (
        <StreakMilestoneBar current={view.current} next={next} />
      ) : view.milestone ? (
        <span className="font-neo-display text-sm font-bold text-neo-yellow">{t('dailyStreak.flame.maxed')}</span>
      ) : null}
    </section>
  );
}

export default StreakCard;
