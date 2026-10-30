'use client';

import { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Footprints, Spline, Hammer, Landmark, Castle, Crown, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';
import type { RankId, RankStanding } from '@/lib/connections/progress';

const RANK_ICON: Record<RankId, LucideIcon> = {
  plank: Footprints,
  rope: Spline,
  builder: Hammer,
  span: Landmark,
  arch: Castle,
  legend: Crown,
};

interface RankBadgeProps {
  standing: RankStanding;
  /** Rank just reached this session — shows the banner and fires confetti once. */
  rankUpId?: RankId | null;
  onRankUpShown?: () => void;
  /** In-game header: smaller icon, no "N to next" line. */
  compact?: boolean;
}

/**
 * Lifetime "Bridge Builder" rank: icon, name and a bar to the next rank. The
 * bar animates by transform, so each solved bridge visibly pushes it forward.
 */
export default function RankBadge({ standing, rankUpId = null, onRankUpShown, compact = false }: RankBadgeProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const Icon = RANK_ICON[standing.rank.id];
  const remaining = standing.next ? standing.next.min - standing.rank.min - standing.intoRank : 0;

  useEffect(() => {
    if (!rankUpId) return;
    if (!reducedMotion) fireLevelUpConfetti();
    const timer = setTimeout(() => onRankUpShown?.(), 2600);
    return () => clearTimeout(timer);
  }, [rankUpId, reducedMotion, onRankUpShown]);

  return (
    <div data-testid="rank-badge" className="relative flex items-center gap-2.5">
      <span className={`flex ${compact ? 'h-7 w-7' : 'h-9 w-9'} shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-purple text-neo-white shadow-hard-sm`}>
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-neo-display text-sm font-black text-neo-white" title={t(`connections.rank.${standing.rank.id}`)}>
            {t(`connections.rank.${standing.rank.id}`)}
          </span>
          <span className={compact ? 'sr-only' : 'shrink-0 font-neo-body text-[0.7rem] text-neo-white/70'}>
            {standing.next
              ? t('connections.rank.toNext', { count: remaining, rank: t(`connections.rank.${standing.next.id}`) })
              : t('connections.rank.top')}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(standing.ratio * 100)}
          className={`${compact ? 'mt-0.5 h-1.5' : 'mt-1 h-2'} overflow-hidden rounded-full border border-neo-cream/40 bg-neo-navy`}
        >
          <m.div
            initial={false}
            animate={{ scaleX: standing.ratio }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            className="h-full origin-left rtl:origin-right bg-neo-purple-light"
          />
        </div>
      </div>

      <AnimatePresence>
        {rankUpId && (
          <m.div
            key={rankUpId}
            data-testid="rank-up-banner"
            initial={{ scale: 0.6, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 16 }}
            role="status"
            className="absolute inset-x-0 -top-3 z-30 mx-auto w-fit rounded-neo border-neo-thick border-neo-black bg-neo-yellow px-3 py-1.5 font-neo-display text-sm font-black text-neo-navy shadow-hard"
          >
            {t('connections.rank.up')} · {t(`connections.rank.${rankUpId}`)}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
