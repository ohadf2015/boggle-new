'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '@/hooks/useSeason';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRankTier } from '@/shared/utils/eloRating';

export const SeasonBanner: React.FC = () => {
  const { currentSeason, timeRemaining, peakTier } = useSeason();
  const { t } = useLanguage();

  const isEndingSoon = timeRemaining.days < 7;
  const tier = getRankTier(
    peakTier === 'Unranked' ? 0 : 800 // fallback for display
  );

  return (
    <motion.div
      className={`
        w-full px-4 py-3 rounded-neo border-neo border-black
        bg-neo-navy-light shadow-hard-sm
        flex items-center justify-between gap-3
        ${isEndingSoon ? 'ring-2 ring-neo-pink animate-pulse' : ''}
      `}
      data-testid="season-banner"
    >
      <div className="flex flex-col min-w-0">
        <span className="font-neo-display text-sm text-neo-cream truncate">
          {t('season.name', { number: currentSeason.id, theme: currentSeason.theme })}
        </span>
        <span className="text-xs text-neo-cream/70">
          {isEndingSoon
            ? t('season.endingSoon')
            : t('season.endsIn', { days: timeRemaining.days })}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-neo-body text-neo-cream/80">
          {t('season.peakTier', { tier: peakTier })}
        </span>
      </div>
    </motion.div>
  );
};
