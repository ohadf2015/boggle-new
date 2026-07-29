'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import type { TopPlayer } from '@/hooks/useTopPlayers';

// SSR enabled: receives players from server initialData → above-the-fold sidebar paints with data, not skeleton.
const LandingLeaderboardPreview = dynamic(
  () => import('./LandingLeaderboardPreview').then(m => m.LandingLeaderboardPreview),
  {
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

// Layout is now fully CSS-driven (Tailwind responsive classes) so SSR markup
// matches client first paint regardless of viewport — no JS-driven layout flip.
// `isMobilePortrait` only feeds behavior props on the mascot (hover/click).
export function LandingHero({ players, playersLoading, isMobilePortrait }: LandingHeroProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-5 lg:px-6">
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 lg:gap-10">
        {/* Left: Mascot + Title (mobile = inline row, ≥sm = stacked) */}
        <div className="flex flex-col items-center text-center sm:flex-1 lg:items-start lg:text-start">
          <div className="flex flex-row items-center gap-3 sm:flex-col sm:gap-0">
            <HeroMascot isMobilePortrait={isMobilePortrait} />
            <h1 className="font-black uppercase tracking-tight text-neo-white text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl sm:mt-3 sm:mb-2 neo-title animate-[fadeInUp_0.4s_ease-out_0.15s_both]">
              <span className="sr-only">LexiClash — </span>
              {t('landing.welcomeTitle')}
            </h1>
          </div>
        </div>

        {/* Right: Leaderboard sidebar — CSS-gated to ≥md, no JS branching */}
        <div className="hidden md:block w-64 lg:w-80 xl:w-104 shrink-0 animate-[fadeInRight_0.5s_ease-out_0.3s_both]">
          <LandingLeaderboardPreview players={players} loading={playersLoading} />
        </div>
      </div>
    </div>
  );
}
