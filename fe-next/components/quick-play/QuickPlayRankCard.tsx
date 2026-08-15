'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { quickRank } from './quickRank';
import { safeToLocaleString } from '@/utils/bcp47Locale';

interface QuickPlayRankCardProps {
  totalPoints: number;
  percentileToday: number;
  scorePct: number;
}

/**
 * Rank progress card — splits out the percentile + rank tier visualization
 * from the main results flow to keep the component under 500 lines.
 */
export function QuickPlayRankCard({ totalPoints, percentileToday, scorePct }: QuickPlayRankCardProps) {
  const { t, language } = useLanguage();
  const rankNow = quickRank(totalPoints);

  return (
    <div className="rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 shadow-hard" data-testid="quick-rank-bar">
      {/* Percentile bar — betterThan label lives in hero card to avoid duplication */}
      <div className="mb-3 h-2.5 overflow-hidden rounded-full border-2 border-black bg-neo-abyss">
        <i
          className="block h-full border-r-2 border-black bg-neo-cyan"
          style={{ width: `${percentileToday}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={`font-neo-display font-bold tracking-wide ${rankNow.color}`}>
          {t(`quickPlay.solo.rank.${rankNow.key}`)}
        </span>
        <span className="text-neo-white/60">
          {rankNow.nextAt !== null
            ? t('quickPlay.solo.rankProgress', {
                points: safeToLocaleString(totalPoints, language),
                next: safeToLocaleString(rankNow.nextAt, language),
                rank: t(`quickPlay.solo.rank.${quickRank(rankNow.nextAt).key}`),
              })
            : t('quickPlay.solo.rankMax')}
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-black bg-neo-abyss">
        <i
          className="block h-full border-r-2 border-black bg-neo-cozy transition-[width] duration-700"
          style={{ width: `${Math.round(rankNow.progress * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-neo-white/55">
        {t('quickPlay.solo.rankGained', { pts: String(scorePct) })}
      </p>
    </div>
  );
}
