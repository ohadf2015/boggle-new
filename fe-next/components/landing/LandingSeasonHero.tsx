'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSeason } from '@/hooks/useSeason';

export const LandingSeasonHero: React.FC = () => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { currentSeason, timeRemaining } = useSeason();

  if (isOnCrazyGamesPlatform) return null;

  const isEndingSoon = timeRemaining.days < 7;

  return (
    <motion.section
      data-testid="landing-season-hero"
      className="relative w-full max-w-4xl mx-auto rounded-neo border-neo border-black bg-neo-navy-light overflow-hidden shadow-hard"
      style={{ borderColor: '#000' }}
    >
      <div className="relative flex items-center gap-3 p-2 sm:p-2.5">
        <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-neo border-neo border-black overflow-hidden">
          <Image
            src={currentSeason.imageUrl}
            alt={currentSeason.theme}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span
            className={`text-[10px] sm:text-[11px] font-neo-display uppercase tracking-wider leading-none ${
              isEndingSoon ? 'text-neo-pink' : 'text-neo-cream/60'
            }`}
          >
            {isEndingSoon
              ? t('season.endingSoon')
              : t('season.endsIn', { days: timeRemaining.days })}
          </span>
          <h2 className="font-neo-display text-sm sm:text-base text-neo-cream leading-tight truncate">
            {t('season.name', { number: currentSeason.id, theme: currentSeason.theme })}
          </h2>
        </div>

        <Link
          href="/leaderboard"
          className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-neo border-neo border-black bg-transparent text-neo-cream/80 font-neo-display text-[11px] sm:text-xs hover:bg-neo-cream/5 hover:text-neo-cream transition-colors"
        >
          {t('season.viewLeaderboard')}
        </Link>
      </div>
    </motion.section>
  );
};

export default LandingSeasonHero;
