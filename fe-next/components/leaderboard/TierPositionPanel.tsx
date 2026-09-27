'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { m } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  GLOBAL_LEADERBOARD_TIERS,
  type LeaderboardTierDef,
  type LeaderboardTierId,
} from '@/lib/ranked/leaderboardTiers';
import type { TierPosition } from '@/hooks/useTierPosition';
import { trackTierPositionViewed } from '@/utils/growthTracking';

interface Props {
  position: TierPosition;
  userId: string;
  className?: string;
}

function tierDef(id: LeaderboardTierId): LeaderboardTierDef {
  return GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === id) ?? GLOBAL_LEADERBOARD_TIERS[0];
}

function percentileFromRank(rank: number, population: number): number {
  if (population <= 0) return 100;
  return Math.max(1, Math.round((rank / population) * 100));
}

const TierPositionPanel: React.FC<Props> = memo(({ position, userId, className }) => {
  const { t } = useLanguage();
  const tier = useMemo(() => tierDef(position.tier_id), [position.tier_id]);
  const tierName = position.tier_id; // displayed tier name; locale strings substitute
  const percentile = percentileFromRank(position.rank_in_tier, position.tier_population);

  const isStone = position.tier_id === 'stone';
  const isGrandmaster = position.tier_id === 'grandmaster';
  const isFirstInTier = position.rank_in_tier === 1;

  const exposureFiredRef = useRef(false);
  useEffect(() => {
    if (exposureFiredRef.current) return;
    exposureFiredRef.current = true;
    trackTierPositionViewed({
      tier_id: position.tier_id,
      rank_in_tier: position.rank_in_tier,
      tier_population: position.tier_population,
      percentile,
      season_id: null,
    });
  }, [position.tier_id, position.rank_in_tier, position.tier_population, percentile]);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('rounded-neo border-neo-thick shadow-hard-lg bg-neo-navy-light p-4', className)}
      style={{ containerType: 'inline-size' }}
    >
      <div
        data-testid="tier-rank-primary"
        aria-label={`Rank ${position.rank_in_tier} of ${position.tier_population} in ${tierName} tier`}
        className={cn(
          'font-neo-display text-2xl sm:text-3xl font-bold leading-tight break-words',
          tier.textColor,
          isFirstInTier && 'animate-neo-wobble', // wired now; Task 7 adds tests
        )}
      >
        {t('leaderboard.tier.rankInTier', {
          rank: position.rank_in_tier,
          total: position.tier_population,
          tier: tierName,
        })}
      </div>

      {!isStone && !isGrandmaster && (
        <div
          data-testid="tier-percentile"
          className="inline-block mt-2 px-2.5 py-1 rounded-neo border-neo text-xs font-bold text-neo-black"
          style={{ backgroundColor: tier.color }}
        >
          {t('leaderboard.tier.percentile', { pct: percentile, tier: tierName })}
        </div>
      )}

      {isStone && (
        <div
          data-testid="tier-climb-cta"
          className="inline-block mt-2 px-2 py-0.5 rounded-neo border-neo text-xs font-bold bg-neo-lime text-neo-black"
        >
          {t('leaderboard.tier.climbToNext', { nextTier: t('ranked.tiers.bronze') })}
        </div>
      )}

      {isGrandmaster && (
        <div
          data-testid="tier-throne-label"
          className="inline-block mt-2 px-2 py-0.5 rounded-neo border-neo text-xs font-bold bg-neo-yellow text-neo-black"
        >
          👑 {t('leaderboard.tier.topTierDefend')}
        </div>
      )}

      {isFirstInTier && (
        <div
          data-testid="tier-nobody-above"
          className="mt-2 text-xs italic text-gray-400"
        >
          {t('leaderboard.tier.nobodyAbove', { tier: position.tier_id })}
        </div>
      )}

      <ul role="list" className="mt-4 space-y-1.5">
        {position.neighbors.map((n) => {
          const isCurrent = n.player_id === userId;
          return (
            <li
              key={n.player_id}
              role="listitem"
              data-testid={`peer-row-${n.player_id}`}
              data-current={isCurrent ? 'true' : 'false'}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-neo text-sm transition-colors',
                isCurrent
                  ? cn('ring-2 bg-neo-navy font-bold', tier.ringColor)
                  : 'bg-neo-navy/40 hover:bg-neo-navy',
              )}
            >
              <span className="w-7 shrink-0 text-center font-mono text-xs font-bold text-gray-400">
                {n.rank_in_tier}
              </span>
              {/* Generic placeholder — peers' real avatars are intentionally not shown. */}
              <span
                data-testid="peer-generic-avatar"
                aria-hidden="true"
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-neo bg-neo-navy-elevated',
                  isCurrent ? tier.textColor : 'text-gray-500',
                )}
              >
                <User className="h-4 w-4" />
              </span>
              <span className={cn('flex-1 truncate', isCurrent ? 'text-white' : 'text-gray-300')}>
                {n.display_name ?? n.player_id}
              </span>
              <span className="font-semibold tabular-nums text-white">
                {n.total_score.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </m.div>
  );
});

TierPositionPanel.displayName = 'TierPositionPanel';

export default TierPositionPanel;
