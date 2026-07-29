'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SeasonBadgeCard } from './SeasonBadgeCard';
import type { SeasonRankBadge } from '@/lib/seasonBadges';

export interface SeasonTrophyCaseProps {
  badges: SeasonRankBadge[];
  isLoading?: boolean;
  delay?: number;
  emptyVariant?: 'compact' | 'full';
}

export const SeasonTrophyCase: React.FC<SeasonTrophyCaseProps> = ({
  badges,
  isLoading = false,
  delay = 0.3,
  emptyVariant = 'full',
}) => {
  const { t } = useLanguage();
  const count = badges.length;

  return (
    <m.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-neo-xl p-6 mb-4 bg-neo-navy-light border border-white/[0.08]"
      aria-labelledby="season-trophy-case-title"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="season-trophy-case-title"
          className="text-xl font-black font-neo-display uppercase flex items-center gap-2 text-white"
        >
          <Trophy className="text-neo-yellow" />
          {t('seasonBadges.section.title')}
        </h2>
        {count > 0 && (
          <span className="text-xs font-black uppercase px-3 py-1.5 rounded-full bg-neo-yellow/15 text-neo-yellow">
            {t('seasonBadges.section.count', { count })}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`badge-skel-${i}`}
              className="aspect-square rounded-neo bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : count === 0 ? (
        emptyVariant === 'compact' ? (
          <p className="text-sm text-neo-white italic">{t('seasonBadges.section.empty')}</p>
        ) : (
          <div className="text-center py-8">
            <Trophy className="mx-auto w-10 h-10 text-neo-white mb-3" />
            <p className="text-sm text-neo-white">{t('seasonBadges.section.empty')}</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <SeasonBadgeCard
              key={`s${badge.seasonId}-r${badge.rank}`}
              badge={badge}
              size="md"
            />
          ))}
        </div>
      )}
    </m.section>
  );
};

export default SeasonTrophyCase;
