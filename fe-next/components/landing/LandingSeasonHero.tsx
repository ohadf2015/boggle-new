'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSeason } from '@/hooks/useSeason';

export const LandingSeasonHero: React.FC = () => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { currentSeason, timeRemaining } = useSeason();

  if (isOnCrazyGamesPlatform) return null;

  const isEndingSoon = timeRemaining.days < 7;

  const seasonLabel = t('season.name', { number: currentSeason.id, theme: currentSeason.theme });
  const ctaLabel = t('season.viewLeaderboard');

  return (
    <section
      data-testid="landing-season-hero"
      className="relative w-full max-w-4xl mx-auto"
    >
      <Link
        href="/leaderboard"
        aria-label={`${seasonLabel} — ${ctaLabel}`}
        className="group relative block rounded-neo border-neo border-black bg-neo-navy-light overflow-hidden transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan min-h-32 sm:min-h-36"
        style={{
          borderColor: '#000',
          boxShadow: `4px 4px 0 #000, 0 0 24px ${currentSeason.accentColor}66, 0 0 56px ${currentSeason.accentColor}33`,
        }}
      >
        <div className="absolute inset-y-0 end-0 w-32 sm:w-44 pointer-events-none">
          <Image
            src={currentSeason.imageUrl}
            alt={currentSeason.theme}
            fill
            sizes="(min-width: 640px) 176px, 128px"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 start-0 w-16 bg-gradient-to-r rtl:bg-gradient-to-l from-neo-navy-light to-transparent"
          />
        </div>

        <div className="relative flex flex-col items-center justify-center text-center gap-1 px-6 py-6 pe-32 sm:pe-44 sm:ps-44">
          <span
            className={`text-[11px] sm:text-xs font-neo-display uppercase tracking-wider leading-none ${
              isEndingSoon ? 'text-neo-pink' : 'text-neo-cream/60'
            }`}
          >
            {isEndingSoon
              ? t('season.endingSoon')
              : t('season.endsIn', { days: timeRemaining.days })}
          </span>
          <h2 className="font-neo-display text-base sm:text-xl text-neo-cream leading-tight break-words line-clamp-2">
            {seasonLabel}
          </h2>
        </div>
      </Link>
    </section>
  );
};

export default LandingSeasonHero;
