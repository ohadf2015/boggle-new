'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { SpringProgress } from '@/components/motion/SpringProgress';
import { quickRank } from './quickRank';

export function QuickHeroRank({ totalPoints, animate }: { totalPoints: number; animate: boolean }) {
  const { t } = useLanguage();
  const rank = quickRank(totalPoints);
  if (rank.nextAt === null) return null;
  const toNext = t('quickPlay.solo.rankToNext', '{pts} to {rank}', {
    pts: String(rank.nextAt - totalPoints),
    rank: t(`quickPlay.solo.rank.${quickRank(rank.nextAt).key}`),
  });
  return (
    <div className="flex w-full max-w-xs flex-col gap-1" data-testid="quick-hero-rank">
      <div className="flex items-baseline justify-between gap-2 font-neo-display text-xs font-bold">
        <span className={rank.color}>{t(`quickPlay.solo.rank.${rank.key}`)}</span>
        <span className="text-neo-white/70" aria-hidden="true">{toNext}</span>
      </div>
      <SpringProgress value={totalPoints - rank.at} max={rank.nextAt - rank.at} label={toNext} tone="pink" animateOnMount={animate} />
    </div>
  );
}
