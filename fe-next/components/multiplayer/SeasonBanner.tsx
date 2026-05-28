'use client';

import React from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { Crown, Trophy } from 'lucide-react';
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
  const accent = currentSeason.accentColor || '#BFFF00';
  const hasArt = Boolean(currentSeason.imageUrl);

  const taglineKey = `season.tagline.${currentSeason.id}`;
  const taglineRaw = t(taglineKey);
  const tagline = taglineRaw && taglineRaw !== taglineKey ? taglineRaw : null;

  return (
    <m.div
      className={`
        relative mx-4 mt-3 overflow-hidden
        rounded-neo border-neo-thick
        bg-neo-navy-light shadow-hard
        ${isCritical
          ? 'border-neo-pink animate-neo-pop'
          : isEndingSoon
            ? 'border-neo-pink motion-safe:animate-neo-shake'
            : ''}
      `}
      style={!isEndingSoon ? { borderColor: accent } : undefined}
      data-testid="season-banner"
    >
      {hasArt && (
        <>
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <Image
              src={currentSeason.imageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-right rtl:object-left opacity-30"
              unoptimized
              priority={false}
            />
          </div>
          <div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r rtl:bg-gradient-to-l from-neo-navy via-neo-navy/85 to-transparent"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 pointer-events-none texture-halftone opacity-40 mix-blend-overlay"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1 opacity-70"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative flex items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {hasArt ? (
            <div
              className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-neo border-neo-thick overflow-hidden shadow-hard-sm"
              style={{ borderColor: accent, backgroundColor: accent }}
              data-testid="season-banner-image"
            >
              <Image
                src={currentSeason.imageUrl}
                alt={currentSeason.theme}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
              <Crown
                className="absolute -top-2 -end-2 w-5 h-5 text-neo-yellow drop-shadow-[1px_1px_0_#000]"
                aria-hidden="true"
                strokeWidth={2.5}
                fill="currentColor"
              />
            </div>
          ) : (
            <Trophy
              className={`w-6 h-6 shrink-0 ${isEndingSoon ? 'text-neo-pink' : 'text-neo-yellow'}`}
              aria-hidden="true"
            />
          )}
          <div className="flex flex-col min-w-0 gap-0.5">
            <span
              className="font-neo-display text-sm sm:text-base text-neo-white truncate leading-tight"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
            >
              {t('season.name', { number: currentSeason.id, theme: currentSeason.theme })}
            </span>
            {tagline && (
              <span
                className="text-[11px] sm:text-xs italic font-neo-body truncate leading-snug"
                style={{ color: accent, textShadow: '1px 1px 0 rgba(0,0,0,0.7)' }}
              >
                {tagline}
              </span>
            )}
            <span
              className={`text-xs sm:hidden ${isEndingSoon ? 'text-neo-pink font-neo-display' : 'text-neo-white'}`}
            >
              {isEndingSoon
                ? t('season.endingSoon')
                : t('season.endsIn', { days: timeRemaining.days })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="hidden sm:flex flex-col items-stretch gap-1"
            aria-label={t('season.endsIn', { days: timeRemaining.days })}
            data-testid="season-banner-countdown"
          >
            <div className="flex items-center gap-1">
              <div
                className={`px-2.5 py-1 rounded-neo border-neo border-black shadow-hard-sm font-neo-display text-lg leading-none tabular-nums ${
                  isEndingSoon ? 'bg-neo-pink text-black motion-safe:animate-neo-pop' : 'bg-neo-lime text-black'
                }`}
              >
                {timeRemaining.days}
                <span className="text-[10px] ms-1 uppercase tracking-wider opacity-80">d</span>
              </div>
              <div className="px-2.5 py-1 rounded-neo border-neo border-black shadow-hard-sm font-neo-display text-lg leading-none tabular-nums bg-neo-cyan text-black">
                {timeRemaining.hours}
                <span className="text-[10px] ms-1 uppercase tracking-wider opacity-80">h</span>
              </div>
            </div>
            {isEndingSoon && (
              <span className="text-[10px] font-neo-display text-neo-pink uppercase tracking-wider text-center">
                {t('season.endingSoon')}
              </span>
            )}
          </div>

          {!isUnranked && (
            <span
              className={`
                px-2 py-1 rounded-neo border-neo border-black bg-neo-navy
                text-xs font-neo-display shadow-hard-sm ${color.text}
              `}
            >
              {peakTier}
            </span>
          )}
        </div>
      </div>
    </m.div>
  );
};
