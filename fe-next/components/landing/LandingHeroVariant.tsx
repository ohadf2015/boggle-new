'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import type { TopPlayer } from '@/hooks/useTopPlayers';

const LandingLeaderboardPreview = dynamic(
  () => import('./LandingLeaderboardPreview').then(m => m.LandingLeaderboardPreview),
  {
    loading: () => <div className="w-full h-64 rounded-neo bg-neo-navy-light/50 animate-pulse" />,
  }
);

interface LandingHeroVariantProps {
  players: TopPlayer[];
  playersLoading: boolean;
  isMobilePortrait: boolean;
  activePlayers: number;
}

const HeroMascot = memo(function HeroMascot({ isMobilePortrait }: { isMobilePortrait: boolean }) {
  return (
    <IdleMascotWithEntrance
      baseVariant="happy"
      enableIdleActivities={false}
      cycleBaseVariants={false}
      size="xl"
      sizeClassName="w-[100px] h-[100px] sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-48 lg:h-48"
      enableHover={!isMobilePortrait}
      enableClick
      hoverVariant="excited"
      clickVariant="celebrating"
      clickAnimation="bounce"
      priority
      delay={0.1}
    />
  );
});

/**
 * Landing hero variant — adds subtitle, primary CTA, and live player count
 * to the above-fold hero. Control = original LandingHero (title + mascot only).
 */
export function LandingHeroVariant({
  players,
  playersLoading,
  isMobilePortrait,
  activePlayers,
}: LandingHeroVariantProps) {
  const { t, language } = useLanguage();

  const handleCtaClick = useCallback(() => {
    trackLandingCtaClick('hero_cta', { variant: 'variant' });
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-5 lg:px-6">
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 lg:gap-10">
        {/* Left: Mascot + Title + Subtitle + CTA */}
        <div className="flex flex-col items-center text-center sm:flex-1 lg:items-start lg:text-start">
          <div className="flex flex-row items-center gap-3 sm:flex-col sm:gap-0">
            <HeroMascot isMobilePortrait={isMobilePortrait} />
            <h1 className="font-black uppercase tracking-tight text-neo-white text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl sm:mt-3 sm:mb-2 neo-title animate-[fadeInUp_0.4s_ease-out_0.15s_both]">
              <span className="sr-only">LexiClash — </span>
              {t('landing.welcomeTitle')}
            </h1>
          </div>

          {/* Subtitle — value prop */}
          <p className="text-neo-white font-neo-body text-sm sm:text-base md:text-lg mt-2 sm:mt-3 animate-[fadeInUp_0.4s_ease-out_0.25s_both]">
            {t('landing.welcomeSubtitle')}
          </p>

          {/* Primary CTA */}
          <Link
            href={`/${language}/daily`}
            onClick={handleCtaClick}
            className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 bg-neo-lime text-neo-black font-black text-base sm:text-lg uppercase tracking-wide rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 animate-[fadeInUp_0.4s_ease-out_0.35s_both]"
          >
            {t('landing.playNowFree')}
          </Link>

          {/* Compact live player count */}
          {activePlayers > 10 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-neo-white text-xs sm:text-sm animate-[fadeInUp_0.4s_ease-out_0.45s_both]">
              <Flame className="w-3.5 h-3.5 text-neo-orange" aria-hidden="true" />
              <span className="tabular-nums font-bold text-neo-white">{activePlayers}</span>
              <span>{t('landing.playingNow')}</span>
            </div>
          )}
        </div>

        {/* Right: Leaderboard sidebar — CSS-gated to ≥md, no JS branching */}
        <div className="hidden md:block w-64 lg:w-80 xl:w-104 shrink-0 animate-[fadeInRight_0.5s_ease-out_0.3s_both]">
          <LandingLeaderboardPreview players={players} loading={playersLoading} />
        </div>
      </div>
    </div>
  );
}
