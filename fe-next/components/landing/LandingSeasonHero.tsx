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
  // Localized twist title with the in-config English as graceful fallback.
  // Guarded — resilient if a season object ever lacks a twist.
  const twist = currentSeason.twist;
  const twistTitleKey = twist ? `season.twist.${twist.key}.title` : '';
  const twistTitleLocalized = twist ? t(twistTitleKey) : '';
  const twistTitle = twist
    ? (twistTitleLocalized !== twistTitleKey ? twistTitleLocalized : twist.title)
    : '';

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
          className="absolute inset-y-0 end-0 w-24 sm:w-32 pointer-events-none"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0% 100%)' }}
        >
          <Image
            src={currentSeason.imageUrl}
            alt={currentSeason.theme}
            fill
            sizes="(min-width: 640px) 128px, 96px"
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
          className="absolute inset-y-0 end-24 sm:end-32 w-[3px] origin-top translate-x-[7px] rtl:-translate-x-[7px] rotate-[18deg] sm:rotate-[14deg]"
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
          className="absolute -top-1 sm:-top-2 start-1 sm:start-2 font-neo-display leading-none select-none pointer-events-none text-[2.5rem] sm:text-[3.5rem]"
          style={{
            WebkitTextStroke: `1.5px ${accent}55`,
            color: 'transparent',
            letterSpacing: '-0.04em',
          }}
        >
          {seasonNumeral}
        </span>

        {/* Content */}
        <div className="relative flex items-center gap-3 px-4 sm:px-5 py-2 sm:py-2.5 pe-24 sm:pe-32 ps-12 sm:ps-16">
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
            <h2 className="font-neo-display text-sm sm:text-base text-neo-white leading-tight break-words line-clamp-2">
              {seasonLabel}
            </h2>
            {/* Season twist — the month's flavor/atmosphere. */}
            {twist && (
              <p
                className="season-twist-label mt-0.5 text-[11px] sm:text-xs font-neo-display leading-tight truncate"
                style={{ color: accent }}
              >
                <span aria-hidden className="me-1">{twist.emoji}</span>
                {twistTitle}
              </p>
            )}
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
