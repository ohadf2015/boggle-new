'use client';

import React from 'react';
import { Pin, ChevronRight } from 'lucide-react';
import { calculateTier, isHallOfFameAchievement, TIER_COLORS } from '@/utils/achievementTiers';
import { getAchievementIcon } from '@/constants/achievementIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { pickPinnedAchievements } from './profileShowcaseModel';

/**
 * The 3 badges a player is proudest of (Hall of Fame first, then most
 * earned), shown as big trophy tiles on the Overview tab.
 */
export function PinnedHighlights({
  counts,
  onSeeAll,
}: {
  counts: Record<string, number> | null | undefined;
  onSeeAll?: () => void;
}): React.ReactElement {
  const { t } = useLanguage();
  const pinned = pickPinnedAchievements(counts, 3);

  return (
    <div className="relative bg-neo-navy-light border-3 border-neo-black rounded-neo-lg shadow-hard p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 font-neo-display font-black uppercase tracking-tight text-lg text-neo-white">
          <span className="w-8 h-8 flex items-center justify-center bg-neo-pink text-neo-white border-2 border-neo-black rounded-neo shadow-hard-sm">
            <Pin className="w-4 h-4" strokeWidth={2.75} aria-hidden />
          </span>
          {t('profile.showcase.pinned')}
        </h2>
        {onSeeAll && pinned.length > 0 && (
          <button type="button" onClick={onSeeAll} className="inline-flex items-center gap-0.5 text-xs font-black uppercase text-neo-cyan hover:underline">
            {t('profile.showcase.seeAll')}
            <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
          </button>
        )}
      </div>

      {pinned.length === 0 ? (
        <p className="text-sm font-bold text-neo-white/75 border-2 border-dashed border-neo-white/25 rounded-neo px-3 py-3 text-center">
          {t('profile.showcase.noBadges')}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {pinned.map(({ key, count }) => {
            const tier = calculateTier(count) ?? 'BRONZE';
            const colors = TIER_COLORS[tier];
            const hof = isHallOfFameAchievement(key);
            return (
              <div
                key={key}
                data-testid="pinned-badge"
                data-key={key}
                className={cn(
                  'relative min-w-0 flex flex-col items-center gap-1 px-1.5 pt-3 pb-2 rounded-neo border-2 border-neo-black text-center',
                  hof ? 'bg-neo-black' : 'bg-neo-navy',
                )}
                style={{ boxShadow: `3px 3px 0 ${colors.bg}` }}
              >
                <span className="text-3xl leading-none" aria-hidden>{getAchievementIcon(key)}</span>
                <span className="text-[11px] font-black leading-tight text-neo-white line-clamp-2 min-h-[2lh]">
                  {t(`achievements.${key}.name`) || key}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-neo border border-neo-black text-[9px] font-black uppercase tracking-wide"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {t(`achievementTiers.${tier.toLowerCase()}`)}
                  {count > 1 && <span className="tabular-nums">×{count}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PinnedHighlights;
