'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import type { TopPlayer } from '@/hooks/useTopPlayers';

const LandingLeaderboardPreview = dynamic(
  () => import('./LandingLeaderboardPreview').then(m => m.LandingLeaderboardPreview),
  {
    ssr: false,
    loading: () => <div className="w-full h-64 rounded-neo bg-neo-navy-light/50 animate-pulse" />,
  }
);

interface LandingHeroProps {
  players: TopPlayer[];
  playersLoading: boolean;
  isMobilePortrait: boolean;
}

const HeroMascot = memo(function HeroMascot({ isMobilePortrait }: { isMobilePortrait: boolean }) {
  return (
    <IdleMascotWithEntrance
      baseVariant="happy"
      enableIdleActivities={false}
      cycleBaseVariants={false}
      size="xl"
      sizeClassName={isMobilePortrait ? 'w-[100px] h-[100px]' : 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-48 lg:h-48'}
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

export function LandingHero({ players, playersLoading, isMobilePortrait }: LandingHeroProps) {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'w-full max-w-5xl mx-auto',
      isMobilePortrait ? 'px-2 py-0' : 'px-4 md:px-5 lg:px-6'
    )}>
      <div className={cn(
        'flex items-start gap-6 lg:gap-10',
        isMobilePortrait && 'flex-col items-center'
      )}>
        {/* Left: Mascot + Title + CTA */}
        <div className={cn(
          'flex flex-col items-center text-center',
          !isMobilePortrait && 'lg:items-start lg:text-start flex-1'
        )}>
          {/* Mobile: mascot + title inline for compact layout */}
          {isMobilePortrait ? (
            <div className="flex items-center gap-3 mb-0">
              <HeroMascot isMobilePortrait={isMobilePortrait} />
              <h1
                className="font-black uppercase tracking-tight text-neo-white text-2xl neo-title animate-[fadeInLeft_0.4s_ease-out_0.15s_both]"
              >
                <span className="sr-only">LexiClash — </span>
                {t('landing.welcomeTitle')}
              </h1>
            </div>
          ) : (
            <>
              <HeroMascot isMobilePortrait={isMobilePortrait} />
              <h1
                className="font-black uppercase tracking-tight text-neo-white text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl mt-3 mb-2 neo-title animate-[fadeInUp_0.4s_ease-out_0.15s_both]"
              >
                <span className="sr-only">LexiClash — </span>
                {t('landing.welcomeTitle')}
              </h1>
            </>
          )}

          {!isMobilePortrait && (
            <p
              className="font-medium text-neo-black/80 dark:text-neo-white/90 max-w-md text-base md:text-lg mb-5 animate-[fadeInUp_0.4s_ease-out_0.25s_both]"
            >
              {t('landing.welcomeSubtitle')}
            </p>
          )}

        </div>

        {/* Right: Leaderboard Preview (desktop only — mobile moves below game cards) */}
        {!isMobilePortrait && (
          <div
            className="hidden md:block w-64 lg:w-80 xl:w-104 shrink-0 animate-[fadeInRight_0.5s_ease-out_0.3s_both]"
          >
            <LandingLeaderboardPreview players={players} loading={playersLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
