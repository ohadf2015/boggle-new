'use client';

/** Small pieces of the classroom leaderboard: the time-scope tabs, the rank delta and the tier badge. */

import { memo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLeaderboardTier } from '@/lib/supabase/education/leaderboard';
import { cn } from '@/lib/utils';
import type { LeaderboardTimeScope } from '@/lib/supabase/education/types';
// ============================================
// TIME SCOPE TABS
// ============================================

interface TimeScopeTabsProps {
  timeScope: LeaderboardTimeScope;
  onScopeChange: (scope: LeaderboardTimeScope) => void;
}

export const TimeScopeTabs = memo<TimeScopeTabsProps>(({ timeScope, onScopeChange }) => {
  const { t } = useLanguage();

  const tabs: Array<{ key: LeaderboardTimeScope; label: string }> = [
    { key: 'weekly', label: t('education.leaderboard.weekly') },
    { key: 'monthly', label: t('education.leaderboard.monthly') },
    { key: 'all-time', label: t('education.leaderboard.allTime') },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.key}
          onClick={() => onScopeChange(tab.key)}
          className={cn(
            'px-4 py-2 rounded-neo border-neo font-neo-body font-bold text-sm transition',
            timeScope === tab.key
              ? 'bg-neo-lime text-neo-black border-neo-black shadow-hard-sm'
              : 'bg-neo-navy-light text-neo-white border-neo-cream/40 hover:bg-neo-navy'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

TimeScopeTabs.displayName = 'TimeScopeTabs';

// ============================================
// RANK DELTA INDICATOR
// ============================================

interface RankDeltaProps {
  rankDelta: number | null;
  isNew: boolean;
}

export const RankDeltaIndicator = memo<RankDeltaProps>(({ rankDelta, isNew }) => {
  const { t } = useLanguage();

  if (isNew) {
    return (
      <AdaptiveMotion.span
        data-testid="rank-delta-new"
        className="px-2 py-0.5 text-xs font-neo-body font-bold bg-neo-cyan text-neo-black rounded"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      >
        {t('education.leaderboard.newEntry')}
      </AdaptiveMotion.span>
    );
  }

  if (rankDelta === null || rankDelta === 0) {
    return (
      <span data-testid="rank-delta-none" className="text-neo-white text-sm">
        −
      </span>
    );
  }

  if (rankDelta > 0) {
    // Moved up
    return (
      <AdaptiveMotion.span
        data-testid="rank-delta-up"
        className="flex items-center gap-1 text-neo-lime text-sm font-neo-body font-bold"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <ArrowUp className="w-4 h-4" />
        +{rankDelta}
      </AdaptiveMotion.span>
    );
  }

  // Moved down
  return (
    <AdaptiveMotion.span
      data-testid="rank-delta-down"
      className="flex items-center gap-1 text-neo-pink text-sm font-neo-body font-bold"
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
    >
      <ArrowDown className="w-4 h-4" />
      {rankDelta}
    </AdaptiveMotion.span>
  );
});

RankDeltaIndicator.displayName = 'RankDeltaIndicator';

// ============================================
// TIER BADGE
// ============================================

interface TierBadgeProps {
  rank: number;
  totalStudents: number;
}

export const TierBadge = memo<TierBadgeProps>(({ rank, totalStudents }) => {
  const { t } = useLanguage();
  const tier = getLeaderboardTier(rank, totalStudents);

  if (!tier) return null;

  const tierConfig = {
    top10: { bg: 'bg-neo-lime', text: 'text-neo-black', label: t('education.leaderboard.top10') },
    top25: { bg: 'bg-neo-cyan', text: 'text-neo-black', label: t('education.leaderboard.top25') },
    top50: { bg: 'bg-neo-pink', text: 'text-neo-black', label: t('education.leaderboard.top50') },
  };

  const config = tierConfig[tier];

  return (
    <span
      data-testid={`tier-badge-${tier}`}
      className={cn(
        'px-2 py-0.5 text-xs font-neo-body font-bold rounded',
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
});

TierBadge.displayName = 'TierBadge';
