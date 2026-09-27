'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TierBadge } from '@/components/ui/TierBadge';
import {
  GLOBAL_LEADERBOARD_TIERS,
  getGlobalLeaderboardTier,
  getLeaderboardTierProgress,
  getNextTierThreshold,
} from '@/lib/ranked/leaderboardTiers';
import { TierRoadmap } from './TierRoadmap';

interface RankProgressBannerProps {
  /** Player lifetime total_score — the axis that gates cosmetics. */
  totalScore: number;
}

/**
 * Surfaces the player's CURRENT rank + how far to the next one, right above the
 * cosmetics grid — answering "what's my rank?" and "how much to Gold?". The tier
 * is the score-based leaderboard tier (earned through any mode), the same axis
 * the unlock gate uses, so the badge here always matches what's unlocked below.
 * Expands into the full TierRoadmap ("see all ranks").
 */
export function RankProgressBanner({ totalScore }: RankProgressBannerProps) {
  const { t } = useLanguage();
  const [showRoadmap, setShowRoadmap] = useState(false);

  const score = Math.max(0, totalScore);
  const tier = getGlobalLeaderboardTier(score);
  const progress = getLeaderboardTierProgress(score, GLOBAL_LEADERBOARD_TIERS);
  const nextThreshold = getNextTierThreshold(score, GLOBAL_LEADERBOARD_TIERS);
  const isMax = nextThreshold == null;
  const nextTier = GLOBAL_LEADERBOARD_TIERS[GLOBAL_LEADERBOARD_TIERS.findIndex((x) => x.id === tier.id) + 1];
  const pointsToNext = nextThreshold != null ? Math.max(0, nextThreshold - score) : 0;
  const pct = Math.round(progress * 100);

  return (
    <div className="mb-5 rounded-neo border-neo bg-neo-navy-light p-4 shadow-hard">
      <div className="flex items-center gap-3">
        <TierBadge tier={tier} size="lg" animated />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-neo-white/60 font-neo-body">
            {t('cosmetics.rank.title')}
          </p>
          <p className="text-lg font-neo-display font-bold leading-tight" style={{ color: tier.color }}>
            {t(`rank.tier.${tier.id}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRoadmap((v) => !v)}
          className="shrink-0 rounded-neo border-neo bg-neo-navy px-3 py-1.5 text-xs font-bold text-neo-cyan shadow-hard-sm hover:shadow-hard-pressed font-neo-body"
        >
          {t(showRoadmap ? 'cosmetics.rank.hideAll' : 'cosmetics.rank.seeAll')}
        </button>
      </div>

      {/* Progress to next tier */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs font-neo-body">
          <span className="tabular-nums text-neo-white/70">{score.toLocaleString()}</span>
          {isMax ? (
            <span className="font-bold text-neo-purple">{t('cosmetics.rank.maxReached')}</span>
          ) : (
            <span className="font-bold text-neo-cyan tabular-nums">
              {t('cosmetics.rank.pointsToNext', {
                points: pointsToNext.toLocaleString(),
                tier: t(`rank.tier.${nextTier.id}`),
              })}
            </span>
          )}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border-neo bg-neo-navy">
          <div
            className={`h-full rounded-full bg-linear-to-r ${tier.gradient} transition-all duration-500`}
            style={{ width: `${isMax ? 100 : Math.max(4, pct)}%` }}
          />
        </div>
      </div>

      {showRoadmap && (
        <div className="mt-4 border-t-2 border-black/30 pt-4">
          <TierRoadmap totalScore={score} currentTierId={tier.id} />
        </div>
      )}
    </div>
  );
}

export default RankProgressBanner;
