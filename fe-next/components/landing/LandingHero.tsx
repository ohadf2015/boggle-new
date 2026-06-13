'use client';

import dynamic from 'next/dynamic';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { HeroStyleMascot } from './HeroStyleMascot';
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
  /** cubes-landing treatment: livelier mascot, subtitle, live pill, floating tiles */
  energetic?: boolean;
  /** live player count — drives the energetic "playing now" pill */
  activePlayers?: number;
}

// Cream/colour neo letter-chips that bob around the mascot on the energetic
// (cubes) hero — pure decoration, hidden from a11y, frozen under reduced-motion.
const FLOAT_TILES = [
  { ch: 'L', chip: 'bg-neo-lime',   pos: 'left-0 top-2',        rot: '-rotate-12', delay: '0s' },
  { ch: 'E', chip: 'bg-neo-pink',   pos: 'left-8 -top-3',       rot: 'rotate-6',   delay: '.5s' },
  { ch: 'X', chip: 'bg-neo-cyan',   pos: 'right-6 -top-2',      rot: 'rotate-12',  delay: '.9s' },
  { ch: 'I', chip: 'bg-neo-purple', pos: 'right-0 top-3',       rot: '-rotate-6',  delay: '1.4s' },
] as const;

function FloatingTiles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {FLOAT_TILES.map((tile) => (
        <span key={tile.ch} className={`absolute ${tile.pos} ${tile.rot}`}>
          <span
            className={`hero-tile-float flex h-7 w-7 items-center justify-center rounded-md border-2 border-black ${tile.chip} font-neo-display text-sm font-black ${tile.chip === 'bg-neo-purple' ? 'text-neo-white' : 'text-neo-navy'} shadow-hard-sm`}
            style={{ animationDelay: tile.delay }}
          >
            {tile.ch}
          </span>
        </span>
      ))}
    </div>
  );
}

// Layout is now fully CSS-driven (Tailwind responsive classes) so SSR markup
// matches client first paint regardless of viewport — no JS-driven layout flip.
// `isMobilePortrait` only feeds behavior props on the mascot (hover/click).
export function LandingHero({ players, playersLoading, isMobilePortrait, energetic, activePlayers = 0 }: LandingHeroProps) {
  const { t } = useLanguage();
  const showLivePill = energetic && activePlayers > 10;

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-5 lg:px-6">
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 lg:gap-10">
        {/* Left: Mascot + Title (mobile = inline row, ≥sm = stacked) */}
        <div className="flex flex-col items-center text-center sm:flex-1 lg:items-start lg:text-start">
          <div className="flex flex-row items-center gap-3 sm:flex-col sm:gap-0">
            <div className="relative">
              {energetic && <FloatingTiles />}
              <HeroStyleMascot isMobilePortrait={isMobilePortrait} energetic={energetic} />
            </div>
            <h1 className="font-black uppercase tracking-tight text-neo-white text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl sm:mt-3 sm:mb-2 neo-title animate-[fadeInUp_0.4s_ease-out_0.15s_both]">
              <span className="sr-only">LexiClash — </span>
              {t('landing.welcomeTitle')}
            </h1>
          </div>

          {energetic && (
            <p className="mt-1 max-w-md font-neo-body text-sm text-neo-white/80 sm:text-base animate-[fadeInUp_0.4s_ease-out_0.25s_both]">
              {t('landing.welcomeSubtitle')}
            </p>
          )}

          {showLivePill && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-navy shadow-hard-sm sm:text-sm animate-[fadeInUp_0.4s_ease-out_0.35s_both]">
              <Flame className="h-4 w-4 motion-safe:animate-neo-wobble" strokeWidth={2.5} aria-hidden="true" />
              {activePlayers.toLocaleString()} {t('landing.playingNow')}
            </span>
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
