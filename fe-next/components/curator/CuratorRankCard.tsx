'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import {
  curatorRankForPoints,
  progressToNextRank,
  CURATOR_COIN_MILESTONES,
  type CuratorRank,
} from '@/lib/curator/curatorScope';

interface CuratorRankCardProps {
  /** The curator's lifetime prestige points for the active language. */
  points: number;
  /** When set, a one-time rank-up celebration banner for this newly-reached rank. */
  celebrateRank?: CuratorRank | null;
}

/**
 * The "fun" surface of the curator role: shows the earned rank, a progress bar
 * toward the next rank, and the next coin milestone. Prestige only — capability
 * (trust_tier) lives elsewhere. All copy via t('curator.*').
 */
export function CuratorRankCard({ points, celebrateRank }: CuratorRankCardProps) {
  const { t, language } = useLanguage();
  const rank = curatorRankForPoints(points);
  const progress = progressToNextRank(points);
  const nextMilestone = CURATOR_COIN_MILESTONES.find((m) => m.points > points) ?? null;
  const widthPct = `${Math.round(progress.ratio * 100)}%`;

  return (
    <div className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-4 shadow-hard text-neo-white">
      {celebrateRank && (
        <div
          data-testid="curator-rankup"
          className="animate-neo-pop mb-3 rounded-neo border-neo border-black bg-neo-lime px-3 py-2 text-center text-sm font-neo-display text-neo-navy shadow-hard-sm"
        >
          {t('curator.rank.rankedUp', { rank: t(celebrateRank.titleKey) })}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-neo-cyan font-neo-body">
          {t('curator.rank.label')}
        </span>
        <span className="text-sm font-neo-body text-neo-cream">
          {t('curator.rank.points', { points })}
        </span>
      </div>

      <h3 className="mt-1 text-2xl font-neo-display text-neo-lime">{t(rank.titleKey)}</h3>

      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full border-neo border-black bg-neo-navy"
        role="progressbar"
        aria-valuenow={Math.round(progress.ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          data-testid="curator-rank-progress"
          className="h-full bg-neo-lime transition-[width] duration-500"
          style={{ width: widthPct }}
        />
      </div>

      <p className="mt-2 text-sm font-neo-body text-neo-cream">
        {progress.next
          ? t('curator.rank.toNext', {
              points: progress.pointsNeeded - progress.pointsInto,
              rank: t(progress.next.titleKey),
            })
          : t('curator.rank.maxed')}
      </p>

      {nextMilestone && (
        <p className="mt-1 text-xs font-neo-body text-neo-yellow">
          {t('curator.coins.nextMilestone', {
            points: nextMilestone.points,
            coins: safeToLocaleString(nextMilestone.coins, language),
          })}
        </p>
      )}
    </div>
  );
}
