'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
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
      className="relative w-full max-w-4xl mx-auto rounded-neo border-neo-thick border-black bg-neo-navy-light overflow-hidden shadow-hard-lg"
      style={{ borderColor: '#000' }}
    >
      <div className="relative aspect-[21/7] sm:aspect-[32/9] w-full">
        <Image
          src={currentSeason.imageUrl}
          alt={currentSeason.theme}
          fill
          sizes="(max-width: 768px) 100vw, 896px"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-neo-navy via-neo-navy/60 to-transparent"
          aria-hidden="true"
        />

        <div className="absolute top-2 end-2">
          <div
            className={`px-2 py-1 rounded-neo border-neo border-black shadow-hard-sm font-neo-display text-sm leading-none ${
              isEndingSoon ? 'bg-neo-pink text-black animate-neo-pop' : 'bg-neo-lime text-black'
            }`}
          >
            {timeRemaining.days}
            <span className="text-[10px] ms-1 uppercase tracking-wider opacity-80">d</span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Trophy
              className={`w-4 h-4 shrink-0 ${isEndingSoon ? 'text-neo-pink' : 'text-neo-yellow'}`}
              aria-hidden="true"
            />
            <span
              className={`text-[10px] sm:text-xs font-neo-display ${
                isEndingSoon ? 'text-neo-pink' : 'text-neo-cream/80'
              }`}
            >
              {isEndingSoon
                ? t('season.endingSoon')
                : t('season.endsIn', { days: timeRemaining.days })}
            </span>
          </div>

          <h2 className="font-neo-display text-base sm:text-2xl text-neo-cream leading-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
            {t('season.name', { number: currentSeason.id, theme: currentSeason.theme })}
          </h2>

          <Link
            href="/leaderboard"
            className="self-start px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-neo border-neo border-black bg-neo-lime text-black font-neo-display text-xs shadow-hard-sm hover:shadow-hard-pressed active:translate-y-[1px] transition-shadow"
          >
            {t('season.viewLeaderboard')}
          </Link>
        </div>
      </div>
    </motion.section>
  );
};

export default LandingSeasonHero;
