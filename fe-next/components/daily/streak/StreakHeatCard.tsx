'use client';

import * as React from 'react';
import { m } from 'framer-motion';
import { Share2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { getStreakHeat, streakHeatGradient } from '@/lib/streakHeat';
import { getStreakTier } from '@/lib/streakTierRewards';
import { shareStreak } from '@/utils/streakShare';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { cn } from '@/lib/utils';
import StreakWeekRow from './StreakWeekRow';

interface StreakHeatCardProps {
  streak: number;
  /** Server chest-cycle anchor; empty for guests. */
  cycleStart: string;
  completedDates: string[];
  /** Today, UTC `YYYY-MM-DD`. */
  today: string;
  isClaimable: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * The streak screen: the number, the tier mascot, the seven-day cycle, and a
 * way to brag about it.
 *
 * The background is the tier gradient rather than the app's navy — the whole
 * point is that a 100-day streak should not look like a 2-day one. Text colour
 * comes from the tier's `ink` token so contrast survives the gradient swap.
 */
export default function StreakHeatCard({
  streak,
  cycleStart,
  completedDates,
  today,
  isClaimable,
  onClose,
  className,
}: StreakHeatCardProps) {
  const { t, language } = useLanguage();
  const [sharing, setSharing] = React.useState(false);

  const heat = getStreakHeat(streak);
  const tierId = getStreakTier(streak)?.id ?? 'starting';

  const handleShare = React.useCallback(() => {
    // Guard against a double-tap firing two share sheets — on mobile the second
    // one can land after the first is dismissed and look like a stuck UI.
    if (sharing) return;
    setSharing(true);
    void shareStreak({ streak, tierId, t, lang: language })
      .finally(() => setSharing(false));
  }, [sharing, streak, tierId, t, language]);

  return (
    <div
      data-testid="streak-heat-card"
      className={cn(
        'relative flex flex-col items-center gap-5 w-full max-w-sm px-6 py-8',
        'rounded-neo border-neo-thick border-neo-black shadow-hard-lg overflow-hidden',
        className,
      )}
      style={{ background: streakHeatGradient(heat) }}
    >
      {/* Radiating heat behind the mascot. Sized off the tier ring so it warms
          up with the gradient instead of being a fixed orange wash. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 30%, ${heat.ring}33 0%, transparent 60%)` }}
      />

      <m.div
        className="relative z-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <Mascot variant={heat.mascot} size="xl" animated priority alt="" />
      </m.div>

      <div className="relative z-10 flex flex-col items-center">
        <span
          data-testid="streak-heat-count"
          className="font-neo-display font-black text-7xl leading-none tabular-nums"
          style={{ color: heat.ink, textShadow: '4px 4px 0px rgba(0,0,0,0.28)' }}
        >
          {safeToLocaleString(streak, language)}
        </span>
        <span
          className="font-neo-display font-black text-lg uppercase tracking-[0.18em] mt-1"
          style={{ color: heat.ink }}
        >
          {t('daily.dayStreak', 'day streak')}
        </span>
        <span
          className="font-neo-body text-xs uppercase tracking-[0.2em] mt-2 opacity-80"
          style={{ color: heat.ink }}
        >
          {t(heat.labelKey, '')}
        </span>
      </div>

      <StreakWeekRow
        className="relative z-10 mt-1"
        cycleStart={cycleStart}
        completedDates={completedDates}
        today={today}
        currentStreak={streak}
        heat={heat}
        isClaimable={isClaimable}
      />

      <div className="relative z-10 flex flex-col items-stretch gap-2 w-full mt-2">
        <button
          type="button"
          data-testid="streak-share-button"
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-neo border-neo-thick border-neo-black bg-neo-white text-neo-navy font-neo-display font-black text-sm uppercase tracking-wider shadow-hard active:shadow-hard-pressed active:translate-y-px disabled:opacity-70"
        >
          {sharing
            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            : <Share2 className="w-4 h-4" aria-hidden="true" />}
          {t('daily.streakShare.button', 'Show it off')}
        </button>

        <button
          type="button"
          data-testid="streak-continue-button"
          onClick={onClose}
          className="w-full px-5 py-2 font-neo-display font-black text-sm uppercase tracking-wider opacity-90"
          style={{ color: heat.ink }}
        >
          {t('daily.streakHeat.continue', 'Continue')}
        </button>
      </div>
    </div>
  );
}
