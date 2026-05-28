'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSeason } from '@/hooks/useSeason';
import { haptics } from '@/utils/haptics';

export const LandingSeasonHero: React.FC = () => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { currentSeason, timeRemaining } = useSeason();

  if (isOnCrazyGamesPlatform) return null;

  const isEndingSoon = timeRemaining.days < 7;
  const accent = currentSeason.accentColor;

  const seasonLabel = t('season.name', { number: currentSeason.id, theme: currentSeason.theme });
  const ctaLabel = t('season.viewLeaderboard');
  const seasonNumeral = String(currentSeason.id).padStart(2, '0');

  return (
    <section
      data-testid="landing-season-hero"
      className="relative w-full max-w-4xl mx-auto"
    >
      <Link
        href="/leaderboard"
        aria-label={`${seasonLabel} — ${ctaLabel}`}
        onClick={() => haptics.tap()}
        className="group relative block isolate overflow-hidden rounded-neo border-neo border-black bg-neo-navy-light transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
        style={{
          borderColor: '#000',
          boxShadow: `4px 4px 0 #000, inset 0 0 0 1px ${accent}`,
        }}
      >
        {/* Image bleed — right side with diagonal seam + accent stripe */}
        <div
          className="absolute inset-y-0 end-0 w-32 sm:w-44 pointer-events-none"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0% 100%)' }}
        >
          <Image
            src={currentSeason.imageUrl}
            alt={currentSeason.theme}
            fill
            sizes="(min-width: 640px) 176px, 128px"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 start-0 w-1/2 bg-gradient-to-r rtl:bg-gradient-to-l from-neo-navy-light via-neo-navy-light/40 to-transparent"
          />
        </div>

        {/* Diagonal accent stripe along the image seam */}
        <div
          aria-hidden
          className="absolute inset-y-0 end-32 sm:end-44 w-[3px] origin-top translate-x-[7px] rtl:-translate-x-[7px] rotate-[18deg] sm:rotate-[14deg]"
          style={{ background: accent, boxShadow: `1px 0 0 #000` }}
        />

        {/* Halftone dot pattern in accent color */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-screen"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${accent} 1px, transparent 1.5px)`,
            backgroundSize: '7px 7px',
          }}
        />

        {/* Oversized outlined season numeral — editorial bg motif */}
        <span
          aria-hidden
          className="absolute -top-2 sm:-top-3 start-1 sm:start-2 font-neo-display leading-none select-none pointer-events-none text-[3.75rem] sm:text-[5.25rem]"
          style={{
            WebkitTextStroke: `1.5px ${accent}55`,
            color: 'transparent',
            letterSpacing: '-0.04em',
          }}
        >
          {seasonNumeral}
        </span>

        {/* Content */}
        <div className="relative flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 pe-32 sm:pe-44 ps-16 sm:ps-24">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="inline-block text-[10px] font-neo-display uppercase tracking-[0.22em] leading-none text-neo-white"
              >
                Season
              </span>
              <span
                aria-hidden
                className="inline-block w-1 h-1 rounded-full"
                style={{ background: accent }}
              />
              <span
                className={`inline-flex items-center rounded-sm px-1.5 py-[3px] text-[10px] font-neo-display uppercase tracking-wider leading-none border-2 border-black ${
                  isEndingSoon
                    ? 'bg-neo-pink text-black animate-pulse'
                    : 'bg-neo-navy text-neo-white'
                }`}
                style={{ boxShadow: '1.5px 1.5px 0 #000' }}
              >
                <span>
                  {isEndingSoon
                    ? t('season.endingSoon')
                    : t('season.endsIn', { days: timeRemaining.days })}
                </span>
              </span>
            </div>
            <h2 className="font-neo-display text-base sm:text-lg text-neo-white leading-tight break-words line-clamp-2">
              {seasonLabel}
            </h2>
          </div>
        </div>

        {/* Sliding arrow chip on hover */}
        <span
          aria-hidden
          className="absolute end-3 sm:end-4 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black bg-neo-cream text-black font-neo-display text-sm transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 group-hover:rotate-[8deg]"
          style={{ boxShadow: '2px 2px 0 #000' }}
        >
          <span className="rtl:rotate-180 -mt-px">→</span>
        </span>
      </Link>
    </section>
  );
};

export default LandingSeasonHero;
