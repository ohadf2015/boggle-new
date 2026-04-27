'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useSeason } from '@/hooks/useSeason';
import { useLanguage } from '@/contexts/LanguageContext';
import { tierColor } from '@/lib/tierColors';

export const SeasonBanner: React.FC = () => {
  const { currentSeason, timeRemaining, peakTier } = useSeason();
  const { t } = useLanguage();

  const isEndingSoon = timeRemaining.days < 7;
  const isCritical = timeRemaining.days <= 1;
  const isUnranked = peakTier === 'Unranked';
  const color = tierColor(peakTier);

  return (
    <motion.div
      className={`
        mx-4 mt-3 px-4 py-3 rounded-neo border-neo
        bg-neo-navy-light shadow-hard-sm
        flex items-center justify-between gap-3
        ${isCritical
          ? 'border-neo-thick border-neo-pink animate-neo-pop'
          : isEndingSoon
            ? 'border-neo-thick border-neo-pink animate-neo-shake'
            : 'border-black'}
      `}
      data-testid="season-banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Trophy
          className={`w-6 h-6 shrink-0 ${isEndingSoon ? 'text-neo-pink' : 'text-neo-yellow'}`}
          aria-hidden="true"
        />
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
      </div>

      {!isUnranked && (
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`
              px-2 py-1 rounded-neo border-neo border-black bg-neo-navy
              text-xs font-neo-display ${color.text}
            `}
          >
            {peakTier}
          </span>
        </div>
      )}
    </motion.div>
  );
};
