'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useSeason } from '@/hooks/useSeason';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAuth } from '@/contexts/AuthContext';
import { tierColor } from '@/lib/tierColors';

export const SeasonBanner: React.FC = () => {
  const { currentSeason, timeRemaining, peakTier } = useSeason();
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { isAuthenticated } = useAuth();
  if (isOnCrazyGamesPlatform) return null;
  if (!isAuthenticated) return null;

  const isEndingSoon = timeRemaining.days < 7;
  const isCritical = timeRemaining.days <= 1;
  const isUnranked = peakTier === 'Unranked';
  const color = tierColor(peakTier);
  const hasArt = Boolean(currentSeason.imageUrl);

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
        {hasArt ? (
          <div
            className="relative w-12 h-12 shrink-0 rounded-neo border-neo border-black overflow-hidden shadow-hard-sm"
            style={{ backgroundColor: currentSeason.accentColor }}
            data-testid="season-banner-image"
          >
            <Image
              src={currentSeason.imageUrl}
              alt={currentSeason.theme}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <Trophy
            className={`w-6 h-6 shrink-0 ${isEndingSoon ? 'text-neo-pink' : 'text-neo-yellow'}`}
            aria-hidden="true"
          />
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-neo-display text-sm text-neo-cream truncate">
            {t('season.name', { number: currentSeason.id, theme: currentSeason.theme })}
          </span>
          <span className={`text-xs ${isEndingSoon ? 'text-neo-pink font-neo-display' : 'text-neo-cream/70'}`}>
            {isEndingSoon
              ? t('season.endingSoon')
              : t('season.endsIn', { days: timeRemaining.days })}
          </span>
        </div>
      </div>

      <div
        className="hidden sm:flex items-center gap-1 shrink-0"
        aria-label={t('season.endsIn', { days: timeRemaining.days })}
        data-testid="season-banner-countdown"
      >
        <div className={`px-2 py-1 rounded-neo border-neo border-black shadow-hard-sm font-neo-display text-base leading-none ${isEndingSoon ? 'bg-neo-pink text-black animate-neo-pop' : 'bg-neo-lime text-black'}`}>
          {timeRemaining.days}
          <span className="text-[10px] ms-1 uppercase tracking-wider opacity-80">d</span>
        </div>
        <div className="px-2 py-1 rounded-neo border-neo border-black shadow-hard-sm font-neo-display text-base leading-none bg-neo-cyan text-black">
          {timeRemaining.hours}
          <span className="text-[10px] ms-1 uppercase tracking-wider opacity-80">h</span>
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
