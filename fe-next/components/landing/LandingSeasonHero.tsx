'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSeason } from '@/hooks/useSeason';

export const LandingSeasonHero: React.FC = () => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { currentSeason, timeRemaining } = useSeason();
  const prefersReducedMotion = useReducedMotion();

  if (isOnCrazyGamesPlatform) return null;

  const isEndingSoon = timeRemaining.days < 7;
  const haloOuter = prefersReducedMotion
    ? undefined
    : { opacity: [0.55, 0.95, 0.55], scale: [1, 1.08, 1] };
  const haloInner = prefersReducedMotion
    ? undefined
    : { opacity: [0.4, 0.7, 0.4] };

  const seasonLabel = t('season.name', { number: currentSeason.id, theme: currentSeason.theme });
  const ctaLabel = t('season.viewLeaderboard');

  return (
    <motion.section
      data-testid="landing-season-hero"
      className="relative w-full max-w-4xl mx-auto"
    >
      <Link
        href="/leaderboard"
        aria-label={`${seasonLabel} — ${ctaLabel}`}
        className="group relative block rounded-neo border-neo border-black bg-neo-navy-light overflow-hidden shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
        style={{ borderColor: '#000' }}
      >
        <div className="relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
          <div className="relative shrink-0 h-24 w-24 sm:h-28 sm:w-28">
            <motion.div
              aria-hidden
              className="absolute inset-0 -m-3 rounded-full bg-neo-pink/55 blur-2xl"
              animate={haloOuter}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden
              className="absolute inset-0 -m-1.5 rounded-full bg-neo-pink/40 blur-md"
              animate={haloInner}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
            <Image
              src={currentSeason.imageUrl}
              alt={currentSeason.theme}
              fill
              sizes="(min-width: 640px) 112px, 96px"
              className="relative object-contain drop-shadow-[0_0_12px_rgba(255,20,147,0.55)] [mask-image:radial-gradient(circle_at_center,black_55%,transparent_85%)] [-webkit-mask-image:radial-gradient(circle_at_center,black_55%,transparent_85%)]"
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
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
        </div>
      </Link>
    </motion.section>
  );
};

export default LandingSeasonHero;
